# Recognition first-stage changes

This change improves the existing letter/fingerspelling pipeline. It does not replace the trained weights, implement lexical word signs, or claim an accuracy improvement on unseen signers.

## Changes

- Keep one MediaPipe video tracker per active signing session. Serialize that session's inference, close trackers on stop/completion/disconnect, expire idle sessions when the manager is accessed, and cap active sessions at 32. An idle process can retain at most 32 trackers until the next request or shutdown.
- Reject a prediction when its raw class score is below 0.55 or its margin over the second allowed class is below 0.15. These are provisional values, not calibrated probabilities. Configure `ASL_CONFIDENCE_THRESHOLD` and `ASL_MARGIN_THRESHOLD` after evaluation. Rejection cannot correct a confidently wrong prediction.
- Require three observations spanning at least 250 ms; reset after a gap above one second. Display no-hand, uncertain, different-sign, hold, and release feedback.
- In beginner spelling, repeated letters require at least two no-hand observations spanning 150 ms. This deliberately asks the learner to lower their hand. It is not a continuous fingerspelling decoder.
- Send a maximum-640-pixel JPEG only after the previous response, with a 100 ms scheduling delay. Suppress stale responses after target changes, abort stopped-session requests, and time out frame requests after eight seconds.
- Bind REST sessions to the authenticated student and Socket.IO sessions to the connection. Ignore duplicate/older REST frame IDs. A missing frame ID remains supported for older clients.
- Keep Gunicorn at one worker while sessions are process-local. Multiple replicas still require shared state/routing; this is a correctness fix, not a scaling solution.
- Reject incompatible model/label artifacts and never grade using synthetic demo templates. The classifier must have the existing 77-feature schema. Do not deploy the older 63-feature artifact with this extractor.

The current model is a StandardScaler + RBF SVC(C=10, probability=True), with 3,050 support vectors and 36 classes. It still uses the old feature construction and static J/Z labels. Feature improvements need a new versioned training run. J/Z motion recognition and actual whole-word sign recognition remain unimplemented.

## Validation

Run from `backend`:

```bash
python -m pytest tests -q
```

Run from `frontend`:

```bash
npm ci
npm test
npm run build
```

Tests cover uncertainty, incorrect letters, repeated letters, timing gaps, tracker lifetime, session ownership, duplicate frames, concurrent requests, metric accounting, frontend backpressure, stale responses, camera cleanup, and capture format. The existing video smoke test was stale: the implementation returns three lessons, so the assertion now checks the three actual lesson IDs.

A local CPU microbenchmark repeated `backend/static/asl/numbers/1.jpg` 12 times after one warmup. Neither path detected a hand in that teaching image. Baseline extraction (recreate detector) p50/p95: 170.30/265.21 ms. Reused tracker p50/p95: 34.81/49.07 ms. This demonstrates avoided initialization overhead on this machine only; it is not a hand-tracking, network, concurrency, or accuracy benchmark. Local checks used Python 3.12; the deployment configuration targets Python 3.11. Run staging validation on the deployment runtime before merging.

## Measure letter confusions before retraining

Collect consented real-camera images with known labels and signer identifiers. Use separate signers from training. Keep image files outside Git. Create a CSV with paths relative to that CSV:

```csv
image,label,signer_id
captures/person01/A_01.jpg,A,person01
captures/person02/S_01.jpg,S,person02
captures/person02/transition_01.jpg,UNKNOWN,person02
```

From `backend`:

```bash
python scripts/evaluate_letters.py /path/to/manifest.csv --output /path/to/report.json
# Optional JSON array of training signer IDs enables a disjointness check:
python scripts/evaluate_letters.py /path/to/manifest.csv --training-signers /path/to/train_signers.json --output /path/to/report.json
```

The script uses the runtime extractor and model. It rejects duplicate images and invalid labels, includes no-hand failures in accuracy, and reports per-letter accuracy, a confusion table, accepted coverage/accuracy, and negative false accepts. It evaluates independent frames, not the temporal gate. Without training signer metadata, it explicitly marks signer independence as unchecked.

No training images, recording manifests, or signer metadata are checked into this repository. No new weights were trained in this change. Next: collect a held-out webcam set, identify actual confusion pairs, add targeted data, share a corrected extractor between training/runtime, and evaluate/recalibrate a retrained model. Do not silently modify features under existing weights.

## Staging checklist

- Verify real model dependencies and both left/right hands on target devices; tracker video mode changes landmark behavior and must be checked on live signing.
- Exercise A/S and U/V examples, incorrect gestures, poor lighting, no hand, and repeated words such as BOOK. Check raw predictions as well as verifier outcomes.
- Check request timing fields (`timingsMs`) separately from browser round trip and deliberate hold time.
- Measure rejected valid signs as well as false accepts. Raising rejection thresholds can reduce usability; retain the previous release for rollback.
- Confirm one worker/one instance. Check idle expiry, camera permission denial, route changes during inference, and two concurrent users.
- Socket authentication remains the existing optional policy; unrelated password-recovery security issues identified in the audit are not fixed here.
