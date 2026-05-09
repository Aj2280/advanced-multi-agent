from __future__ import annotations

import time
from dataclasses import dataclass

import redis


@dataclass(frozen=True)
class ProviderQuota:
    rpm_limit: int | None = None
    daily_limit: int | None = None


class QuotaTracker:
    """
    Redis-backed quota tracker.
    - RPM: rolling 60s bucket
    - Daily: 24h TTL bucket
    """

    def __init__(self, *, redis_url: str) -> None:
        self._r = redis.Redis.from_url(redis_url, decode_responses=True)

    def _rpm_key(self, provider: str) -> str:
        bucket = int(time.time() // 60)
        return f"ama:quota:rpm:{provider}:{bucket}"

    def _daily_key(self, provider: str) -> str:
        return f"ama:quota:daily:{provider}"

    def can_call(self, *, provider: str, quota: ProviderQuota) -> bool:
        if quota.rpm_limit is not None:
            used = int(self._r.get(self._rpm_key(provider)) or 0)
            if used >= quota.rpm_limit:
                return False
        if quota.daily_limit is not None:
            used = int(self._r.get(self._daily_key(provider)) or 0)
            if used >= quota.daily_limit:
                return False
        return True

    def record_call(self, *, provider: str) -> None:
        rpm_key = self._rpm_key(provider)
        daily_key = self._daily_key(provider)
        pipe = self._r.pipeline()
        pipe.incr(rpm_key)
        pipe.expire(rpm_key, 120)  # keep a bit longer than 60s
        pipe.incr(daily_key)
        pipe.expire(daily_key, 60 * 60 * 24)
        pipe.execute()

    def snapshot(self, *, provider: str) -> dict[str, int]:
        return {
            "rpm_used": int(self._r.get(self._rpm_key(provider)) or 0),
            "daily_used": int(self._r.get(self._daily_key(provider)) or 0),
        }

