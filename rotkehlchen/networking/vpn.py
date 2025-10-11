from __future__ import annotations

from dataclasses import dataclass
from typing import Final

from gevent.lock import Semaphore

from rotkehlchen.telemetry import telemetry_collector


@dataclass(slots=True)
class VPNRoute:
    """Represents the active VPN routing path."""

    name: str


class VPNManager:
    """Lightweight manager storing VPN routing state and emitting telemetry."""

    _DEFAULT_ROUTE: Final[str] = 'direct'

    def __init__(self) -> None:
        self._lock = Semaphore()
        self._route = VPNRoute(self._DEFAULT_ROUTE)
        telemetry_collector.update_route(self._DEFAULT_ROUTE)

    @property
    def route(self) -> str:
        with self._lock:
            return self._route.name

    def update_route(self, route: str | None) -> None:
        """Update the active VPN route and propagate the hint to telemetry."""
        normalized = route or self._DEFAULT_ROUTE
        with self._lock:
            self._route = VPNRoute(normalized)
        telemetry_collector.update_route(normalized)

    def record_probe(self, endpoint: str, latency_ms: float, success: bool, error: str | None = None) -> None:
        """Record a telemetry event for a VPN probe or tunnel action."""
        telemetry_collector.record_event(
            subsystem='vpn',
            direction='outbound',
            endpoint=endpoint,
            latency_ms=latency_ms,
            success=success,
            error=error,
            metadata={'route': self.route},
            route=self.route,
        )
