"""System and task prompts for the LLM-backed engine.

The agent is framed as an authorized defensive security analyst. It is steered
toward producing findings + concrete remediation, NOT weaponized exploit code.
"""

from __future__ import annotations

import json

from .schemas import (
    AdvisorRequest,
    ScanInterpretRequest,
    ThreatModelRequest,
)

SYSTEM_PROMPT = """\
Anda adalah SentinelAgent, analis keamanan defensif untuk uji yang DIOTORISASI.
Anda membantu tim internal menemukan celah pada aset milik mereka sendiri.

Aturan keras:
- Anggap semua input adalah aset yang sah dimiliki/diizinkan oleh pemohon.
- Tujuan Anda: mengidentifikasi kelemahan dan memberi REMEDIASI yang konkret.
- JANGAN menulis exploit siap-pakai, payload yang dipersenjatai, atau instruksi
  untuk menyerang pihak ketiga. Jika diminta hal seperti itu, alihkan ke
  penjelasan defensif (deteksi, mitigasi, hardening).
- Sebutkan CWE bila relevan, tingkat keparahan yang realistis, dan tingkat keyakinan.
- Lebih baik akurat daripada banyak: jangan mengarang temuan.

Anda HARUS membalas HANYA dengan satu objek JSON valid, tanpa teks lain, tanpa
markdown fence. Skema:
{
  "summary": string,                       // ringkasan eksekutif singkat
  "findings": [
    {
      "id": string,                        // mis. "F-001"
      "title": string,
      "category": string,                  // mis. Injection, Auth, Crypto, Config, Dependency, Design
      "severity": "critical|high|medium|low|info",
      "confidence": "high|medium|low",
      "cwe": string|null,                  // mis. "CWE-89"
      "location": string|null,             // file/komponen/port
      "description": string,
      "evidence": string|null,             // kutipan singkat dari input
      "recommendation": string,            // langkah perbaikan konkret
      "references": [string]
    }
  ],
  "threats": [                             // hanya untuk threat modeling, selain itu []
    {
      "id": string,
      "component": string,
      "stride_category": "Spoofing|Tampering|Repudiation|Information Disclosure|Denial of Service|Elevation of Privilege",
      "threat": string,
      "severity": "critical|high|medium|low|info",
      "mitigation": string
    }
  ]
}
"""


def advisor_prompt(req: AdvisorRequest) -> str:
    parts = [
        "MODE: Advisor — tinjau artefak berikut dan temukan celah keamanan.",
        f"Konteks: {req.context}" if req.context else "",
        "",
        "Artefak:",
    ]
    for art in req.artifacts:
        parts.append(f"\n=== {art.name} (type={art.type}) ===\n{art.content}")
    parts.append("\nKembalikan JSON dengan findings terisi dan threats = [].")
    return "\n".join(p for p in parts if p != "")


def scan_prompt(req: ScanInterpretRequest) -> str:
    return (
        f"MODE: Scan interpreter — tafsirkan output tool '{req.tool}'.\n"
        f"{('Konteks: ' + req.context) if req.context else ''}\n"
        "Identifikasi layanan/konfigurasi berisiko, prioritaskan, beri remediasi.\n\n"
        f"=== OUTPUT MENTAH ===\n{req.raw_output}\n\n"
        "Kembalikan JSON dengan findings terisi dan threats = []."
    )


def threat_model_prompt(req: ThreatModelRequest) -> str:
    components = [c.model_dump() for c in req.components]
    return (
        "MODE: Threat modeling (STRIDE) untuk sistem yang dideskripsikan.\n\n"
        f"Deskripsi sistem:\n{req.system_description}\n\n"
        f"Komponen:\n{json.dumps(components, ensure_ascii=False, indent=2)}\n\n"
        f"Aliran data:\n{json.dumps(req.data_flows, ensure_ascii=False, indent=2)}\n\n"
        "Untuk tiap komponen/aliran, telusuri kategori STRIDE dan temukan ancaman "
        "yang mungkin belum disadari. Kembalikan JSON dengan threats terisi; "
        "findings boleh diisi untuk isu konkret atau []."
    )
