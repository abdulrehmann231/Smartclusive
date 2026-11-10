import pytest
from smartclusive.diagnostics import DiagnosticSessions
from test_recognition import Recognizer


class DiagnosticRecognizer(Recognizer):
    ranking = [('D', .9), ('R', .04), ('V', .03)]

    def extract_landmarks(self, image_bytes, tracker=None, diagnostics=None):
        result = super().extract_landmarks(image_bytes, tracker)
        diagnostics.update(landmarks=[[.2, .3, 0]] * 21, handedness='Left')
        return result if image_bytes != b'empty' else None

    def predict(self, feature, restrict_to=None):
        self.allowed = restrict_to
        return self.ranking


def test_target_blind_stability_and_tracking(monkeypatch):
    clock = [10.]
    monkeypatch.setattr('smartclusive.recognition.time.monotonic', lambda: clock[0])
    r = DiagnosticRecognizer()
    m = DiagnosticSessions(r)
    sid = m.start('S', 'letter', owner=1)
    for i in range(4):
        clock[0] += .15
        out = m.process_frame(sid, b'frame', owner=1, frame_id=i)
    assert out['stableLabel'] == 'D'
    assert len(r.allowed) == 26
    assert len(r.trackers) == 1
    assert out['landmarks'][0][0] == .2
    r.ranking = [('U', .9), ('K', .04)]
    clock[0] += .15
    assert m.process_frame(sid, b'frame', owner=1, frame_id=4)['stableLabel'] is None
    r.ranking = [('K', .9), ('U', .04)]
    for i in range(5, 8):
        clock[0] += .15
        out = m.process_frame(sid, b'frame', owner=1, frame_id=i)
    assert out['stableLabel'] == 'K'
    clock[0] += 2
    assert m.process_frame(sid, b'frame', owner=1, frame_id=8)['stableLabel'] is None
    m.close()
    assert r.trackers[0].closed


def test_ownership_duplicates_no_hand_and_missing_model():
    r = DiagnosticRecognizer()
    m = DiagnosticSessions(r, max_sessions=1)
    sid = m.start('A', 'letter', owner=1)
    assert m.process_frame(sid, b'frame', owner=2, frame_id=0) is None
    with pytest.raises(ValueError):
        m.start('A', 'letter')
    out = m.process_frame(sid, b'empty', owner=1, frame_id=0)
    assert out['feedback'] == 'no_hand'
    assert out['candidates'] == []
    assert m.process_frame(sid, b'frame', owner=1, frame_id=0)['error'] == 'stale_frame'
    assert r.calls == 1
    r.mode = 'demo'
    out = m.process_frame(sid, b'frame', owner=1, frame_id=1)
    assert out['feedback'] == 'model_unavailable'
    assert not out['candidates']
    m.close()


def test_overlay_preserves_features_and_image_coordinates(monkeypatch):
    from types import SimpleNamespace
    import numpy as np
    from smartclusive import recognition
    points = [SimpleNamespace(x=.1+i*.02, y=.8-i*.02, z=i*.001) for i in range(21)]
    result = SimpleNamespace(multi_hand_landmarks=[SimpleNamespace(landmark=points)],
                             multi_handedness=[SimpleNamespace(classification=[SimpleNamespace(label='Left')])])
    tracker = SimpleNamespace(process=lambda _: result)
    cv = SimpleNamespace(IMREAD_COLOR=1, COLOR_BGR2RGB=2,
                         imdecode=lambda *_: np.zeros((2,2,3)), cvtColor=lambda a, _: a)
    monkeypatch.setattr(recognition, '_import_cv', lambda: cv)
    monkeypatch.setattr(recognition, '_import_mp', lambda: (None, None))
    recognizer = recognition.ASLRecognizer.__new__(recognition.ASLRecognizer)
    details = {}
    ordinary = recognizer.extract_landmarks(b'image', tracker=tracker)
    diagnostic = recognizer.extract_landmarks(b'image', tracker=tracker, diagnostics=details)
    assert len(diagnostic) == 77
    assert diagnostic == ordinary
    assert details['landmarks'][0][0] == .1
    assert details['handedness'] == 'Left'
