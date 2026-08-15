from typing import List, Optional
import os
import re

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from google import genai
from google.genai import types


# ============================================================
# ENVIRONMENT
# ============================================================

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is missing. "
        "Create backend/.env and add your Gemini API key."
    )


# ============================================================
# GEMINI CLIENT
# ============================================================

client = genai.Client(
    api_key=GEMINI_API_KEY
)

MODEL_NAME = "gemini-3.6-flash"


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="Voice2Task API",
    version="3.1.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# REQUEST MODEL
# ============================================================

class TranscriptRequest(BaseModel):
    transcript: Optional[str] = None
    text: Optional[str] = None


# ============================================================
# GEMINI OUTPUT MODELS
# ============================================================

class ExtractedTask(BaseModel):

    task: str = Field(
        description=(
            "Short, clear, actionable task name. "
            "Never return only a time, number, AM, PM, "
            "or punctuation."
        )
    )

    start_time: Optional[str] = Field(
        default=None,
        description=(
            "Start time associated with this task. "
            "Normalize to H:MM AM/PM. "
            "Use null only when the time cannot be determined."
        )
    )

    end_time: Optional[str] = Field(
        default=None,
        description=(
            "End time associated with this task. "
            "Normalize to H:MM AM/PM. "
            "Use null when there is no end time."
        )
    )


class ExtractionResult(BaseModel):

    tasks: List[ExtractedTask] = Field(
        description=(
            "Every distinct actionable task from the transcript."
        )
    )


# ============================================================
# TRANSCRIPT CLEANUP
# ============================================================

def clean_transcript(text: str) -> str:

    text = text.strip()

    # Remove repeated spaces
    text = re.sub(r"\s+", " ", text)

    replacements = {
        "p. m.": "PM",
        "p.m.": "PM",
        "p m": "PM",
        "P.M.": "PM",
        "P. M.": "PM",

        "a. m.": "AM",
        "a.m.": "AM",
        "a m": "AM",
        "A.M.": "AM",
        "A. M.": "AM",
    }

    for old, new in replacements.items():
        text = text.replace(old, new)

    return text


# ============================================================
# TIME NORMALIZATION
# ============================================================

def normalize_time(value: Optional[str]) -> Optional[str]:

    if not value:
        return None

    value = value.strip().upper()

    # Valid:
    # 5 PM
    # 5:00 PM
    # 12 PM
    # 12:30 AM

    match = re.fullmatch(
        r"(1[0-2]|[1-9])"
        r"(?::([0-5][0-9]))?"
        r"\s*(AM|PM)",
        value
    )

    if not match:
        return None

    hour = match.group(1)

    minute = match.group(2)

    if minute is None:
        minute = "00"

    meridian = match.group(3)

    return f"{hour}:{minute} {meridian}"


# ============================================================
# REMOVE BAD TASKS
# ============================================================

def clean_tasks(
    result: ExtractionResult
) -> ExtractionResult:

    cleaned_tasks = []

    bad_tasks = {
        "",
        "am",
        "pm",
        "a.m.",
        "p.m.",
        "time",
        "reminder",
        "none",
        "null",
        "unknown",
    }

    for item in result.tasks:

        task_text = item.task.strip()

        if not task_text:
            continue

        # Remove bullets
        task_text = re.sub(
            r"^[\-\*\•\s]+",
            "",
            task_text
        )

        task_text = task_text.strip(" .,-")

        if not task_text:
            continue

        # Ignore obvious junk
        if task_text.lower() in bad_tasks:
            continue

        # Don't allow time-only tasks
        if re.fullmatch(
            r"(?:1[0-2]|[1-9])"
            r"(?::[0-5][0-9])?"
            r"\s*(?:AM|PM)",
            task_text,
            re.IGNORECASE
        ):
            continue

        # Don't allow things such as:
        # 627 PM
        # 56 PM
        # 999 AM
        if re.fullmatch(
            r"\d+\s*(?:AM|PM)",
            task_text,
            re.IGNORECASE
        ):
            continue

        # ----------------------------------------------------
        # IMPORTANT:
        #
        # We DO NOT compare the model's normalized time with
        # the literal transcript anymore.
        #
        # Therefore:
        #
        # "5 to 6 PM"
        #
        # can correctly become:
        #
        # 5:00 PM -> 6:00 PM
        #
        # without getting thrown away.
        # ----------------------------------------------------

        start = normalize_time(
            item.start_time
        )

        end = normalize_time(
            item.end_time
        )

        cleaned_tasks.append(
            ExtractedTask(
                task=task_text,
                start_time=start,
                end_time=end
            )
        )

    result.tasks = cleaned_tasks

    return result


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():

    return {
        "message": "Voice2Task backend is running",
        "ai": "Gemini",
        "model": MODEL_NAME
    }


