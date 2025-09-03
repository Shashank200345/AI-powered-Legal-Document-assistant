# LexiPlain Backend

A fully-fledged backend for the LexiPlain legal AI document analyzer, built with Node.js/Express and Google Cloud services (Vertex AI, Vision, Speech-to-Text, Text-to-Speech, Firestore, Cloud Storage). Includes OCR-based ingestion, AI/NLP analysis with clause detection and risk scoring, RAG-friendly structure, and a voice query interface.

## Prerequisites
- Node.js >= 18
- pnpm
- Google Cloud project with the following APIs enabled:
  - Vertex AI API
  - Cloud Vision API
  - Cloud Speech-to-Text API
  - Cloud Text-to-Speech API
  - Firestore (in Native mode)
  - Cloud Storage
- Service account JSON key with permissions for the above

## Setup
1. Copy env template and fill values
```bash
cp .env.example .env
```

2. Install dependencies
```bash
pnpm install
```

3. Run the server
```bash
pnpm dev
```
Server runs at http://localhost:3001

## API Overview
Base URL: `/api`

- Documents
  - POST `/documents/upload` — upload single document (field `document`)
  - POST `/documents/batch-upload` — upload multiple documents (field `documents[]` up to 5)
  - GET `/documents/:documentId/status` — processing status
  - POST `/documents/:documentId/reprocess` — reprocess placeholder
  - GET `/documents/supported-types` — supported formats and limits
  - GET `/documents/demo-samples` — sample demo descriptors

- Analysis
  - POST `/analysis/:documentId/analyze` — run analysis on extracted text
  - GET `/analysis/:documentId` — fetch stored analysis
  - POST `/analysis/:documentId/query` — ask a text question about the doc
  - GET `/analysis/:documentId/clauses` — list/filter clauses
  - GET `/analysis/:documentId/risks` — risk overview
  - POST `/analysis/:documentId/plain-language` — plain-English for section/clause
  - GET `/analysis/:documentId/export?format=json` — export results

- Voice
  - POST `/voice/:documentId/query` — upload `audio` and get spoken + text answer
  - POST `/voice/transcribe` — STT only for `audio`
  - POST `/voice/synthesize` — TTS from text
  - GET `/voice/:sessionId/history` — conversation history
  - DELETE `/voice/:sessionId/history` — clear history
  - GET `/voice/capabilities` — supported languages/voices
  - GET `/voice/stats` — system stats

- Health
  - GET `/health` — basic status
  - GET `/health/detailed` — services diagnostics
  - GET `/health/metrics` — runtime metrics
  - GET `/health/readiness` — readiness probe
  - GET `/health/liveness` — liveness probe

## Frontend Integration Notes
- Dev CORS origin defaults to `http://localhost:8080` (Vite dev server)
- Use Socket.IO events for live progress:
  - `document:processing:start|complete|error`
  - `document:batch:start|complete|error`
  - `analysis:start|complete|error`
  - `voice:processing:start|complete|error`

## RAG Readiness
- Analyses are stored in Firestore; add a vector DB later (e.g., Vertex Matching Engine) by storing embeddings from `textembedding-gecko`
- `aiAnalyzer` produces clause summaries and plain language — ideal chunk boundaries

## Security
- Rate limiting enabled
- Helmet and CORS configured
- Do not commit real secrets; use `.env`

## Deployment
- Serverless: deploy pieces to Cloud Functions/Run using the included `@google-cloud/functions-framework`
- Storage bucket required for original files


