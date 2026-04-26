# 🛡️ FraudGuard — Real-time Fraud Detection Demo

> A live, interactive fraud detection dashboard built to simulate how modern fintech systems catch fraud in real-time — powered by a real dataset of 6.3 million transactions.

![FraudGuard Demo](https://img.shields.io/badge/status-live-brightgreen) ![Dataset](https://img.shields.io/badge/dataset-AIML%206.3M%20tx-blue) ![Stack](https://img.shields.io/badge/stack-vanilla%20JS%20%2B%20HTML-orange) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

---

## 🚀 Live Demo

👉 **[fraudguard.github.io/fraudguard-demo](https://your-username.github.io/fraudguard-demo)**

No install. No login. Just open and run.

---

## 💡 What is this?

FraudGuard is a **proof-of-concept fraud detection SaaS** that monitors financial transactions in real-time, assigns risk scores, and triggers automated responses — all in under 15ms per transaction.

This demo simulates what a production fraud system looks like from the inside: a live transaction stream, AI-style confidence scoring, manual review workflows, and full audit logging.

---

## ✨ Features

### 🔴 Real-time Transaction Stream
- Streams real rows from the **AIML PaySim dataset** (6.3M transactions)
- Auto-scores every transaction on arrival
- Color-coded risk levels: **SAFE / WARNING / CRITICAL**

### 🧠 Risk Scoring Engine
- Rule-based engine with **9 fraud signals**
- Each signal has a weighted confidence contribution (normalized to 100%)
- Signals include: balance fully drained, dest balance unchanged, exact balance transfer, CASH_OUT full drain, large amounts, new destination patterns

### 💥 Scenario Demos (1-click)
| Button | What it does |
|--------|-------------|
| 🔴 **Simulate Attack** | One account gets hacked — 5 rapid escalating transactions, balance fully drained, auto-blocked at score 99 |
| ⚡ **Fraud Burst** | 10 accounts fire simultaneously — simulates a coordinated fraud cluster attack |
| 📊 **Before vs After** | Sales overlay showing impact metrics vs no fraud detection |

### 🔒 Account Management
- **Block account** — all future transactions rejected automatically
- **Send to review** — manual analyst queue with notes
- **Unblock** — restore account access
- **Mark as clear** — dismiss false positives

### 📋 Full Audit Log
Every action timestamped: blocks, unblocks, reviews, auto-blocks, clears

### 💰 Impact Metrics
- Live counter: **potential loss prevented**
- Live counter: **fraud cases stopped**
- Before/After comparison with projected annual numbers

---

## 🎬 Demo Script (for investor/client presentations)

1. **Press ▶ START** — watch the live stream fill with real transactions
2. **Click any red row** — see the full case detail, confidence weights, account journey
3. **Press 🔴 Simulate Attack** — watch a single account get compromised in real-time
4. **Press ⚡ Fraud Burst** — 10 accounts attacked simultaneously
5. **Press 📊 Before vs After** — show the business case
6. **Block an account** — demonstrate the response workflow

Total demo time: ~3 minutes. No prep needed.

---

## 🏗️ Tech Stack

```
Frontend:   Vanilla JS + HTML/CSS (zero dependencies, zero build step)
Dataset:    PaySim Synthetic Financial Dataset (Kaggle AIML)
Scoring:    Rule-based engine with weighted signal normalization
Rendering:  Pure DOM manipulation — no React, no Vue
Fonts:      JetBrains Mono + DM Sans (Google Fonts)
```

**Why no framework?** This is a single-file demo meant to run anywhere — GitHub Pages, email attachment, USB drive, offline. No npm install, no Webpack, no tears.

---

## 📊 Dataset

Uses the **[PaySim Synthetic Financial Dataset](https://www.kaggle.com/datasets/ealaxi/paysim1)** — a simulation of mobile money transactions based on real anonymized transaction logs from a mobile money service in Africa.

- **6,362,621** total transactions
- **8,213** fraud cases (0.13% fraud rate)
- Transaction types: PAYMENT, TRANSFER, CASH_OUT, DEBIT, CASH_IN
- This demo uses a curated sample of 200 rows (60 fraud + 140 normal) shuffled and looped

---

## 🚀 Roadmap (Production Version)

```
Phase 1 (current)  →  Rule-based scoring engine ✅
Phase 2            →  ML model: Isolation Forest + XGBoost
Phase 3            →  Graph analysis: Neo4j money mule network detection
Phase 4            →  Streaming: Apache Kafka real-time pipeline
Phase 5            →  API: REST endpoint — send tx, get risk score <15ms
```

---

## 🗂️ Repo Structure

```
fraudguard-demo/
├── index.html        ← The entire app (self-contained)
└── README.md         ← You are here
```

---

## 🤝 Contact

Built as a demo for **FraudGuard** — a fraud detection API for fintech companies.

Interested in the production version or want to discuss integration?

📧 your@email.com  
🔗 linkedin.com/in/yourprofile

---

<div align="center">
  <sub>Built with real data. Designed for real impact.</sub>
</div>