# ============================================================
# HEALTH
# ============================================================

@app.get("/health")
def health():

    return {
        "status": "ok",
        "gemini": True,
        "model": MODEL_NAME
    }


# ============================================================
# GEMINI PROMPT
# ============================================================

TASK_PROMPT = """
You are the task extraction engine for Voice2Task.

Convert the user's spoken transcript into a clean list of
separate actionable tasks.

============================================================
MAIN GOAL
============================================================

Extract EVERY distinct task.

Keep the time associated with EVERY task whenever the
transcript gives enough information to determine it.

Do NOT unnecessarily remove times.

============================================================
TASK SEPARATION
============================================================

Every separate action must become its own task.

Example:

"call mentor at 7 PM and practice DSA from 8 to 9 PM"

Return:

Task 1:
task = "Call mentor"
start_time = "7:00 PM"
end_time = null

Task 2:
task = "Practice DSA"
start_time = "8:00 PM"
end_time = "9:00 PM"

NEVER merge both into one task.

============================================================
TIME RULES
============================================================

Preserve the time associated with EVERY task whenever the
spoken wording gives enough information to determine it.

Example:

"practice DSA from 5 to 6 PM"

Return:

task = "Practice DSA"
start_time = "5:00 PM"
end_time = "6:00 PM"

IMPORTANT:

The transcript does NOT need to literally contain
"5:00 PM".

"5 to 6 PM" clearly means:

5:00 PM -> 6:00 PM

Normalize the time instead of removing it.

============================================================
SINGLE TIME
============================================================

Example:

"call mentor at 7 PM"

Return:

task = "Call mentor"
start_time = "7:00 PM"
end_time = null

============================================================
TIME RANGES
============================================================

Example:

"dinner from 8 PM to 9 PM"

Return:

task = "Dinner"
start_time = "8:00 PM"
end_time = "9:00 PM"

Example:

"CSE core concepts at 9 to 10"

If the surrounding schedule clearly establishes PM,
return:

task = "Study CSE core concepts"
start_time = "9:00 PM"
end_time = "10:00 PM"

Example:

"AI core concepts at 10 to 11"

Return:

task = "Study AI core concepts"
start_time = "10:00 PM"
end_time = "11:00 PM"

Example:

"placement preparation at 11 to 12"

If the surrounding schedule clearly establishes an evening
schedule, return:

task = "Placement preparation"
start_time = "11:00 PM"
end_time = "12:00 AM"

============================================================
SCHEDULE CONTEXT
============================================================

Once the user clearly establishes a time context, use that
context for nearby ranges when reasonable.

For example:

"call mentor at 5 PM, dinner at 7 to 8,
CSE concepts at 9 to 10"

means:

Call mentor -> 5:00 PM

Dinner -> 7:00 PM - 8:00 PM

CSE concepts -> 9:00 PM - 10:00 PM

Do NOT discard those ranges just because "PM" was only
spoken once.

============================================================
CRITICAL MALFORMED NUMBER RULE
============================================================

Do NOT interpret arbitrary numbers as times.

For example:

"627 PM"

must NOT automatically become:

"6:27 PM"

If a number is clearly malformed or ambiguous, use null.

IMPORTANT DISTINCTION:

VALID:

"5 to 6 PM"
-> 5:00 PM - 6:00 PM

VALID:

"9 to 10"
when surrounding context establishes PM
-> 9:00 PM - 10:00 PM

INVALID:

"627 PM"
-> null

Never convert 627 into 6:27 PM.

============================================================
TECHNICAL TERMS
============================================================

Preserve common technical terms correctly.

Examples:

DSA
AI
CSE
Python
Java
SQL
NLP

If speech recognition produces an obvious phonetic mistake
and the intended technical term is clear from context,
correct it.

Example:

"DSR" in a coding/placement context may mean "DSA".

============================================================
COMMON SPEECH RECOGNITION ERRORS
============================================================

The browser transcript may contain mistakes.

If the intended word is obvious from context, correct it.

Example:

"call Myntra at 5 PM"

If the context clearly means calling a mentor, use:

"Call mentor"

Do not randomly rewrite unclear words.

============================================================
TASK NAMES
============================================================

Task names must be short and actionable.

Good:

"Call mentor"

"Practice DSA"

"Dinner"

"Study CSE core concepts"

"Study AI core concepts"

"Placement preparation"

Bad:

"5 PM"

"PM"

"627 PM"

"at 5 PM"

============================================================
NO HALLUCINATION
============================================================

Never invent a task.

Never invent a person.

Never invent a date.

Never invent a time.

However, NORMALIZE clearly implied times.

For example:

"5 to 6 PM"

should NOT lose its timing.

If truly ambiguous, use null.

============================================================
FINAL OUTPUT
============================================================

Return ONLY structured JSON matching the provided schema.

Every task must contain:

task
start_time
end_time

Use null only when the time genuinely cannot be determined.
"""


