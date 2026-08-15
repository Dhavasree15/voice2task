# Voice2Task 🎙️✨

> Speak once. Plan everything.

Voice2Task is an AI-powered productivity web application that converts natural voice input into structured tasks, schedules, and reminders.

Instead of manually writing down everything you need to do, simply speak naturally. Voice2Task processes the transcript using AI, identifies actionable tasks and associated times, and organizes them into a clean smart to-do list.

The application also uses Supabase authentication and database storage so each user's tasks and productivity data can be persisted securely.

---

## ✨ Features

### 🎙️ Voice Capture
Record your thoughts, plans, and reminders using natural voice input.

### 📝 Live Transcript
Convert spoken input into readable text before task extraction.

### 🧠 AI Task Extraction
The AI analyzes the transcript and identifies actionable tasks from natural language.

### ⏰ Intelligent Time Detection
Detects time information such as:

- 5 PM
- 7:30 PM
- tomorrow morning
- from 5 to 6 PM
- at 9 PM

and associates detected times with the relevant tasks.

### ✅ Smart To-Do List
Extracted tasks are displayed as structured to-do items with:

- Task name
- Time
- Completion status
- Pending status

### 🔐 User Authentication
Users can create an account and sign in using Supabase Authentication.

### 🗄️ Persistent Database Storage
Tasks and user-related productivity data are stored in Supabase so that data is not lost when the page is refreshed or reopened.

### 👤 User-Specific Data
Each authenticated user can access their own tasks and productivity data.

### 🌐 Full-Stack Architecture

The application follows a modern frontend-backend architecture:

```text
User
  │
  ▼
React + Vite Frontend
  │
  ├──────────────► Supabase Auth
  │
  ├──────────────► Supabase Database
  │
  ▼
FastAPI Backend
  │
  ▼
Google Gemini API
  │
  ▼
Structured Tasks

# 🛠️ Tech Stack

### 🎨 Frontend

- React.js
- Vite
- JavaScript (ES6+)
- CSS3
- React Router
- Web Speech API
- Supabase JavaScript Client

### ⚙️ Backend

- Python
- FastAPI
- Uvicorn
- Python-dotenv
- REST API

### 🧠 AI / NLP

- Google Gemini API
- Natural Language Processing
- AI-powered task extraction
- Natural-language time and reminder detection

### 🔐 Authentication & Database

- Supabase Authentication
- Supabase PostgreSQL Database
- Row Level Security (RLS)
- User-specific data storage

### 🔧 Development & Version Control

- Git
- GitHub
- VS Code
- npm
- Python Virtual Environment

### 🚀 Deployment

- Vercel — Frontend
- Render — Backend
- Supabase — Authentication & Database