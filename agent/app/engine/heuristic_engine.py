"""Offline, rule-based analysis engine.

No network or API key required. Uses curated regex/keyword rules so the agent
is genuinely useful for demos and CI, and acts as a fallback when no LLM
provider is configured. The LLM engine produces richer results; this one
guarantees deterministic, explainable baseline findings.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from ..core.schemas import (
    AdvisorRequest,
    AnalysisResult,
    Component,
    Confidence,
    Finding,
    ScanInterpretRequest,
    Severity,
    Threat,
    ThreatModelRequest,
)
from .base import AnalysisEngine


@dataclass
class Rule:
    pattern: re.Pattern
    title: str
    category: str
    severity: Severity
    recommendation: str
    cwe: str | None = None
    confidence: Confidence = Confidence.medium
    references: list[str] = field(default_factory=list)


def _r(pattern: str, *args, **kwargs) -> Rule:
    return Rule(re.compile(pattern, re.IGNORECASE), *args, **kwargs)


# Rules applied to source code / config / IaC artifacts.
CODE_RULES: list[Rule] = [
    _r(
        r"""(?:password|passwd|secret|api[_-]?key|access[_-]?key|token)\s*[:=]\s*['"][^'"]{6,}['"]""",
        "Kemungkinan kredensial hardcoded",
        "Secrets",
        Severity.high,
        "Pindahkan rahasia ke secret manager / variabel lingkungan. Rotasi nilai yang sudah terekspos.",
        cwe="CWE-798",
        confidence=Confidence.medium,
    ),
    _r(
        r"\b(md5|sha1)\b",
        "Algoritma hash lemah (MD5/SHA1)",
        "Crypto",
        Severity.medium,
        "Gunakan SHA-256+ untuk integritas; bcrypt/scrypt/Argon2 untuk password.",
        cwe="CWE-327",
    ),
    _r(
        r"\beval\s*\(|\bexec\s*\(",
        "Eksekusi dinamis (eval/exec)",
        "Injection",
        Severity.high,
        "Hindari eval/exec pada input tak tepercaya. Gunakan parser/allowlist yang aman.",
        cwe="CWE-95",
    ),
    _r(
        r"os\.system\s*\(|subprocess\.[a-z_]+\([^)]*shell\s*=\s*True",
        "Potensi command injection",
        "Injection",
        Severity.high,
        "Jangan rangkai perintah shell dari input. Pakai argumen list & shell=False.",
        cwe="CWE-78",
    ),
    _r(
        r"""(?:select|insert|update|delete)\b[^;\n]*?(?:\+|\|\||%|f['"]|\.format\()""",
        "Kemungkinan SQL injection (query dirangkai)",
        "Injection",
        Severity.high,
        "Gunakan parameterized query / prepared statement, jangan string concatenation.",
        cwe="CWE-89",
    ),
    _r(
        r"pickle\.loads|yaml\.load\s*\((?![^)]*Loader)",
        "Deserialisasi tidak aman",
        "Deserialization",
        Severity.high,
        "Hindari pickle pada data tak tepercaya; pakai yaml.safe_load / format aman.",
        cwe="CWE-502",
    ),
    _r(
        r"verify\s*=\s*False|InsecureSkipVerify|rejectUnauthorized\s*:\s*false",
        "Verifikasi sertifikat TLS dinonaktifkan",
        "Crypto",
        Severity.high,
        "Aktifkan kembali verifikasi sertifikat; pin CA bila perlu.",
        cwe="CWE-295",
    ),
    _r(
        r"http://(?!localhost|127\.0\.0\.1)",
        "Endpoint HTTP non-TLS",
        "Transport",
        Severity.medium,
        "Gunakan HTTPS untuk semua trafik yang membawa data sensitif.",
        cwe="CWE-319",
        confidence=Confidence.low,
    ),
    _r(
        r"debug\s*=\s*true|DEBUG\s*=\s*True",
        "Mode debug aktif",
        "Config",
        Severity.medium,
        "Matikan debug di produksi agar tidak membocorkan stack trace/konfigurasi.",
        cwe="CWE-489",
    ),
    _r(
        r"Access-Control-Allow-Origin['\"]?\s*[:=]\s*['\"]?\*",
        "CORS terlalu permisif (wildcard)",
        "Config",
        Severity.medium,
        "Batasi origin yang diizinkan; jangan gabungkan '*' dengan kredensial.",
        cwe="CWE-942",
    ),
    _r(
        r"dangerouslySetInnerHTML|\.innerHTML\s*=",
        "Sink HTML berpotensi XSS",
        "Injection",
        Severity.medium,
        "Sanitasi/escape konten; hindari menyuntik HTML mentah dari input pengguna.",
        cwe="CWE-79",
        confidence=Confidence.low,
    ),
    _r(
        r'"alg"\s*:\s*"none"|alg=none',
        "JWT alg=none diterima",
        "Auth",
        Severity.critical,
        "Tolak token alg=none; pin algoritma yang diharapkan saat verifikasi.",
        cwe="CWE-347",
    ),
]

