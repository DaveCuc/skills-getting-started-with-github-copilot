import copy

import pytest
from fastapi.testclient import TestClient

from src import app as app_module


@pytest.fixture(autouse=True)
def client_and_restore():
    """Provide a TestClient and restore in-memory activities after each test."""
    # Deep copy current activities so we can restore after the test
    original = copy.deepcopy(app_module.activities)
    client = TestClient(app_module.app)
    yield client
    # restore state
    app_module.activities.clear()
    app_module.activities.update(original)


def test_get_activities(client_and_restore):
    client = client_and_restore
    resp = client.get("/activities")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, dict)
    # ensure at least one known activity exists
    assert "Chess Club" in data


def test_signup_and_unregister_flow(client_and_restore):
    client = client_and_restore
    email = "test_student@example.com"
    activity_name = "Chess Club"

    # Ensure clean start: remove if present
    if email in client.get("/activities").json()[activity_name]["participants"]:
        client.post(f"/activities/{activity_name}/unregister", params={"email": email})

    # Signup should succeed
    resp = client.post(f"/activities/{activity_name}/signup", params={"email": email})
    assert resp.status_code == 200
    assert email in client.get("/activities").json()[activity_name]["participants"]

    # Duplicate signup should fail with 400
    resp2 = client.post(f"/activities/{activity_name}/signup", params={"email": email})
    assert resp2.status_code == 400

    # Unregister should succeed
    resp3 = client.post(f"/activities/{activity_name}/unregister", params={"email": email})
    assert resp3.status_code == 200
    assert email not in client.get("/activities").json()[activity_name]["participants"]

    # Unregistering again should fail
    resp4 = client.post(f"/activities/{activity_name}/unregister", params={"email": email})
    assert resp4.status_code == 400


def test_signup_nonexistent_activity(client_and_restore):
    client = client_and_restore
    resp = client.post("/activities/ThisActivityDoesNotExist/signup", params={"email": "a@b.com"})
    assert resp.status_code == 404
