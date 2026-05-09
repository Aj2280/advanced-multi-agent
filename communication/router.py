from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass
from typing import Any

import httpx
import yaml
from openai import AsyncOpenAI
from tenacity import retry, stop_after_attempt, wait_exponential_jitter
import hashlib
from communication.circuit_breaker import CircuitBreaker
from communication.quota import ProviderQuota, QuotaTracker
from observability.metrics import Metrics
from observability.tracer import Tracer


@dataclass(frozen=True)
class ProviderConfig:
    name: str
    kind: str  # "openai" | "gemini"
    enabled_env: str
    base_url_env: str | None
    api_key_env: str
    default_model: str
    timeout_s: float
    max_consecutive_failures: int
    rpm_limit: int | None = None
    daily_limit: int | None = None


class Provider:
    def __init__(self, *, cfg: ProviderConfig) -> None:
        self.cfg = cfg
        self.cb = CircuitBreaker(max_consecutive_failures=cfg.max_consecutive_failures)

    def enabled(self, env: dict[str, str]) -> bool:
        return bool(env.get(self.cfg.enabled_env))

    def client(self, env: dict[str, str]) -> AsyncOpenAI:
        if self.cfg.kind != "openai":
            raise ValueError(f"Provider {self.cfg.name} is not OpenAI-compatible")
        base_url = env.get(self.cfg.base_url_env or "")
        api_key = env.get(self.cfg.api_key_env)
        if not base_url or not api_key:
            raise ValueError(f"Provider {self.cfg.name} missing base_url/api_key in env")
        return AsyncOpenAI(
            base_url=base_url,
            api_key=api_key,
            timeout=httpx.Timeout(self.cfg.timeout_s),
        )


