import pytest

from app.core.schemas import (
    AdvisorRequest,
    Artifact,
    Authorization,
    Component,
    ScanInterpretRequest,
    Severity,
    ThreatModelRequest,
)
from app.engine.heuristic_engine import HeuristicEngine

AUTH = Authorization(authorized=True, owner_attestation="CTO Acme", engagement_id="ENG-1")


@pytest.fixture
def engine():
    return HeuristicEngine()


@pytest.mark.asyncio
async def test_advisor_detects_hardcoded_secret_and_eval(engine):
    code = 'API_KEY = "abcdef123456"\nresult = eval(user_input)\n'
    req = AdvisorRequest(
        authorization=AUTH,
        artifacts=[Artifact(name="app.py", type="code", content=code)],
    )
    res = await engine.advise(req)
    titles = " ".join(f.title for f in res.findings)
    assert "kredensial" in titles.lower()
    assert "eval" in titles.lower()
    assert res.risk_score > 0


@pytest.mark.asyncio
async def test_advisor_clean_artifact_has_no_findings(engine):
    req = AdvisorRequest(
        authorization=AUTH,
        artifacts=[Artifact(name="ok.py", type="code", content="x = 1 + 1\n")],
    )
    res = await engine.advise(req)
    assert res.findings == []
    assert res.risk_score == 0.0


@pytest.mark.asyncio
async def test_scan_flags_telnet_as_critical(engine):
    nmap = "23/tcp open telnet\n80/tcp open http\n"
    req = ScanInterpretRequest(authorization=AUTH, tool="nmap", raw_output=nmap)
    res = await engine.interpret_scan(req)
    telnet = [f for f in res.findings if "Telnet" in f.title]
    assert telnet and telnet[0].severity == Severity.critical


@pytest.mark.asyncio
async def test_scan_flags_missing_security_headers(engine):
    headers = "HTTP/1.1 200 OK\nServer: nginx/1.18.0\n"
    req = ScanInterpretRequest(authorization=AUTH, tool="http_headers", raw_output=headers)
    res = await engine.interpret_scan(req)
    titles = " ".join(f.title for f in res.findings).lower()
    assert "hsts" in titles
    assert "csp" in titles


@pytest.mark.asyncio
async def test_threat_model_covers_all_stride_categories(engine):
    req = ThreatModelRequest(
        authorization=AUTH,
        system_description="API publik dengan database pelanggan.",
        components=[Component(name="API Gateway"), Component(name="Database")],
    )
    res = await engine.threat_model(req)
    cats = {t.stride_category for t in res.threats}
    assert cats == {
        "Spoofing",
        "Tampering",
        "Repudiation",
        "Information Disclosure",
        "Denial of Service",
        "Elevation of Privilege",
    }
    assert len(res.threats) == 12  # 6 STRIDE x 2 komponen
