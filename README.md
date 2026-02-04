# 🏥 Nao Medical Translator (NaoTrans)

**A Real-time AI Voice & Text Translator for Doctor-Patient Communication.**

![Project Status](https://img.shields.io/badge/Status-Completed-success)
![Tech Stack](https://img.shields.io/badge/Stack-FastAPI%20%7C%20React%20%7C%20Groq%20AI-blue)

## 📖 Overview

NaoTrans is a full-stack medical translation application designed to bridge the language gap between doctors and patients. It features **real-time bi-directional translation**, **voice-to-text transcription**, and **AI-powered clinical summarization**.

Built with **Llama 3** (translation/summarization) and **Whisper** (transcription) via the **Groq Cloud API** for ultra-fast performance.

---

## ✨ Key Features

* **🗣️ Real-time Speech-to-Text:** Record voice messages that are instantly transcribed and translated.
* **🏥 Role-Based Interface:** Distinct UI modes for **Doctors** (Medical Blue) and **Patients** (Clean White).
* **🔄 Smart Translation:**
    * Patient input (Any Language) ➝ Translates to **English** for the Doctor.
    * Doctor input (English) ➝ Translates to the **selected Patient Language** (Hindi, Spanish, French, etc.).
* **📄 AI Clinical Summaries:** Generates structured medical reports (Symptoms, Diagnosis, Plan) from the chat history with one click.
* **🔎 Search & Highlight:** Instantly search conversation logs with keyword highlighting.
* **💾 Persistent History:** All conversations and audio clips are saved to a local SQLite database.
* **📱 Responsive UI:** Fully mobile-friendly "Medical Dashboard" design using Tailwind CSS.

---

## 🛠️ Tech Stack

### **Frontend**
* **Framework:** React (Vite)
* **Styling:** Tailwind CSS (Dark/Light mode support)
* **Icons:** Lucide React & Google Material Symbols
* **HTTP Client:** Axios

### **Backend**
* **Framework:** FastAPI (Python)
* **AI Models:** Groq Cloud (Llama3-8b, Whisper-large-v3)
* **Database:** SQLite (with SQLAlchemy ORM)
* **Server:** Uvicorn

---

## 📸 Usage Guide

1.  **🩺 Select Role:** Toggle between **Doctor** and **Patient** using the top switch.
2.  **🌐 Choose Language:** In the settings menu (⋮), select the target language for the patient (e.g., Hindi).
3.  **💬 Chat:** Type a message or **hold the microphone button** to speak.
4.  **🔊 Audio:** Click the **play button** on audio messages to listen to the original recording.
5.  **📄 Generate Report:** Click **"Generate Report"** to get an AI summary of the consultation, which you can then **Download as PDF**.

## 📂 Project Structure

```text
nao-medical-translator/
├── backend/
│   ├── main.py              # FastAPI application & Logic
│   ├── medical_chat.db      # SQLite Database
│   ├── requirements.txt     # Python dependencies
│   └── static/audio/        # Saved audio files
│
└── frontend/
    ├── src/
    │   ├── App.jsx          # Main React Component
    │   └── main.jsx         # Entry point
    ├── tailwind.config.js   # Styling configuration
    └── index.html           # HTML root
