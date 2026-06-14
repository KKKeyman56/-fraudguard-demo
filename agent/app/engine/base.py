"""Analysis engine interface."""

from __future__ import annotations

from abc import ABC, abstractmethod

from ..core.schemas import (
    AdvisorRequest,
    AnalysisResult,
    ScanInterpretRequest,
    ThreatModelRequest,
)


class AnalysisEngine(ABC):
    """Backend that turns a request into an AnalysisResult."""

    name: str = "base"

    @abstractmethod
    async def advise(self, req: AdvisorRequest) -> AnalysisResult: ...

    @abstractmethod
    async def interpret_scan(self, req: ScanInterpretRequest) -> AnalysisResult: ...

    @abstractmethod
    async def threat_model(self, req: ThreatModelRequest) -> AnalysisResult: ...
