import threading
from concurrent.futures import ThreadPoolExecutor

import pytest

from smartclusive.recognition import SignSessionManager, SignVerifier


def hold(verifier, label, start=0, confidence=.95, runner_up=.02):
    for t in (start, start + .15, start + .30):
        result = verifier.update((label, confidence), runner_up=runner_up, now=t)
    return result


def test_similar_candidates_are_rejected_even_when_target_is_top():
    v = SignVerifier('A', 'letter')
    result = hold(v, 'A', confidence=.60, runner_up=.40)
    assert result['complete']
    v = SignVerifier('A', 'letter')
    result = hold(v, 'A', confidence=.56, runner_up=.44)
    assert result['feedback'] == 'uncertain'
    assert result['matched'] == []


@pytest.mark.parametrize('score', [.1, float('nan'), float('inf')])
def test_low_or_invalid_confidence_is_not_accepted(score):
    assert not hold(SignVerifier('A', 'letter'), 'A', confidence=score)['complete']


def test_wrong_letter_never_advances():
    v = SignVerifier('A', 'letter')
    for i in range(20):
        state = v.update(('S', .99), now=i * .15)
    assert state['matched'] == []
    assert state['feedback'] == 'different_sign'


def test_three_burst_requests_are_not_a_stable_pose():
    v = SignVerifier('A', 'letter')
    for t in (0, .01, .02):
        state = v.update(('A', .99), now=t)
    assert not state['complete']


def test_stale_timestamp_and_long_gap_do_not_accumulate_stability():
    v = SignVerifier('A', 'letter')
    for t in (0, .15, .15, .10, 2):
        state = v.update(('A', .99), now=t)
    assert not state['complete']
    assert v.stable_count == 1


def test_uncertainty_resets_hold_without_releasing_repeated_letter():
    v = SignVerifier('OO', 'word')
    assert hold(v, 'O')['matched'] == ['O']
    for t in (.5, .7, .9):
        state = v.update(('O', .3), now=t, hand_present=True)
    assert state['feedback'] == 'release_hand'
    assert state['matched'] == ['O']


def test_book_requires_release_between_os():
    v = SignVerifier('BOOK', 'word')
    hold(v, 'B')
    hold(v, 'O', 1)
    assert hold(v, 'O', 2)['matched'] == ['B', 'O']
    v.update(None, now=2.5, hand_present=False)
    # One missed tracking frame must not unlock a repeated letter.
    assert v.update(('O', .99), now=2.6)['feedback'] == 'release_hand'
    v.update(None, now=2.8, hand_present=False)
    assert v.update(None, now=3.0, hand_present=False)['feedback'] == 'ready'
    assert hold(v, 'O', 3.2)['matched'] == ['B', 'O', 'O']
    assert hold(v, 'K', 4)['complete']


def test_no_hand_resets_partial_hold():
    v = SignVerifier('A', 'letter')
    v.update(('A', .99), now=0)
    v.update(None, now=.15)
    assert not v.update(('A', .99), now=.30)['complete']


class Tracker:
    def __init__(self):
        self.closed = False

    def close(self):
        self.closed = True


class Recognizer:
    mode = 'model'

    def __init__(self):
        self.trackers = []
        self.calls = 0
        self.allowed = []

    def create_tracker(self):
        tracker = Tracker()
        self.trackers.append(tracker)
        return tracker

    def extract_landmarks(self, image_bytes, tracker=None):
        assert not tracker.closed
        self.calls += 1
        return [0] * 77

    def predict(self, feature, restrict_to=None):
        self.allowed = restrict_to
        return [('S', .56), ('A', .44)]


def test_tracker_reuse_is_per_session_and_stop_closes_it():
    r = Recognizer()
    m = SignSessionManager(r)
    a, b = m.start('A', 'letter'), m.start('B', 'letter')
    m.process_frame(a, b'frame')
    m.process_frame(a, b'frame')
    m.process_frame(b, b'frame')
    assert len(r.trackers) == 2
    m.stop(a)
    assert r.trackers[0].closed and not r.trackers[1].closed
    m.close()
    assert r.trackers[1].closed


def test_no_expected_answer_leakage_and_duplicate_frames_are_ignored():
    r = Recognizer()
    m = SignSessionManager(r)
    sid = m.start('A', 'letter')
    state = m.process_frame(sid, b'frame', frame_id=3)
    assert state['candidates'][0]['label'] == 'S'
    assert state['feedback'] == 'uncertain'
    assert len(r.allowed) == 26
    m.process_frame(sid, b'frame', frame_id=3)
    m.process_frame(sid, b'frame', frame_id=2)
    assert r.calls == 1
    m.close()


def test_sessions_are_owned_and_bounded_and_expire():
    r = Recognizer()
    m = SignSessionManager(r, max_sessions=1)
    sid = m.start('A', 'letter', owner=1)
    assert m.process_frame(sid, b'frame', owner=2) is None
    m.stop(sid, owner=2)
    assert m.state(sid, owner=1) is not None
    with pytest.raises(ValueError, match='too_many_sign_sessions'):
        m.start('B', 'letter')
    m.process_frame(sid, b'frame', owner=1)
    m.sessions[sid].last_seen -= 121
    assert m.state(sid, owner=1) is None
    assert r.trackers[0].closed
    m.start('B', 'letter')
    m.close()


def test_synthetic_demo_cannot_grade_real_signs():
    r = Recognizer()
    r.mode = 'demo'
    m = SignSessionManager(r)
    sid = m.start('A', 'letter')
    assert m.process_frame(sid, b'frame')['feedback'] == 'model_unavailable'
    assert r.calls == 0


def test_same_session_inference_is_serialized():
    entered, release = threading.Event(), threading.Event()

    class SlowRecognizer(Recognizer):
        def extract_landmarks(self, image_bytes, tracker=None):
            entered.set()
            assert release.wait(3)
            return super().extract_landmarks(image_bytes, tracker)

    r = SlowRecognizer()
    m = SignSessionManager(r)
    sid = m.start('A', 'letter')
    with ThreadPoolExecutor(2) as pool:
        first = pool.submit(m.process_frame, sid, b'frame', frame_id=0)
        assert entered.wait(3)
        second = pool.submit(m.process_frame, sid, b'frame', frame_id=0)
        release.set()
        first.result(timeout=3)
        second.result(timeout=3)
    assert r.calls == 1
    m.close()
