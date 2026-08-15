# Voice2Task

Voice2Task is an AI-powered productivity application that converts natural voice input into structured tasks and reminders.

The application allows users to record a voice note, extract actionable tasks using the Gemini API, identify associated timings, and manage the resulting tasks through a structured interface. User authentication and persistent task storage are handled through Supabase.

## Overview

Managing tasks from unstructured voice notes can be time-consuming. Voice2Task addresses this by transforming conversational input into actionable items without requiring users to manually format or organize their notes.

For example:

> "Tomorrow at 5 PM, call my mentor, finish the project presentation and submit the report before evening."

Voice2Task processes the input and converts it into structured tasks with their associated timings.

## Key Features

- Voice-based task capture
- Speech-to-text transcription
- AI-powered task extraction
- Natural-language time detection
- Structured task and reminder generation
- Task completion tracking
- User authentication
- Persistent database storage
- User-specific task management
- Responsive web interface

## Application Flow

```text
Voice Input
    ↓
Speech-to-Text
    ↓
Transcript
    ↓
FastAPI Backend
    ↓
Google Gemini API
    ↓
Task & Time Extraction
    ↓
Structured Task Data
    ↓
Supabase Database
    ↓
Task Management Interface