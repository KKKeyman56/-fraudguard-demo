"""LLM-backed analysis engine.

Builds a prompt, asks the model for structured JSON, validates it, and retries
once with the parse error fed back (same pattern as the existing Belajarin app).
"""

from __future__ import annotations

import json
import logging
import re

from pydantic import ValidationError

from ..core import prompts
from ..core.schemas import (
    AdvisorRequest,
    AnalysisResult,
    Finding,
    ScanInterpretRequest,
    Threat,
    ThreatModelRequest,
)
from ..llm.base import LLMProvider
from .base import AnalysisEngine

logger = logging.getLogger("sentinel.engine.llm")

_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)


def _extract_json(text: str) -> dict:
    """Pull the first JSON object out of a model response."""
    text = text.strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = _JSON_RE.search(text)
    if not match:
        raise ValueError("Tidak ada objek JSON pada respons model.")
    return json.loads(match.group(0))


class LLMEngine(AnalysisEngine):
    def __init__(self, provider: LLMProvider) -> None:
        self.provider = provider
        self.name = provider.name

    async def _run(self, mode: str, engagement_id: str, user_prompt: str) -> AnalysisResult:
        raw = await self.provider.complete(prompts.SYSTEM_PROMPT, user_prompt)
        try:
            data = _extract_json(raw)
        except (ValueError, json.JSONDecodeError) as exc:
            logger.warning("parse gagal (%s), retry sekali", exc)
            retry = (
                user_prompt
                + f"\n\nRespons sebelumnya tidak bisa diparse sebagai JSON ({exc}). "
                "Balas ULANG HANYA dengan satu objek JSON valid sesuai skema."
            )
            raw = await self.provider.complete(prompts.SYSTEM_PROMPT, retry)
            data = _extract_json(raw)

        findings = [Finding(**f) for f in data.get("findings", [])]
        threats = [Threat(**t) for t in data.get("threats", [])]
        result = AnalysisResult(
            engagement_id=engagement_id,
            mode=mode,
            summary=data.get("summary", ""),
            findings=findings,
            threats=threats,
        )
        return result.compute_risk_score()

    async def advise(self, req: AdvisorRequest) -> AnalysisResult:
        return await self._run(
            "advisor", req.authorization.engagement_id, prompts.advisor_prompt(req)
        )

    async def interpret_scan(self, req: ScanInterpretRequest) -> AnalysisResult:
        return await self._run(
            "scan", req.authorization.engagement_id, prompts.scan_prompt(req)
        )

    async def threat_model(self, req: ThreatModelRequest) -> AnalysisResult:
        return await self._run(
            "threat_model",
            req.authorization.engagement_id,
            prompts.threat_model_prompt(req),
        )
