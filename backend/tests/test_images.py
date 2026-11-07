from app import create_app
from smartclusive.images import fingerspelling_for


def test_fingerspelling_images_are_served_locally():
    # Hotlinked Wikimedia URLs are blocked on some networks, so every
    # letter/digit reference must resolve to an asset this app serves.
    client = create_app().test_client()
    fs = fingerspelling_for("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
    for entry in fs["letters"]:
        assert entry["image"].startswith("/mock/asl/"), entry
        assert client.get(entry["image"]).status_code == 200, entry
