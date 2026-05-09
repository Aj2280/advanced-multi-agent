from communication.circuit_breaker import CircuitBreaker


def test_circuit_breaker_opens_after_failures() -> None:
    cb = CircuitBreaker(max_consecutive_failures=2, open_seconds=60)
    assert cb.allow_request() is True
    cb.on_failure()
    assert cb.allow_request() is True
    cb.on_failure()
    assert cb.allow_request() is False


def test_circuit_breaker_resets_on_success() -> None:
    cb = CircuitBreaker(max_consecutive_failures=1, open_seconds=60)
    cb.on_failure()
    assert cb.allow_request() is False
    cb.on_success()
    assert cb.allow_request() is True

