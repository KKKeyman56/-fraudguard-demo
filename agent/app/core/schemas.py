"""Pydantic models shared across the API, engines, and prompts."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

DISCLAIMER = (
    "Temuan dihasilkan oleh AI untuk membantu tim keamanan internal pada aset yang "
    "diotorisasi. Bukan pengganti audit manual. Validasi setiap temuan sebelum bertindak."
)

SEVERITY_WEIGHTS = {
    "critical": 10.0,
    "high": 7.0,
    "medium": 4.0,
    "low": 1.0,
    "info": 0.0,
}


class Severity(str, Enum):
    critical = "critical"
    high = "high"
    medium = "medium"
    low = "low"
    info = "info"


class Confidence(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"


class Authorization(BaseModel):
    """Attestation that the requester is authorized to assess the target."""

    authorized: bool = Field(
        ..., description="Harus true: pemohon menyatakan punya izin atas aset ini."
    )
    owner_attestation: str = Field(
        ...,
        min_length=3,
        description="Siapa pemilik/pemberi izin & lingkup uji (mis. 'CTO Acme, app internal HR').",
    )
    engagement_id: str = Field(
        ..., min_length=1, description="ID engagement/tiket untuk audit trail."
    )


class Artifact(BaseModel):
    name: str = Field(..., min_length=1)
    type: str = Field(
        "other",
        description="code | config | policy | dependencies | architecture | iac | other",
    )
    content: str = Field(..., min_length=1)


class Finding(BaseModel):
    id: str
    title: str
    category: str
    severity: Severity
    confidence: Confidence = Confidence.medium
    cwe: Optional[str] = None
    location: Optional[str] = None
    description: str
    evidence: Optional[str] = None
    recommendation: str
    references: list[str] = Field(default_factory=list)


class Threat(BaseModel):
    id: str
    component: str
    stride_category: str
    threat: str
    severity: Severity
    mitigation: str


class AnalysisResult(BaseModel):
    engagement_id: str
    mode: str
    summary: str
    findings: list[Finding] = Field(default_factory=list)
    threats: list[Threat] = Field(default_factory=list)
    risk_score: float = 0.0
    disclaimer: str = DISCLAIMER

    def compute_risk_score(self) -> "AnalysisResult":
        total = sum(SEVERITY_WEIGHTS.get(f.severity.value, 0.0) for f in self.findings)
        total += sum(
            SEVERITY_WEIGHTS.get(t.severity.value, 0.0) * 0.5 for t in self.threats
        )
        self.risk_score = round(min(100.0, total), 1)
        return self


# ── Request bodies ───────────────────────────────────────────────────────


class AdvisorRequest(BaseModel):
    authorization: Authorization
    artifacts: list[Artifact] = Field(..., min_length=1)
    context: Optional[str] = Field(
        None, description="Konteks tambahan: bahasa, framework, ancaman yang dikhawatirkan."
    )


class ScanInterpretRequest(BaseModel):
    authorization: Authorization
    tool: str = Field(
        ..., description="nmap | http_headers | sbom | log | tls | other"
    )
    raw_output: str = Field(..., min_length=1)
    context: Optional[str] = None


class Component(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    trust_boundary: Optional[str] = None


class ThreatModelRequest(BaseModel):
    authorization: Authorization
    system_description: str = Field(..., min_length=10)
    components: list[Component] = Field(default_factory=list)
    data_flows: list[str] = Field(default_factory=list)
