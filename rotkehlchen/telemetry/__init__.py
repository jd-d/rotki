from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any, Final, Literal

from gevent.lock import Semaphore

from rotkehlchen.types import TimestampMS
from rotkehlchen.utils.misc import ts_now_in_ms

TelemetryDirection = Literal['inbound', 'outbound']
TelemetrySubsystem = Literal['http', 'websocket', 'vpn']


@dataclass(slots=True)
class TelemetryEvent:
    """Represents a single telemetry datapoint for networking activity."""

    timestamp: TimestampMS
    direction: TelemetryDirection
    subsystem: TelemetrySubsystem
    endpoint: str
    route: str | None
    latency_ms: float
    status_code: int | None = None
    success: bool = True
    error: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def serialize(self) -> dict[str, Any]:
        """Return a JSON serializable representation of the event."""
        return {
            'timestamp': int(self.timestamp),
            'direction': self.direction,
            'subsystem': self.subsystem,
            'endpoint': self.endpoint,
            'route': self.route,
            'latency_ms': float(self.latency_ms),
            'status_code': self.status_code,
            'success': self.success,
            'error': self.error,
            'metadata': self.metadata or {},
        }


class TelemetryQueue:
    """A bounded queue storing the most recent telemetry events."""

    def __init__(self, maxlen: int = 500) -> None:
        self._events: deque[TelemetryEvent] = deque(maxlen=maxlen)
        self._lock = Semaphore()

    def add_event(self, event: TelemetryEvent) -> None:
        with self._lock:
            self._events.append(event)

    def extend(self, events: list[TelemetryEvent]) -> None:
        with self._lock:
            self._events.extend(events)

    def clear(self) -> None:
        with self._lock:
            self._events.clear()

    def get_recent(self, limit: int | None = None) -> list[TelemetryEvent]:
        with self._lock:
            if limit is None or limit >= len(self._events):
                return list(self._events)
            return list(self._events)[-limit:]

    def dump(self, limit: int | None = None) -> list[dict[str, Any]]:
        return [event.serialize() for event in self.get_recent(limit=limit)]


class TelemetryCollector:
    """Collects telemetry events from subsystems and routes them to a queue."""

    _DEFAULT_ROUTE: Final[str] = 'direct'

    def __init__(self) -> None:
        self._queue: TelemetryQueue | None = None
        self._route_hint: str = self._DEFAULT_ROUTE
        self._lock = Semaphore()

    def set_queue(self, queue: TelemetryQueue | None) -> None:
        with self._lock:
            self._queue = queue

    def update_route(self, route: str | None) -> None:
        with self._lock:
            self._route_hint = route or self._DEFAULT_ROUTE

    def record_event(
            self,
            *,
            subsystem: TelemetrySubsystem,
            direction: TelemetryDirection,
            endpoint: str,
            latency_ms: float,
            success: bool,
            status_code: int | None = None,
            error: str | None = None,
            metadata: dict[str, Any] | None = None,
            route: str | None = None,
    ) -> None:
        queue = self._queue
        if queue is None:
            return

        with self._lock:
            resolved_route = route or self._route_hint

        event = TelemetryEvent(
            timestamp=ts_now_in_ms(),
            direction=direction,
            subsystem=subsystem,
            endpoint=endpoint,
            route=resolved_route,
            latency_ms=latency_ms,
            status_code=status_code,
            success=success,
            error=error,
            metadata=metadata or {},
        )
        queue.add_event(event)

    def flush(self, limit: int | None = None) -> list[dict[str, Any]]:
        queue = self._queue
        if queue is None:
            return []
        return queue.dump(limit=limit)


telemetry_collector = TelemetryCollector()

__all__ = [
    'TelemetryCollector',
    'TelemetryDirection',
    'TelemetryEvent',
    'TelemetryQueue',
    'TelemetrySubsystem',
    'telemetry_collector',
]