# Risky listening services keyed by port for nmap-style output.
RISKY_PORTS = {
    "21": ("FTP", Severity.high, "Kredensial/data plaintext. Ganti ke SFTP/FTPS atau tutup."),
    "23": ("Telnet", Severity.critical, "Protokol plaintext. Nonaktifkan, gunakan SSH."),
    "3389": ("RDP", Severity.high, "Batasi via VPN/allowlist + MFA; jangan ekspos ke internet."),
    "445": ("SMB", Severity.high, "Jangan ekspos SMB ke internet; segmentasi & patch."),
    "3306": ("MySQL", Severity.high, "Database tidak boleh terekspos publik; bind internal + firewall."),
    "5432": ("PostgreSQL", Severity.high, "Bind ke internal, firewall, dan wajibkan TLS."),
    "6379": ("Redis", Severity.high, "Redis sering tanpa auth; ikat ke localhost + requirepass."),
    "27017": ("MongoDB", Severity.high, "Aktifkan auth & jangan dengarkan 0.0.0.0."),
    "9200": ("Elasticsearch", Severity.high, "Aktifkan auth/TLS; jangan ekspos publik."),
}

SECURITY_HEADERS = {
    "strict-transport-security": ("HSTS tidak diset", Severity.medium, "Tambahkan header HSTS dengan max-age memadai."),
    "content-security-policy": ("CSP tidak diset", Severity.medium, "Terapkan Content-Security-Policy untuk mitigasi XSS."),
    "x-content-type-options": ("X-Content-Type-Options tidak diset", Severity.low, "Set 'nosniff'."),
    "x-frame-options": ("Proteksi clickjacking tidak ada", Severity.low, "Set X-Frame-Options/ frame-ancestors di CSP."),
}


