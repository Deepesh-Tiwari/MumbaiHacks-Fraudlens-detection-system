# Fraudlens – Realtime Vishing Detector

A real-time AI system that detects vishing and social-engineering attempts during live calls and alerts users instantly to prevent fraud.

---

## Tech Stack
- WebSockets for live, low-latency audio/text streaming  
- Gemini API for real-time scam intent and linguistic pattern detection  
- LangChain for reasoning, agent workflows, and pipeline orchestration  
- Node.js / Python backend  
- React / Flutter frontend (optional live dashboard)

---

## How It Works
1. Audio from a phone call (or text transcript) is streamed to the backend via WebSockets.  
2. The backend forwards incremental chunks to the Gemini Realtime API.  
3. Gemini analyzes tone, intent, manipulation cues, and scam patterns within milliseconds.  
4. LangChain agents combine context, past conversation history, and Gemini outputs to generate a fraud risk score.  
5. The system broadcasts live alerts back to the user interface through WebSockets.  
6. If the risk crosses a threshold, the user receives an instant warning (popup, vibration, or sound alert).

---

## Features
- Realtime scam detection (vishing, impersonation, OTP scams, UPI scams, KYC scams, bank fraud)  
- Sub-second latency using WebSockets  
- Intent classification and risk scoring  
- Chain-of-thought reasoning using LangChain  
- Live dashboard for end users  
- Optional anonymization layer to protect user privacy  
- Instant alerts as conversation unfolds  
- Transcript logging with red-flag markers



