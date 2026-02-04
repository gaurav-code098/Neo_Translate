import os
import shutil
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from dotenv import load_dotenv
from groq import Groq

# --- CONFIGURATION ---
load_dotenv()
app = FastAPI()

# Create directories for audio storage
os.makedirs("static/audio", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# AI Client
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# --- DATABASE ---
DATABASE_URL = "sqlite:///./medical_chat.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class ChatMessage(Base):
    __tablename__ = "messages"
    id = Column(Integer, primary_key=True, index=True)
    role = Column(String)  # 'doctor' or 'patient'
    original_text = Column(Text)
    translated_text = Column(Text)
    original_lang = Column(String)
    target_lang = Column(String)
    original_audio_url = Column(String, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- SCHEMAS ---
class MessageCreate(BaseModel):
    role: str
    text: str
    target_lang: str  # The language the RECEIVER reads

# --- HELPERS ---
def perform_translation(text, target_lang):
    """
    Translates text to target_lang. 
    Source language is auto-detected by the LLM context.
    """
    system_prompt = (
        f"You are a professional medical translator. "
        f"Translate the following text into {target_lang}. "
        "Do not explain. Do not add notes. Just return the translated text."
    )
    
    try:
        completion = client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.3,
        )
        return completion.choices[0].message.content.strip().strip('"')
    except Exception as e:
        return f"[Translation Error] {str(e)}"

# --- ENDPOINTS ---

@app.post("/chat/text")
async def chat_text(msg: MessageCreate, db: Session = Depends(get_db)):
    # 1. Detect Source implicitly via LLM or assume based on role
    # If Doctor -> Source is English. If Patient -> Source is "Auto"
    
    translated = perform_translation(msg.text, msg.target_lang)
    
    db_msg = ChatMessage(
        role=msg.role,
        original_text=msg.text,
        translated_text=translated,
        original_lang="Auto", # Simplified for storage
        target_lang=msg.target_lang
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

@app.post("/chat/audio")
async def chat_audio(
    role: str = Form(...),
    target_lang: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # 1. Save Audio File
    file_ext = file.filename.split(".")[-1]
    filename = f"audio_{uuid.uuid4()}.{file_ext}"
    file_path = f"static/audio/{filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    audio_url = f"/static/audio/{filename}"

    # 2. Transcribe (Whisper on Groq)
    # Whisper automatically detects the spoken language
    try:
        with open(file_path, "rb") as audio_file:
            transcription = client.audio.transcriptions.create(
                file=(filename, audio_file.read()),
                model="whisper-large-v3",
                response_format="text"
            )
        original_text = transcription.strip()
    except Exception as e:
        original_text = f"[Transcription Error: {str(e)}]"

    # 3. Translate transcribed text
    translated_text = perform_translation(original_text, target_lang)

    # 4. Save
    db_msg = ChatMessage(
        role=role,
        original_text=original_text,
        translated_text=translated_text,
        original_lang="Audio-Auto",
        target_lang=target_lang,
        original_audio_url=audio_url
    )
    db.add(db_msg)
    db.commit()
    db.refresh(db_msg)
    return db_msg

@app.get("/history")
def get_history(db: Session = Depends(get_db)):
    return db.query(ChatMessage).order_by(ChatMessage.timestamp).all()

@app.get("/summarize")
def generate_summary(db: Session = Depends(get_db)):
    messages = db.query(ChatMessage).all()
    if not messages:
        return {"summary": "No conversation logs found."}
    
    # Create a transcript for the AI
    transcript = ""
    for m in messages:
        transcript += f"{m.role.upper()}: {m.translated_text} (Original: {m.original_text})\n"
    
    prompt = (
        "You are a medical scribe. Summarize the following consultation.\n"
        "Format strictly as:\n"
        "**PATIENT SYMPTOMS:** ...\n"
        "**DIAGNOSIS:** ...\n"
        "**MEDICATIONS/PLAN:** ...\n\n"
        f"TRANSCRIPT:\n{transcript}"
    )
    
    try:
        completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama-3.3-70b-versatile" # Larger model for better reasoning
        )
        return {"summary": completion.choices[0].message.content}
    except Exception as e:
        return {"summary": f"Summary failed: {str(e)}"}