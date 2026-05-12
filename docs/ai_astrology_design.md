# Design Document: Grounded AI Astrology Inference

**Author**: Antigravity AI
**Date**: 2026-05-11
**Status**: Draft (Planning Mode)

## 1. Overview
The goal of this project is to integrate a sophisticated, grounded AI inference engine into the AstroUnified platform. Unlike general-purpose AI, this system will act as a **Grounded Expert Librarian**, providing astrological interpretations that are strictly anchored in specific source materials (PDFs, scans, and existing markdown content).

## 2. User Stories

### 2.1 The Informed User
*   **Story**: As a user, I want to ask detailed questions about my career prospects based on my current Dasha.
*   **Requirement**: The AI must analyze the user's `Dashaflow` JSON and cross-reference it with the relevant chapters in the reference books.

### 2.2 The Trust-Oriented User
*   **Story**: As a user, I want to see the exact sloka or passage the AI is citing.
*   **Requirement**: Every response must include citations with page numbers or book titles.

### 2.3 The Content Owner
*   **Story**: As the site owner, I want the AI to stay silent if the answer isn't in my provided materials.
*   **Requirement**: A strict "Negative Prompting" strategy to prevent hallucinations or use of general training data.

## 3. Technical Design

### 3.1 Inference Engine
*   **Primary Model**: Gemini 1.5 Flash (via Google AI Studio).
*   **Secondary Model**: Gemini 1.5 Pro (for complex multimodal/image tasks).
*   **Reasoning**: Gemini's 2M token context window allows for "In-Context Learning" with entire books, eliminating the need for a complex external Vector Database (RAG).

### 3.2 Knowledge Retrieval (The "Librarian" Logic)
The system will use a **Hybrid Retrieval** approach:
1.  **Context Caching**: The "Core Library" (thousands of pages) is cached in Gemini's infrastructure for low-latency, low-cost access.
2.  **Factor-Based Injection**: For a specific query, the system identifies the relevant 10–50 pages from the library and injects them into the prompt.

### 3.3 Prompt Engineering
The system prompt will enforce a strict "Consultant" persona:
*   **Input**: User Query + Chart JSON + Reference Snippets.
*   **Instructions**: "Use ONLY the provided snippets. Cite your sources. Use a formal yet encouraging tone."
*   **Output**: Structured JSON for the UI to parse.

### 3.4 Vercel Deployment & Concurrency
*   **Architecture**: Stateless API routes in Next.js.
*   **Performance**: Streaming responses (Vercel Edge Functions) to provide instant feedback.
*   **Scaling**: Handled by Vercel's serverless infrastructure and Google's Gemini API scaling.

## 4. UI/UX: AstroChat
*   **Interface**: A sliding drawer interface that doesn't disrupt the main dashboard.
*   **Feedback**: Progress markers showing the AI's internal steps (e.g., "Consulting BPHS...", "Analyzing Jupiter...").
*   **Citations**: Footnotes that reveal the source text when hovered or clicked.

## 5. Token & Cost Estimates
*   **Input**: 500 (Chart) + 30,000 (Reference Pages) + 100 (Query) = ~31,000 tokens.
*   **Cost (Flash)**: ~$0.0025 per query.
*   **Cost (Pro)**: ~$0.11 per query.
*   **Setup Cost**: $0.00 (using Google AI Studio Free Tier).

## 6. Security & Safety
*   **API Security**: All keys stored in Vercel Environment Variables.
*   **Data Privacy**: User charts are processed in memory and never stored in the AI's permanent training data.
