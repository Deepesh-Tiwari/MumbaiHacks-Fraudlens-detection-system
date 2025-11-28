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


# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.
