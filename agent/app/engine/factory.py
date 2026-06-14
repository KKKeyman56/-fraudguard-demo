"""Builds the active analysis engine from settings."""

from __future__ import annotations

import logging

from ..config import Settings
from ..llm.anthropic_provider import AnthropicProvider
from ..llm.groq_provider import GroqProvider
from .base import AnalysisEngine
from .heuristic_engine import HeuristicEngine
from .llm_engine import LLMEngine

logger = logging.getLogger("sentinel.engine.factory")


def build_engine(settings: Settings) -> AnalysisEngine:
    provider = settings.resolved_provider()

    if provider == "anthropic":
        return LLMEngine(
            AnthropicProvider(
                settings.anthropic_api_key,
                settings.anthropic_model,
                settings.request_timeout,
            )
        )
    if provider == "groq":
        return LLMEngine(
            GroqProvider(
                settings.groq_api_key,
                settings.groq_model,
                settings.request_timeout,
            )
        )

    if provider != "stub":
        logger.warning("provider '%s' tidak dikenal, fallback ke heuristik offline", provider)
    return HeuristicEngine()
