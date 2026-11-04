"""Evaluate labeled webcam images using the deployed feature/model contract.

Run from backend: python scripts/evaluate_letters.py manifest.csv --output report.json
CSV columns: image,label,signer_id. Paths are relative to the CSV directory.
Use UNKNOWN for negative gestures. J/Z are reported but are not validated as motion.
"""
import argparse
import csv
import hashlib
import json
from collections import Counter
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from smartclusive.recognition import ASLRecognizer, SignVerifier


def summarize(rows):
    known = [r for r in rows if r['label'] != 'UNKNOWN']
    negatives = [r for r in rows if r['label'] == 'UNKNOWN']
    accepted = [r for r in known if r['accepted']]
    confusion = Counter((r['label'], r['prediction'] or 'NO_HAND') for r in rows)
    per_class = {}
    for label in sorted({r['label'] for r in known}):
        subset = [r for r in known if r['label'] == label]
        per_class[label] = {
            'count': len(subset),
            'top1_accuracy': sum(r['prediction'] == label for r in subset) / len(subset),
            'accepted_correct_rate': sum(r['accepted'] and r['prediction'] == label for r in subset) / len(subset),
        }
    return {
        'samples': len(rows), 'known_samples': len(known),
        'negative_samples': len(negatives),
        'hand_detection_rate': sum(r['prediction'] is not None for r in rows) / len(rows),
        'top1_accuracy': sum(r['prediction'] == r['label'] for r in known) / len(known) if known else None,
        'accepted_coverage': len(accepted) / len(known) if known else None,
        'accepted_accuracy': sum(r['prediction'] == r['label'] for r in accepted) / len(accepted) if accepted else None,
        'negative_false_accept_rate': sum(r['accepted'] for r in negatives) / len(negatives) if negatives else None,
        'per_class': per_class,
        'confusion': [{'actual': a, 'predicted': p, 'count': n}
                      for (a, p), n in sorted(confusion.items())],
        'limitations': 'Single-frame evaluation, not temporal/event accuracy. J/Z require motion evaluation. Use unseen signers and report coverage with accuracy.',
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('manifest', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--training-signers', type=Path, help='JSON list of training signer IDs; reject overlap')
    args = parser.parse_args()
    with args.manifest.open(newline='') as f:
        samples = list(csv.DictReader(f))
    if not samples or not {'image', 'label', 'signer_id'} <= samples[0].keys():
        parser.error('manifest must contain image,label,signer_id and at least one row')
    allowed = list('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
    if any(r['label'] not in allowed + ['UNKNOWN'] or not r['signer_id'].strip() for r in samples):
        parser.error('labels must be uppercase A-Z or UNKNOWN; every row needs a signer_id')
    signers = {r['signer_id'] for r in samples}
    if args.training_signers and signers.intersection(json.loads(args.training_signers.read_text())):
        parser.error('evaluation signers overlap training signers')
    paths = [(args.manifest.parent / r['image']).resolve() for r in samples]
    hashes = [hashlib.sha256(p.read_bytes()).hexdigest() for p in paths]
    if len(hashes) != len(set(hashes)):
        parser.error('duplicate image content in evaluation manifest')
    recognizer = ASLRecognizer()
    if recognizer.mode != 'model':
        parser.error('a real compatible trained model is required')
    results = []
    for sample, path in zip(samples, paths):
        feature = recognizer.extract_landmarks(path.read_bytes())
        ranked = recognizer.predict(feature, restrict_to=allowed) if feature is not None else []
        score = ranked[0][1] if ranked else 0
        margin = score - (ranked[1][1] if len(ranked) > 1 else 0)
        results.append({
            'label': sample['label'], 'prediction': str(ranked[0][0]) if ranked else None,
            'accepted': bool(ranked and score >= SignVerifier.CONFIDENCE_THRESHOLD
                             and margin >= SignVerifier.MARGIN_THRESHOLD),
        })
    report = summarize(results)
    report.update({
        'signers': len(signers),
        'training_signer_overlap_checked': args.training_signers is not None,
        'confidence_threshold': SignVerifier.CONFIDENCE_THRESHOLD,
        'margin_threshold': SignVerifier.MARGIN_THRESHOLD,
        'manifest_sha256': hashlib.sha256(args.manifest.read_bytes()).hexdigest(),
    })
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(f'Evaluated {len(results)} images; report: {args.output}')


if __name__ == '__main__':
    main()