class HeuristicEngine(AnalysisEngine):
    name = "stub"

    def _scan_text(self, text: str, source: str, start_idx: int) -> list[Finding]:
        findings: list[Finding] = []
        idx = start_idx
        for rule in CODE_RULES:
            m = rule.pattern.search(text)
            if not m:
                continue
            idx += 1
            snippet = m.group(0)[:160]
            findings.append(
                Finding(
                    id=f"F-{idx:03d}",
                    title=rule.title,
                    category=rule.category,
                    severity=rule.severity,
                    confidence=rule.confidence,
                    cwe=rule.cwe,
                    location=source,
                    description=f"Pola terdeteksi pada {source}.",
                    evidence=snippet,
                    recommendation=rule.recommendation,
                    references=rule.references,
                )
            )
        return findings

    async def advise(self, req: AdvisorRequest) -> AnalysisResult:
        findings: list[Finding] = []
        for art in req.artifacts:
            findings.extend(self._scan_text(art.content, art.name, len(findings)))
        summary = (
            f"Pemindaian heuristik offline menemukan {len(findings)} potensi isu "
            f"pada {len(req.artifacts)} artefak."
            if findings
            else "Tidak ada pola berisiko yang cocok dengan aturan heuristik offline. "
            "Untuk analisis lebih dalam, aktifkan provider LLM."
        )
        return AnalysisResult(
            engagement_id=req.authorization.engagement_id,
            mode="advisor",
            summary=summary,
            findings=findings,
        ).compute_risk_score()

    async def interpret_scan(self, req: ScanInterpretRequest) -> AnalysisResult:
        findings: list[Finding] = []
        raw = req.raw_output
        tool = req.tool.lower()

        if tool in {"nmap", "ports", "other"}:
            for port, (svc, sev, rec) in RISKY_PORTS.items():
                if re.search(rf"\b{port}/(?:tcp|udp)\b.*open", raw, re.IGNORECASE) or re.search(
                    rf"\bopen\b.*\b{port}\b", raw, re.IGNORECASE
                ):
                    findings.append(
                        Finding(
                            id=f"F-{len(findings) + 1:03d}",
                            title=f"Layanan berisiko terbuka: {svc} (port {port})",
                            category="Exposure",
                            severity=sev,
                            confidence=Confidence.medium,
                            location=f"port {port}",
                            description=f"Port {port} ({svc}) terdeteksi terbuka.",
                            recommendation=rec,
                        )
                    )

        if tool in {"http_headers", "headers", "tls", "other"}:
            lowered = raw.lower()
            for header, (title, sev, rec) in SECURITY_HEADERS.items():
                if header not in lowered:
                    findings.append(
                        Finding(
                            id=f"F-{len(findings) + 1:03d}",
                            title=title,
                            category="Config",
                            severity=sev,
                            confidence=Confidence.medium,
                            location="HTTP response headers",
                            description=f"Header '{header}' tidak ditemukan pada output.",
                            recommendation=rec,
                        )
                    )
            if "server:" in lowered:
                m = re.search(r"server:\s*(.+)", raw, re.IGNORECASE)
                findings.append(
                    Finding(
                        id=f"F-{len(findings) + 1:03d}",
                        title="Banner versi server terekspos",
                        category="Information Disclosure",
                        severity=Severity.low,
                        confidence=Confidence.low,
                        location="HTTP response headers",
                        evidence=(m.group(0)[:120] if m else None),
                        description="Header Server membocorkan info teknologi/versi.",
                        recommendation="Sembunyikan/minimalkan banner versi.",
                    )
                )

        # Generic secret scan across any pasted output.
        findings.extend(self._scan_text(raw, f"{req.tool} output", len(findings)))

        summary = f"Interpretasi heuristik output '{req.tool}': {len(findings)} temuan."
        return AnalysisResult(
            engagement_id=req.authorization.engagement_id,
            mode="scan",
            summary=summary,
            findings=findings,
        ).compute_risk_score()

    async def threat_model(self, req: ThreatModelRequest) -> AnalysisResult:
        components = req.components or [Component(name="Sistem")]
        threats: list[Threat] = []
        stride = [
            ("Spoofing", Severity.high, "Wajibkan autentikasi kuat & MFA; verifikasi identitas antar layanan (mTLS)."),
            ("Tampering", Severity.high, "Integritas data: validasi input, signing, dan kontrol akses tulis."),
            ("Repudiation", Severity.medium, "Audit log yang tamper-evident untuk aksi sensitif."),
            ("Information Disclosure", Severity.high, "Enkripsi at-rest/in-transit & minimalkan data yang diekspos."),
            ("Denial of Service", Severity.medium, "Rate limiting, kuota, dan timeout pada titik masuk."),
            ("Elevation of Privilege", Severity.critical, "Least privilege, pisahkan peran, validasi otorisasi tiap aksi."),
        ]
        n = 0
        for comp in components:
            for category, sev, mitigation in stride:
                n += 1
                threats.append(
                    Threat(
                        id=f"T-{n:03d}",
                        component=comp.name,
                        stride_category=category,
                        threat=f"{category} terhadap '{comp.name}'"
                        + (f" ({comp.description})" if comp.description else ""),
                        severity=sev,
                        mitigation=mitigation,
                    )
                )
        summary = (
            f"Threat model STRIDE awal: {len(threats)} ancaman lintas "
            f"{len(components)} komponen. Aktifkan LLM untuk analisis kontekstual lebih dalam."
        )
        return AnalysisResult(
            engagement_id=req.authorization.engagement_id,
            mode="threat_model",
            summary=summary,
            threats=threats,
        ).compute_risk_score()
