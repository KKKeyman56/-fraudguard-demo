"""SentinelAgent API — authorized defensive security advisor.

Three modes:
  POST /analyze/advisor       — review code/config/policy/deps for weaknesses
  POST /analyze/scan          — interpret tool output (nmap/headers/sbom/log)
  POST /analyze/threat-model  — STRIDE threat modeling over a system description
"""

from __future__ import annotations

import logging

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import __version__
from .config import Settings, get_settings
from .core.authorization import require_authorization
from .core.schemas import (
    AdvisorRequest,
    AnalysisResult,
    ScanInterpretRequest,
    ThreatModelRequest,
)
from .engine.base import AnalysisEngine
from .engine.factory import build_engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

app = FastAPI(
    title="SentinelAgent",
    version=__version__,
    description="AI cybersecurity advisor untuk uji keamanan yang DIOTORISASI.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().origins_list(),
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


def get_engine(settings: Settings = Depends(get_settings)) -> AnalysisEngine:
    return build_engine(settings)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "version": __version__}


@app.get("/info")
def info(settings: Settings = Depends(get_settings)) -> dict:
    provider = settings.resolved_provider()
    model = {
        "anthropic": settings.anthropic_model,
        "groq": settings.groq_model,
    }.get(provider, "heuristic-offline")
    return {
        "provider": provider,
        "model": model,
        "modes": ["advisor", "scan", "threat-model"],
        "notice": "Hanya untuk aset yang Anda miliki atau diberi izin tertulis untuk diuji.",
    }


@app.post("/analyze/advisor", response_model=AnalysisResult)
async def advisor(req: AdvisorRequest, engine: AnalysisEngine = Depends(get_engine)) -> AnalysisResult:
    require_authorization(req.authorization)
    return await engine.advise(req)


@app.post("/analyze/scan", response_model=AnalysisResult)
async def scan(req: ScanInterpretRequest, engine: AnalysisEngine = Depends(get_engine)) -> AnalysisResult:
    require_authorization(req.authorization)
    return await engine.interpret_scan(req)


@app.post("/analyze/threat-model", response_model=AnalysisResult)
async def threat_model(req: ThreatModelRequest, engine: AnalysisEngine = Depends(get_engine)) -> AnalysisResult:
    require_authorization(req.authorization)
    return await engine.threat_model(req)
