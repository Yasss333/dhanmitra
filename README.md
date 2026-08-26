<p align="center">
  <img src="dhan.png" alt="DhanMitra Banner" width="100%">
</p>

<h1 align="center">DhanMitra</h1>

<p align="center">
  <b>Your AI financial companion, built for Bharat.</b><br>
  <sub>Speaking your language. Protecting your money. Growing your savings.</sub>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat&logo=python&logoColor=white">
  <img src="https://img.shields.io/badge/FastAPI-0.115-009688?style=flat&logo=fastapi&logoColor=white">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black">
  <img src="https://img.shields.io/badge/Agno-2.6-7C3AED?style=flat">
  <img src="https://img.shields.io/badge/LanceDB-0.17-000?style=flat">
  <img src="https://img.shields.io/badge/OpenRouter-Gemini-FF6A1A?style=flat">
</p>

---

## The Problem

> **76% of Indians are financially illiterate.** Government schemes barely reach eligible families. Existing apps are built for urban, English-speaking users — ignoring farmers, gig workers, homemakers, and students who need guidance the most.

## The Solution

DhanMitra is a **voice-first, multilingual AI assistant** that speaks Hindi, Marathi, Kannada, or English — and adapts to *your* life.

---

## Features

| | Feature | What it does |
|---|---|---|
| 🛡️ | **Scam Guardian** | Detects fraud attempts and gives instant, urgent alerts in your language |
| 🤖 | **5 AI Agents** | Specialist agents for scams, budgeting, govt schemes, stocks — orchestrated automatically |
| 📊 | **RAG-Powered Schemes** | Semantic search across 7+ government schemes using hybrid vector + metadata pipeline |
| 🎮 | **Financial Fitness** | Gamified quizzes with streaks, levels, and LLM-generated challenges |
| 💳 | **UPI Integration** | Create payment links, mock transactions — all through Setu sandbox |
| 🗣️ | **Voice-First** | Tap-to-speak orb with browser STT/TTS for visually impaired users |
| 📱 | **Multi-Channel** | Web app, Telegram bot, WhatsApp — all connected |
| 🧠 | **Mitra Insights** | Auto-extracts your income, EMIs, goals from chat and enriches every reply |

---

## Architecture

```
┌──────────────┐     ┌─────────────────────────────────────┐
│   Frontend   │────▶│           FastAPI Backend            │
│  React+Vite  │     │                                     │
│  Clerk Auth  │     │  ┌─────────┐  ┌──────────────────┐  │
│  shadcn/ui   │     │  │ Router   │─▶│ Guardian (scams) │  │
│  Tailwind v4 │     │  │ Agent    │  │ Companion (money)│  │
└──────────────┘     │  │          │  │ Scheme Finder    │  │
                     │  │          │  │ Sahayak (general)│  │
┌──────────────┐     │  └─────────┘  └──────────────────┘  │
│  Telegram    │────▶│       │              │               │
│  WhatsApp    │     │       ▼              ▼               │
│  CLI         │     │  ┌──────────┐  ┌──────────────┐     │
└──────────────┘     │  │ MongoDB  │  │ LanceDB      │     │
                     │  │ (users,  │  │ (vector RAG) │     │
                     │  │ sessions)│  └──────────────┘     │
                     │  └──────────┘                        │
                     └─────────────────────────────────────┘
```

---

## Tech Stack

| Layer | Tech |
|---|---|
| **Backend** | FastAPI, Python 3.10+ |
| **AI** | Agno multi-agent framework, OpenRouter (Gemma/Llama) |
| **Database** | MongoDB (structured) + LanceDB (vector embeddings) |
| **Frontend** | React 19, Vite 8, Tailwind CSS v4, shadcn/ui |
| **Auth** | Clerk |
| **Voice** | Web Speech API (browser), OpenAI Whisper (Telegram) |
| **Payments** | Setu UPI Sandbox |
| **Channels** | Web, Telegram Bot, WhatsApp |

---

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- MongoDB (local or Atlas)

### Backend

```bash
cd "backend copy"
python -m venv .venv
.venv\Scripts\activate          # Windows
pip install -r requirements.txt
cp .env.example .env            # fill in your keys
uvicorn main:app --reload --port 8000
```

Seed schemes & vector DB:
```bash
curl -X GET http://localhost:8000/api/schemes/seed
python seed_vector_db.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — sign in, complete onboarding, and start chatting.

---

## Project Structure

```
dhanmitra/
├── backend copy/          # FastAPI + Agno agents
│   ├── api/               # Routes: chat, profile, schemes, payments, telegram
│   ├── agents/            # 5 AI agents + tools + LanceDB setup
│   ├── services/          # Memory, Setu, Telegram, WhatsApp, scheduler
│   ├── models/            # Pydantic schemas
│   └── main.py            # Entry point
├── frontend/              # React + Vite
│   └── src/
│       ├── pages/         # Landing, Onboarding, Home, Chat, VoiceOrb, Fitness
│       ├── components/    # Sidebar, Chat UI, PaymentCard, AgentTrace
│       └── hooks/         # Speech recognition & synthesis
└── frontend/dist/         # Production build
```

---

## How It Works

1. **User speaks or types** in their language (Hindi, Marathi, Kannada, English)
2. **Agent Router** identifies intent — scam alert? budget help? scheme lookup?
3. **Specialist agent** responds with personalized, occupation-aware advice
4. **Mitra Insights Engine** extracts financial facts from the conversation and enriches future replies
5. **Everything persists** — profiles, goals, conversation history in MongoDB

---

<p align="center">
  Made with care for Bharat's financial independence.
</p>
