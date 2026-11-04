import pytest

from scripts.evaluate_letters import summarize


def test_rejections_and_detection_failures_are_not_hidden_in_accuracy():
    result = summarize([
        {'label': 'A', 'prediction': 'A', 'accepted': True},
        {'label': 'A', 'prediction': None, 'accepted': False},
        {'label': 'S', 'prediction': 'A', 'accepted': True},
        {'label': 'UNKNOWN', 'prediction': 'A', 'accepted': True},
        {'label': 'UNKNOWN', 'prediction': None, 'accepted': False},
    ])
    assert result['top1_accuracy'] == pytest.approx(1 / 3)
    assert result['accepted_accuracy'] == .5
    assert result['accepted_coverage'] == pytest.approx(2 / 3)
    assert result['negative_false_accept_rate'] == .5
    assert {'actual': 'A', 'predicted': 'NO_HAND', 'count': 1} in result['confusion']


def test_no_accepted_predictions_does_not_report_perfect_accuracy():
    result = summarize([{'label': 'A', 'prediction': None, 'accepted': False}])
    assert result['accepted_accuracy'] is None
    assert result['top1_accuracy'] == 0
