from flask_socketio import SocketIO

from app import create_app
from smartclusive.recognition import get_sign_sessions
from smartclusive.socket_events import register_socket


def test_socket_sessions_are_connection_scoped_and_cleaned_on_disconnect():
    app = create_app({'TESTING': True})
    socket = SocketIO(app, async_mode='threading')
    register_socket(socket)
    first, second = socket.test_client(app), socket.test_client(app)
    response = first.emit('sign:start', {'target': 'A', 'kind': 'letter'}, callback=True)
    sid = response['sessionId']
    assert second.emit('sign:frame', {'sessionId': sid, 'image': 'AA=='}, callback=True) == {'error': 'session_not_found'}
    second.emit('sign:stop', {'sessionId': sid}, callback=True)
    assert sid in get_sign_sessions().sessions
    first.disconnect()
    assert sid not in get_sign_sessions().sessions
    second.disconnect()
