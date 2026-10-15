from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db import Base, get_db
from app.main import app
from app.models import Ticket


TEST_ENGINE = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(bind=TEST_ENGINE, autoflush=False, autocommit=False)


def override_get_db() -> Generator[Session, None, None]:
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session", autouse=True)
def test_database() -> Generator[None, None, None]:
    Base.metadata.create_all(bind=TEST_ENGINE)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=TEST_ENGINE)


@pytest.fixture(autouse=True)
def clean_database() -> Generator[None, None, None]:
    db = TestingSessionLocal()
    db.query(Ticket).delete()
    db.commit()
    db.close()
    yield


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


def ticket_payload(**overrides: str) -> dict[str, str]:
    payload = {
        "subject": "Cannot access the customer portal",
        "description": "The portal returns a blank page after sign in.",
        "priority": "HIGH",
        "category": "TECHNICAL",
        "requester": "Asha Customer",
        "assignee": "Support Team",
    }
    payload.update(overrides)
    return payload


def test_health(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "UP"}


def test_root_describes_supportdesk(client: TestClient) -> None:
    response = client.get("/")

    assert response.status_code == 200
    assert response.json()["service"] == "SupportDesk API"
    assert response.json()["resource"] == "tickets"


def test_empty_ticket_list(client: TestClient) -> None:
    response = client.get("/api/tickets")

    assert response.status_code == 200
    assert response.json() == []


def test_create_ticket(client: TestClient) -> None:
    response = client.post("/api/tickets", json=ticket_payload())

    assert response.status_code == 201
    assert response.json()["subject"] == "Cannot access the customer portal"
    assert response.json()["status"] == "OPEN"
    assert response.json()["category"] == "TECHNICAL"


def test_get_ticket(client: TestClient) -> None:
    created = client.post("/api/tickets", json=ticket_payload()).json()

    response = client.get(f"/api/tickets/{created['id']}")

    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_update_ticket_status(client: TestClient) -> None:
    created = client.post("/api/tickets", json=ticket_payload()).json()

    response = client.put(
        f"/api/tickets/{created['id']}",
        json={"status": "IN_PROGRESS", "assignee": "Priya Agent"},
    )

    assert response.status_code == 200
    assert response.json()["status"] == "IN_PROGRESS"
    assert response.json()["assignee"] == "Priya Agent"


def test_ticket_stats(client: TestClient) -> None:
    client.post("/api/tickets", json=ticket_payload())
    client.post("/api/tickets", json=ticket_payload(status="RESOLVED"))

    response = client.get("/api/tickets/stats")

    assert response.status_code == 200
    assert response.json() == {"total": 2, "open": 1, "inProgress": 0, "waiting": 0, "resolved": 1}


def test_delete_ticket(client: TestClient) -> None:
    created = client.post("/api/tickets", json=ticket_payload()).json()

    response = client.delete(f"/api/tickets/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/tickets/{created['id']}").status_code == 404


def test_missing_ticket_returns_not_found(client: TestClient) -> None:
    response = client.get("/api/tickets/9999")

    assert response.status_code == 404
    assert response.json() == {"detail": "Ticket not found"}


def test_invalid_ticket_payload_returns_validation_error(client: TestClient) -> None:
    response = client.post("/api/tickets", json={"subject": "", "priority": "NOT_A_PRIORITY"})

    assert response.status_code == 422


def test_readiness_uses_the_test_database(client: TestClient) -> None:
    response = client.get("/ready")

    assert response.status_code == 200
    assert response.json() == {"status": "READY"}


def test_metrics_endpoint_returns_prometheus_text(client: TestClient) -> None:
    response = client.get("/metrics")

    assert response.status_code == 200
    assert "http_requests_total" in response.text