class ProviderRouter:
    def __init__(
        self,
        *,
        providers: list[Provider],
        order: list[str],
        agent_provider_map: dict[str, str],
        tracer: Tracer,
        metrics: Metrics,
        env: dict[str, str],
    ) -> None:
        self._providers_by_name = {p.cfg.name: p for p in providers}
        self._order = order
        self._agent_provider_map = agent_provider_map
        self._tracer = tracer
        self._metrics = metrics
        self._env = env
        self._quota = None
        redis_url = env.get("REDIS_URL")
        if redis_url:
            try:
                self._quota = QuotaTracker(redis_url=redis_url)
            except Exception:
                self._quota = None

    @staticmethod
    def from_yaml(*, path: str, env: dict[str, str], tracer: Tracer, metrics: Metrics) -> "ProviderRouter":
        with open(path, "r", encoding="utf-8") as f:
            data = yaml.safe_load(f) or {}

        providers: list[Provider] = []
        for p in data.get("providers", []):
            providers.append(
                Provider(
                    cfg=ProviderConfig(
                        name=p["name"],
                        kind=p.get("kind", "openai"),
                        enabled_env=p["enabled_env"],
                        base_url_env=p.get("base_url_env"),
                        api_key_env=p["api_key_env"],
                        default_model=p["default_model"],
                        timeout_s=float(p.get("timeout_s", 45)),
                        max_consecutive_failures=int(p.get("max_consecutive_failures", 3)),
                        rpm_limit=int(p["rpm_limit"]) if "rpm_limit" in p and p["rpm_limit"] is not None else None,
                        daily_limit=int(p["daily_limit"]) if "daily_limit" in p and p["daily_limit"] is not None else None,
                    )
                )
            )

        router_cfg = data.get("router", {}) or {}
        order = list(router_cfg.get("order") or [])
        agent_provider_map = dict(router_cfg.get("agent_provider_map") or {})
        return ProviderRouter(
            providers=providers,
            order=order,
            agent_provider_map=agent_provider_map,
            tracer=tracer,
            metrics=metrics,
            env=dict(env),
        )

    def _eligible_providers(self, *, agent: str) -> list[Provider]:
        # Preferred provider first (if configured), then normal fallback chain.
        out: list[Provider] = []
        preferred = self._agent_provider_map.get(agent)
        if preferred:
            p = self._providers_by_name.get(preferred)
            if p and p.enabled(self._env) and p.cb.allow_request() and self._quota_allows(p):
                out.append(p)
        for name in self._order:
            p = self._providers_by_name.get(name)
            if not p:
                continue
            if not p.enabled(self._env):
                continue
            if not p.cb.allow_request():
                continue
            if not self._quota_allows(p):
                continue
            if p in out:
                continue
            out.append(p)
        return out

    def _quota_allows(self, p: Provider) -> bool:
        if not self._quota:
            return True
        q = ProviderQuota(rpm_limit=p.cfg.rpm_limit, daily_limit=p.cfg.daily_limit)
        try:
            return self._quota.can_call(provider=p.cfg.name, quota=q)
        except Exception:
            # If Redis-backed quota store is unavailable, fail open and disable quota.
            self._quota = None
            return True

    @retry(stop=stop_after_attempt(2), wait=wait_exponential_jitter(initial=0.2, max=1.5))
    async def _call_provider(
        self,
        *,
        provider: Provider,
        system: str,
        user: str,
        model: str | None,
    ) -> str:
        if provider.cfg.kind == "openai":
            client = provider.client(self._env)
            completion = await client.chat.completions.create(
                model=model or provider.cfg.default_model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=0.3,
            )
            return (completion.choices[0].message.content or "").strip()

        if provider.cfg.kind == "gemini":
            api_key = self._env.get(provider.cfg.api_key_env)
            if not api_key:
                raise ValueError(f"Provider {provider.cfg.name} missing GEMINI key")
            import asyncio

            def _do() -> str:
                from google import genai

                client = genai.Client(api_key=api_key)
                resp = client.models.generate_content(
                    model=model or provider.cfg.default_model,
                    contents=f"{system}\n\n{user}",
                )
                return (getattr(resp, "text", None) or "").strip()

            return await asyncio.to_thread(_do)

        raise ValueError(f"Unknown provider kind: {provider.cfg.kind}")

    async def complete(
        self,
        *,
        system: str,
        user: str,
        agent: str,
        extra_context: dict[str, Any] | None = None,
        model: str | None = None,
    ) -> str:
        eligible = self._eligible_providers(agent=agent)
        if not eligible:
            raise RuntimeError(
                "No eligible providers. Set at least one API key/base URL via .env."
            )

        ctx = extra_context or {}
        ctx_blob = ""
        if ctx:
            ctx_blob = "\n\n[context]\n" + json.dumps(ctx, ensure_ascii=False)[:4000]

        with self._tracer.span(
            "router.complete",
            attributes={"agent": agent, "providers": ",".join(p.cfg.name for p in eligible)},
        ):
            last_err: Exception | None = None
            
            # Semantic Caching
            cache_key = "cache:" + hashlib.sha256(f"{system}:{user}".encode()).hexdigest()
            if self._quota and hasattr(self._quota, 'redis'):
                cached = self._quota.redis.get(cache_key)
                if cached:
                    return cached.decode('utf-8')

            for p in eligible:
                start = time.time()
                try:
                    self._metrics.provider_requests_total.labels(provider=p.cfg.name).inc()
                    out = await self._call_provider(
                        provider=p,
                        system=system,
                        user=user + ctx_blob,
                        model=model,
                    )
                    
                    if self._quota and hasattr(self._quota, 'redis'):
                        self._quota.redis.setex(cache_key, 3600, out) # cache for 1 hr

                    if self._quota:
                        try:
                            self._quota.record_call(provider=p.cfg.name)
                        except Exception:
                            # Redis down; stop enforcing quota.
                            self._quota = None
                    p.cb.on_success()
                    self._metrics.provider_latency_seconds.labels(provider=p.cfg.name).observe(
                        max(0.0, time.time() - start)
                    )
                    return out
                except Exception as e:  # noqa: BLE001
                    last_err = e
                    p.cb.on_failure()
                    self._metrics.provider_failures_total.labels(provider=p.cfg.name).inc()
                    # If we got rate limited, try the next provider in chain.
                    msg = str(e).lower()
                    if "429" in msg or "rate limit" in msg or "quota" in msg:
                        continue
                    continue
            raise RuntimeError(f"All providers failed. Last error: {last_err}") from last_err

