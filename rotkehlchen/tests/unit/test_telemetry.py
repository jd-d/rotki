from __future__ import annotations

import requests

from rotkehlchen.errors.misc import RemoteError
from rotkehlchen.telemetry import TelemetryQueue, telemetry_collector
from rotkehlchen.utils.network import retry_calls


class _DummyResponse:
    def __init__(self, status_code: int) -> None:
        self.status_code = status_code


def test_telemetry_queue_serialization() -> None:
    queue = TelemetryQueue(maxlen=3)
    telemetry_collector.set_queue(queue)
    telemetry_collector.update_route('vpn-route')
    try:
        telemetry_collector.record_event(
            subsystem='http',
            direction='outbound',
            endpoint='https://api.rotki.com/test',
            latency_ms=42.5,
            status_code=200,
            success=True,
            metadata={'info': 'sample'},
        )
        events = queue.dump()
        assert len(events) == 1
        event = events[0]
        assert event['endpoint'] == 'https://api.rotki.com/test'
        assert event['route'] == 'vpn-route'
        assert event['metadata'] == {'info': 'sample'}
    finally:
        telemetry_collector.set_queue(None)
        telemetry_collector.update_route('direct')


def test_retry_calls_emits_telemetry() -> None:
    queue = TelemetryQueue(maxlen=5)
    telemetry_collector.set_queue(queue)
    telemetry_collector.update_route('direct')

    try:
        def successful_call(url: str) -> _DummyResponse:
            return _DummyResponse(200)

        result = retry_calls(
            times=1,
            location='unit-test',
            handle_429=False,
            backoff_in_seconds=0,
            method_name='success',
            function=successful_call,
            url='https://example.com/api',
        )
        assert result.status_code == 200
        success_event = queue.dump()[-1]
        assert success_event['endpoint'] == 'https://example.com/api'
        assert success_event['success'] is True
        assert success_event['status_code'] == 200

        def failing_call(url: str) -> _DummyResponse:
            raise requests.exceptions.Timeout('timeout')

        try:
            retry_calls(
                times=1,
                location='unit-test',
                handle_429=False,
                backoff_in_seconds=0,
                method_name='failure',
                function=failing_call,
                url='https://example.com/api',
            )
        except RemoteError:
            failure_event = queue.dump()[-1]
            assert failure_event['success'] is False
            assert failure_event['endpoint'] == 'https://example.com/api'
            assert 'timeout' in failure_event['error']
        else:  # pragma: no cover
            assert False, 'RemoteError not raised'
    finally:
        telemetry_collector.set_queue(None)
        telemetry_collector.update_route('direct')
