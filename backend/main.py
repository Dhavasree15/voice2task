from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import re

app = FastAPI()

# Allow frontend (Vite) to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------
# Request model
# -----------------------------
class TranscriptInput(BaseModel):
    transcript: str


# -----------------------------
# Helpers
# -----------------------------
ACTION_WORDS = [
    "call",
    "practice",
    "do",
    "complete",
    "finish",
    "submit",
    "review",
    "study",
    "attend",
    "go",
    "buy",
    "send",
    "prepare",
    "meet",
    "read",
    "write",
    "visit",
    "work",
    "learn",
    "revise",
    "record",
    "check",
    "plan",
    "create",
    "build",
]

ACTION_PATTERN = r"\b(" + "|".join(ACTION_WORDS) + r")\b"


def normalize_text(text: str) -> str:
    """
    Clean transcript while preserving time expressions.
    """
    if not text:
        return ""

    t = text.strip()

    # Normalize quotes
    t = t.replace("’", "'").replace("“", '"').replace("”", '"')

    # Normalize a.m. / p.m. -> am / pm
    t = re.sub(r"\ba\s*\.?\s*m\.?\b", "am", t, flags=re.IGNORECASE)
    t = re.sub(r"\bp\s*\.?\s*m\.?\b", "pm", t, flags=re.IGNORECASE)

    # Normalize spaces
    t = re.sub(r"\s+", " ", t).strip()

    return t


def format_time(hour: int, minute: int, meridian: Optional[str]) -> str:
    """
    Convert extracted time to clean display format like 5:00 PM
    """
    if meridian:
        meridian = meridian.upper()
        return f"{hour}:{minute:02d} {meridian}"
    else:
        # fallback display if AM/PM missing
        if 1 <= hour <= 11:
            return f"{hour}:{minute:02d} AM"
        elif hour == 12:
            return f"{hour}:{minute:02d} PM"
        elif hour > 12:
            return f"{hour - 12}:{minute:02d} PM"
        return f"{hour}:{minute:02d}"


def extract_time_from_chunk(chunk: str):
    """
    Extract time ONLY from the current chunk.
    This avoids wrong time carrying to next tasks.
    Supports:
    - at 5
    - at 5 pm
    - at 5:30 pm
    - 6 pm
    - 7:15 am
    """
    time_patterns = [
        r"\bat\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b",
        r"\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b",
        r"\bat\s+(\d{1,2})(?::(\d{2}))\b",
        r"\bat\s+(\d{1,2})\b",
    ]

    for pattern in time_patterns:
        m = re.search(pattern, chunk, flags=re.IGNORECASE)
        if m:
            hour = int(m.group(1))
            minute = int(m.group(2)) if m.group(2) else 0

            meridian = None
            if len(m.groups()) >= 3 and m.group(3):
                meridian = m.group(3).upper()

            if hour > 24:
                continue

            if minute > 59:
                minute = 0

            return {
                "display": format_time(hour, minute, meridian),
                "match_text": m.group(0),
            }

    return None


def clean_task_text(chunk: str, matched_time_text: Optional[str]):
    """
    Remove time expressions and clean task wording.
    """
    text = chunk.strip()

    if matched_time_text:
        text = re.sub(re.escape(matched_time_text), "", text, flags=re.IGNORECASE)

    # Remove leading filler words
    text = re.sub(r"^(and|then|also)\s+", "", text, flags=re.IGNORECASE)

    # Remove trailing punctuation
    text = re.sub(r"[.,]+$", "", text).strip()

    # Normalize spaces
    text = re.sub(r"\s+", " ", text).strip()

    # Capitalize first letter
    if text:
        text = text[0].upper() + text[1:]

    return text


def split_into_action_chunks(text: str):
    """
    Smart split logic:
    1) Split by natural separators: commas, and, then, periods
    2) If a part still contains multiple action verbs, split by each action start
    """
    rough_parts = re.split(
        r"\s*(?:,|\band\b|\bthen\b|[.])\s*",
        text,
        flags=re.IGNORECASE
    )

    rough_parts = [p.strip() for p in rough_parts if p.strip()]
    final_chunks = []

    for part in rough_parts:
        matches = list(re.finditer(ACTION_PATTERN, part, flags=re.IGNORECASE))

        if len(matches) <= 1:
            final_chunks.append(part)
            continue

        starts = [m.start() for m in matches] + [len(part)]

        for i in range(len(starts) - 1):
            chunk = part[starts[i]:starts[i + 1]].strip()
            if chunk:
                final_chunks.append(chunk)

    return final_chunks


def build_tasks(transcript: str):
    """
    Main extraction logic
    Returns:
    - tasks (list of dicts)
    - reminder (first detected time)
    """
    text = normalize_text(transcript)

    if not text:
        return [], "No reminder detected"

    chunks = split_into_action_chunks(text)

    tasks = []
    reminder = "No reminder detected"

    for chunk in chunks:
        time_info = extract_time_from_chunk(chunk)

        time_display = None
        matched_time_text = None

        if time_info:
            time_display = time_info["display"]
            matched_time_text = time_info["match_text"]

            if reminder == "No reminder detected":
                reminder = time_display

        task_text = clean_task_text(chunk, matched_time_text)

        # Skip empty or meaningless chunks
        if not task_text:
            continue

        if len(task_text) == 1:
            continue

        tasks.append({
            "text": task_text,
            "time": time_display,
            "done": False
        })

    return tasks, reminder


# -----------------------------
# Routes
# -----------------------------
@app.get("/")
def home():
    return {"message": "Voice2Task backend is running 🚀"}


@app.post("/extract-tasks")
def extract_tasks(data: TranscriptInput):
    tasks, reminder = build_tasks(data.transcript)

    return {
        "transcript": data.transcript,
        "tasks": tasks,
        "reminder": reminder,
        "total": len(tasks),
        "done": 0,
        "pending": len(tasks),
    }