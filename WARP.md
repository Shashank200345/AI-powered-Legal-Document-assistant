# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is **LexiPlain** - a legal AI document analyzer that transforms legal documents into plain English. The application is a modern React SPA built with Vite, TypeScript, and Tailwind CSS, featuring a sophisticated UI component system based on shadcn/ui.

## Development Commands

### Frontend Development (in root directory)
```bash
# Start frontend development server (runs on localhost:8080)
pnpm dev

# Build frontend for production
pnpm build

# Preview production build
pnpm preview

# Run frontend tests
pnpm test

# Type checking
pnpm typecheck

# Format code
pnpm format.fix
```

### Backend Development (in server/ directory)
```bash
# Navigate to backend
cd server

# Install backend dependencies
pnpm install

# Start backend development server (runs on localhost:3001)
pnpm dev

# Start backend in production
pnpm start
```

### Full Stack Development
```bash
# Terminal 1: Start backend
cd server && pnpm dev

# Terminal 2: Start frontend (in new terminal from root)
pnpm dev
```

### Package Management
This project uses **pnpm** as the package manager for both frontend and backend. Always use `pnpm` commands instead of npm/yarn.

## Architecture Overview

### Application Structure
- **Entry Point**: `index.html` → `client/App.tsx`
- **Source Root**: All source code is in the `client/` directory
- **Routing**: React Router v6 with file-based page organization
- **State Management**: TanStack Query for server state, React hooks for local state
- **Styling**: Tailwind CSS with custom design system and glassmorphism effects

### Key Directories
```
client/
├── pages/          # Route components (Index, Demo, Pricing, etc.)
├── components/     # Reusable UI components
│   ├── ui/         # shadcn/ui component library
│   └── ...         # Custom components (Navbar, Footer, FloatingCards, etc.)
├── hooks/          # Custom React hooks
├── lib/            # Utilities and helper functions
└── global.css      # Global styles and CSS custom properties
```

### Tech Stack Details
- **Frontend**: React 18 + TypeScript + Vite
- **UI Library**: shadcn/ui (Radix UI primitives + Tailwind)
- **Styling**: Tailwind CSS with custom design tokens
- **3D Graphics**: Three.js with React Three Fiber (@react-three/fiber, @react-three/drei)
- **Forms**: React Hook Form with validation
- **Theme**: next-themes for dark/light mode
- **Animations**: Framer Motion + CSS animations

### Design System
The app uses a sophisticated glassmorphism design with:
- Custom CSS classes: `.glass`, `.glass-soft`, `.glass-elevated`
- Gradient backgrounds and backdrop blur effects
- Custom animations: shimmer, float, fadein
- Comprehensive color system with CSS custom properties for theming

### Component Architecture
- **Shell Component**: Provides consistent layout with gradient background and grid overlay
- **Route Pages**: Each major section is a separate page component
- **UI Components**: Extensive shadcn/ui library with customizations
- **Custom Components**: Specialized components like FloatingCards, ThemeToggle

### Path Aliases
The project uses TypeScript path mapping:
- `@/*` → `./client/*` (configured in both vite.config.ts and tsconfig.json)

## Development Notes

### TypeScript Configuration
- Strict mode is **disabled** for faster development
- Module resolution uses "bundler" mode for Vite compatibility
- JSX runtime is set to "react-jsx" (no React import needed)

### Styling Approach
- Utility-first with Tailwind CSS
- Custom design tokens in `tailwind.config.ts`
- Glassmorphism effects via custom CSS classes
- Dark mode support with `next-themes`
- All content sources from `client/**/*.{ts,tsx}`

### Testing
- Vitest is configured for unit testing
- Example test exists in `client/lib/utils.spec.ts`
- Run tests with `pnpm test`

### Build Configuration
- Development server runs on port 8080 with host "::" (all interfaces)
- File system access restricted to `./client`
- Build output goes to `dist/`
- SWC used for fast React compilation

## Backend Architecture