# ============================================================
# EXTRACT TASKS
# ============================================================

@app.post("/extract-tasks")
async def extract_tasks(
    request: TranscriptRequest
):

    transcript = (
        request.transcript
        or request.text
    )

    if not transcript:

        raise HTTPException(
            status_code=400,
            detail="Transcript is required."
        )

    transcript = clean_transcript(
        transcript
    )

    if not transcript:

        raise HTTPException(
            status_code=400,
            detail="Transcript is empty."
        )

    print()
    print("=" * 60)
    print("VOICE2TASK EXTRACTION")
    print("=" * 60)
    print("Transcript:")
    print(transcript)
    print("=" * 60)
    print()

    try:

        # ----------------------------------------------------
        # GEMINI
        # ----------------------------------------------------

        response = client.models.generate_content(

            model=MODEL_NAME,

            contents=[
                TASK_PROMPT,
                transcript
            ],

            config=types.GenerateContentConfig(

                response_mime_type="application/json",

                response_schema=ExtractionResult,

                max_output_tokens=4096
            )
        )

        if not response.text:

            raise HTTPException(
                status_code=500,
                detail="Gemini returned an empty response."
            )

        print()
        print("=" * 60)
        print("GEMINI RAW RESPONSE")
        print("=" * 60)
        print(response.text)
        print("=" * 60)
        print()

        # ----------------------------------------------------
        # PARSE
        # ----------------------------------------------------

        result = ExtractionResult.model_validate_json(
            response.text
        )

        # ----------------------------------------------------
        # CLEAN
        # ----------------------------------------------------

        result = clean_tasks(
            result
        )

        # ----------------------------------------------------
        # FRONTEND RESPONSE
        # ----------------------------------------------------

        frontend_tasks = []

        for item in result.tasks:

            start = item.start_time
            end = item.end_time

            # -----------------------------------------------
            # Display time
            # -----------------------------------------------

            if start and end:

                display_time = (
                    f"{start} - {end}"
                )

            elif start:

                display_time = start

            elif end:

                display_time = end

            else:

                display_time = None

            frontend_tasks.append(
                {
                    # Main field
                    "task": item.task,

                    # Compatibility fields
                    "title": item.task,
                    "text": item.task,
                    "description": item.task,
                    "name": item.task,
                    "content": item.task,

                    # Timing
                    "start_time": start,
                    "end_time": end,
                    "time": display_time,

                    # Frontend checkbox state
                    "completed": False
                }
            )

        # ----------------------------------------------------
        # REMINDER
        #
        # First task that has a valid start time.
        # ----------------------------------------------------

        reminder = None

        for item in frontend_tasks:

            if item["start_time"]:

                reminder = item["start_time"]

                break

        # ----------------------------------------------------
        # FINAL RESPONSE
        # ----------------------------------------------------

        return {
            "tasks": frontend_tasks,

            "reminder": reminder,

            "detected_reminder": reminder,

            "transcript": transcript
        }

    except HTTPException:

        raise

    except Exception as error:

        print()
        print("=" * 60)
        print("GEMINI EXTRACTION ERROR")
        print("=" * 60)
        print(repr(error))
        print("=" * 60)
        print()

        raise HTTPException(
            status_code=500,
            detail="AI task extraction failed."
        )


# ============================================================
# RUN:
#
# python -m uvicorn main:app --reload
#
# ============================================================