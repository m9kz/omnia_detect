import asyncio
import json

import pytest

from app.domain.exceptions.base import (
    ConflictException,
    CriticalException,
    NotFoundException,
    TransientException,
    ValidationException,
)
from app.presentation.exception_handlers import omnia_exception_handler


@pytest.mark.parametrize(
    ("exc", "status_code"),
    [
        (ValidationException("bad input"), 400),
        (NotFoundException("missing"), 404),
        (ConflictException("blocked"), 409),
        (TransientException("try later"), 503),
    ],
)
def test_omnia_exception_handler_maps_expected_status_codes(exc, status_code):
    response = asyncio.run(omnia_exception_handler(None, exc))
    payload = json.loads(response.body)

    assert response.status_code == status_code
    assert payload["detail"] == exc.message
    assert payload["error"] == exc.__class__.__name__


def test_omnia_exception_handler_redacts_critical_details():
    response = asyncio.run(
        omnia_exception_handler(None, CriticalException("database password leaked"))
    )
    payload = json.loads(response.body)

    assert response.status_code == 500
    assert payload["detail"] == "Internal application failure"
    assert payload["error"] == "CriticalException"