### Tech Stack
- **Runtime**: Node.js 18+ with ES modules
- **Framework**: Express.js with TypeScript-style organization
- **AI/ML**: Google Cloud Vertex AI (Gemini 1.5 Pro), Vision API, Speech APIs
- **Database**: Google Firestore (NoSQL document store)
- **Storage**: Google Cloud Storage for file uploads
- **Real-time**: Socket.IO for live processing updates
- **NLP Libraries**: Natural, Compromise, Sentiment analysis

### Key Services

#### Document Processing (`documentProcessor.js`)
- Multi-format support: PDF, Word, images (JPEG, PNG, GIF, BMP), plain text
- OCR integration with Google Vision API for scanned documents
- Image optimization with Sharp for better OCR accuracy
- Fallback processing for corrupted or complex files

#### AI Analysis (`aiAnalyzer.js`)
- Legal clause detection with pattern matching and NLP
- Risk assessment (critical/high/medium/low) across financial, compliance, operational categories  
- Plain language translation using Vertex AI Gemini
- Key insights extraction: parties, dates, amounts, obligations, rights
- RAG-ready architecture with document chunking and context preservation

#### Voice Interface (`voiceService.js`)
- Speech-to-text using Google Cloud Speech API
- Text-to-speech with Google Cloud TTS (neural voices)
- Contextual conversation system with session management
- Document-aware query processing with clause references
- Multi-turn conversation support with history

#### Google Cloud Integration (`googleCloud.js`)
- Unified service initialization and connection management
- Vertex AI model management with configurable parameters
- Firestore operations for analysis storage and retrieval
- Cloud Storage for document archival with public URLs
- Error handling and service health monitoring

### API Architecture
- **Documents**: `/api/documents/*` - Upload, processing, batch operations
- **Analysis**: `/api/analysis/*` - AI analysis, queries, risk assessment, export
- **Voice**: `/api/voice/*` - Speech processing, TTS/STT, conversation history
- **Health**: `/api/health/*` - System monitoring, metrics, readiness probes

### Real-time Features
- Socket.IO events for processing progress
- Room-based subscriptions (document, analysis, voice sessions)
- Live system metrics broadcasting
- Connection health monitoring with ping/pong

### Security & Performance
- Rate limiting (100 requests/15min window)
- File upload validation and size limits (50MB documents, 10MB audio)
- CORS configuration for frontend integration
- Comprehensive error handling and logging with Winston
- Memory-efficient streaming for large file processing

## Environment Setup

### Required Google Cloud APIs
1. Vertex AI API - For LLM and embeddings
2. Cloud Vision API - For OCR and document analysis  
3. Cloud Speech-to-Text API - For voice queries
4. Cloud Text-to-Speech API - For audio responses
5. Firestore API - For analysis storage
6. Cloud Storage API - For document storage

### Service Account Permissions
- Vertex AI User
- Cloud Vision User  
- Cloud Speech Client
- Cloud Text-to-Speech Client
- Firestore User
- Storage Object Admin

### Environment Variables
Copy `server/.env.example` to `server/.env` and configure:
- Google Cloud project ID and credentials path
- API keys and service configuration
- Security settings and CORS origins
- Model parameters and processing limits

## Project Context

This is **LexiPlain** - a legal tech application that transforms legal documents into plain English using cutting-edge AI:

### Core Features
- **Multi-format Document Processing**: PDF, Word, images, text with OCR
- **AI-Powered Legal Analysis**: Clause detection, risk scoring, plain language translation
- **Voice-Powered Queries**: "What happens if I break this lease early?"
- **Real-time Processing**: Live updates via Socket.IO
- **Enterprise Security**: Rate limiting, validation, audit logging

### Unique Value Proposition
- **Multimodal AI**: Combines document processing, NLP, and voice interfaces
- **Legal Domain Expertise**: Specialized patterns for contracts, terms, policies
- **RAG Architecture**: Ready for vector search and document retrieval
- **Production Ready**: Comprehensive error handling, monitoring, and scaling

### Demo Flow (60-second wow factor)
1. Upload complex rental agreement (PDF)
2. Watch real-time AI processing with progress indicators
3. Explore risk scores and plain English explanations  
4. Ask voice question: "What's my security deposit?"
5. Get instant audio response with clause references
6. Export shareable PDF summary

The system emphasizes trust, accuracy, and professional legal analysis while maintaining accessibility for non-lawyers.
