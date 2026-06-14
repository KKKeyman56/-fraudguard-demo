# SentinelAgent — AI Cybersecurity Advisor (Defensive / Authorized)

Backend Python (FastAPI) berisi AI agent yang membantu perusahaan menemukan
**celah keamanan pada aset mereka sendiri**. Bukan alat serang otomatis: agent
hanya menganalisis input yang Anda sediakan dan mengembalikan temuan + langkah
remediasi.

> ⚠️ **Etika & legal.** Gunakan **hanya** pada sistem yang Anda miliki atau Anda
> punya izin tertulis untuk menguji. Setiap request wajib menyertakan atestasi
> otorisasi (`authorization`) yang dicatat untuk audit trail.

## Tiga mode

| Endpoint | Mode | Input | Output |
|---|---|---|---|
| `POST /analyze/advisor` | Advisor defensif | Potongan kode, file config, kebijakan, daftar dependency, IaC | Temuan + CWE + remediasi |
| `POST /analyze/scan` | Interpreter scan pasif | Output tool yang sudah Anda jalankan (nmap, HTTP headers, SBOM, log) | Prioritas risiko + remediasi |
| `POST /analyze/threat-model` | Threat modeling STRIDE | Deskripsi sistem + komponen + aliran data | Daftar ancaman per komponen + mitigasi |

## LLM provider (bisa diganti)

Lapisan abstraksi memilih "otak" agent lewat env `LLM_PROVIDER`:

- `auto` (default) — pakai Anthropic kalau ada `ANTHROPIC_API_KEY`, lalu Groq, jika tidak ada → **mode offline/heuristik**
- `anthropic` — Claude (Messages API)
- `groq` — Llama (OpenAI-compatible API), konsisten dengan app Belajarin di repo ini
- `stub` — paksa mode offline (regex/aturan terkurasi, tanpa API key) — bagus untuk demo & CI

Mode offline tetap memberi temuan dasar yang deterministik (kredensial hardcoded,
hash lemah, eval/exec, SQLi/command-injection pattern, TLS verify off, port
berisiko dari nmap, header keamanan hilang, dll). Mode LLM memberi analisis yang
lebih kontekstual dan mendalam.

## Menjalankan

```bash
cd agent
python3 -m pip install -r requirements.txt
cp .env.example .env        # opsional: isi ANTHROPIC_API_KEY atau GROQ_API_KEY
uvicorn app.main:app --reload --port 8000
```

Cek: `curl localhost:8000/info`

## Contoh

```bash
curl -s localhost:8000/analyze/advisor -H 'content-type: application/json' -d '{
  "authorization": {"authorized": true, "owner_attestation": "CTO Acme, app HR internal", "engagement_id": "ENG-2026-01"},
  "artifacts": [
    {"name": "db.py", "type": "code",
     "content": "API_KEY = \"abc123secret\"\nq = \"SELECT * FROM users WHERE id=\" + uid"}
  ],
  "context": "Python + Flask, terhubung ke Postgres"
}'
```

Respons (ringkas):

```json
{
  "engagement_id": "ENG-2026-01",
  "mode": "advisor",
  "summary": "...",
  "findings": [
    {"id": "F-001", "title": "Kemungkinan kredensial hardcoded", "severity": "high",
     "cwe": "CWE-798", "recommendation": "Pindahkan rahasia ke secret manager ..."},
    {"id": "F-002", "title": "Kemungkinan SQL injection (query dirangkai)", "severity": "high",
     "cwe": "CWE-89", "recommendation": "Gunakan parameterized query ..."}
  ],
  "risk_score": 14.0,
  "disclaimer": "Temuan dihasilkan oleh AI ... validasi sebelum bertindak."
}
```

## Arsitektur

```
app/
  main.py                  FastAPI: routing + guardrail otorisasi + CORS
  config.py                Settings dari env (provider, model, timeout)
  core/
    schemas.py             Pydantic: request/response, Severity, risk score
    authorization.py       Guardrail: wajib atestasi otorisasi (+ audit log)
    prompts.py             System prompt defensif + prompt per-mode
  llm/
    base.py                Protocol LLMProvider
    anthropic_provider.py  Claude (Messages API)
    groq_provider.py       Groq (chat completions, JSON mode)
  engine/
    base.py                Interface AnalysisEngine
    llm_engine.py          Prompt → LLM → JSON tervalidasi (retry sekali)
    heuristic_engine.py    Mesin offline berbasis aturan (fallback & demo)
    factory.py             Pilih engine dari settings
tests/                     pytest (11 tes, jalan tanpa API key)
```

## Batasan & catatan keamanan

- Agent menolak menulis exploit siap-pakai; fokus pada deteksi, mitigasi, hardening.
- Temuan AI **harus divalidasi manual** sebelum dijadikan dasar tindakan.
- Mode offline sengaja konservatif (beberapa temuan ber-confidence rendah) untuk
  menghindari klaim palsu — gunakan LLM untuk cakupan lebih luas.
```
