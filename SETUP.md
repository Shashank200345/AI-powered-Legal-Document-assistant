# LexiPlain Setup Guide

This guide will help you set up the complete LexiPlain system with Google Cloud services and API integrations.

## Prerequisites

- Node.js 18+ installed
- pnpm package manager
- Google Cloud Project with billing enabled
- Google Cloud SDK (gcloud CLI)

## Google Cloud Setup

### 1. Create Google Cloud Project
```bash
# Create new project
gcloud projects create lexiplain-demo --name="LexiPlain Demo"

# Set as default project
gcloud config set project lexiplain-demo
```

### 2. Enable Required APIs
```bash
# Enable all required APIs
gcloud services enable \
  aiplatform.googleapis.com \
  vision.googleapis.com \
  speech.googleapis.com \
  texttospeech.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com
```

### 3. Create Service Account
```bash
# Create service account
gcloud iam service-accounts create lexiplain-service \
  --description="LexiPlain AI Service Account" \
  --display-name="LexiPlain Service"

# Grant required permissions
gcloud projects add-iam-policy-binding lexiplain-demo \
  --member="serviceAccount:lexiplain-service@lexiplain-demo.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding lexiplain-demo \
  --member="serviceAccount:lexiplain-service@lexiplain-demo.iam.gserviceaccount.com" \
  --role="roles/vision.annotator"

gcloud projects add-iam-policy-binding lexiplain-demo \
  --member="serviceAccount:lexiplain-service@lexiplain-demo.iam.gserviceaccount.com" \
  --role="roles/speech.client"

gcloud projects add-iam-policy-binding lexiplain-demo \
  --member="serviceAccount:lexiplain-service@lexiplain-demo.iam.gserviceaccount.com" \
  --role="roles/texttospeech.client"

gcloud projects add-iam-policy-binding lexiplain-demo \
  --member="serviceAccount:lexiplain-service@lexiplain-demo.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding lexiplain-demo \
  --member="serviceAccount:lexiplain-service@lexiplain-demo.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Download service account key
gcloud iam service-accounts keys create ./server/keys/service-account-key.json \
  --iam-account=lexiplain-service@lexiplain-demo.iam.gserviceaccount.com
```

### 4. Create Firestore Database
```bash
# Create Firestore database in native mode
gcloud firestore databases create --region=us-central1 --type=firestore-native
```

### 5. Create Cloud Storage Bucket
```bash
# Create storage bucket for documents
gsutil mb -l us-central1 gs://lexiplain-documents-bucket

# Set public access (for demo purposes)
gsutil iam ch allUsers:objectViewer gs://lexiplain-documents-bucket
```

## Application Setup

### 1. Install Dependencies
```bash
# Frontend
pnpm install

# Backend
cd server
pnpm install
```

### 2. Configure Environment Variables
```bash
# Copy template
cp server/.env.example server/.env
```

Edit `server/.env` with your values:
```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Google Cloud Configuration (REPLACE WITH YOUR VALUES)
GOOGLE_CLOUD_PROJECT_ID=lexiplain-demo
GOOGLE_APPLICATION_CREDENTIALS=./keys/service-account-key.json

# Google Cloud Services
GCP_REGION=us-central1
VERTEX_AI_LOCATION=us-central1
FIRESTORE_DATABASE=(default)
STORAGE_BUCKET_NAME=lexiplain-documents-bucket

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload Limits
MAX_FILE_SIZE_MB=50
ALLOWED_FILE_TYPES=pdf,doc,docx,txt,jpg,jpeg,png

# Security
CORS_ORIGIN=http://localhost:8080
API_SECRET_KEY=your-secret-key-here

# Voice Interface
VOICE_LANGUAGE_CODE=en-US
TTS_VOICE_NAME=en-US-Neural2-D

# AI Model Configuration
LEGAL_MODEL_NAME=gemini-1.5-pro
EMBEDDING_MODEL=textembedding-gecko
MAX_TOKENS=4096
TEMPERATURE=0.3

# Demo Mode
ENABLE_DEMO_MODE=true
DEMO_DOCUMENTS_PATH=./demo-documents
```

### 3. Create Required Directories
```bash
# In server directory
mkdir -p logs keys demo-documents
```

## Development

### 1. Start Backend
```bash
cd server
pnpm dev
```
Backend runs at: http://localhost:3001

### 2. Start Frontend (in new terminal)
```bash
# From root directory
pnpm dev
```
Frontend runs at: http://localhost:8080

### 3. Test the Setup
Visit the health check endpoint: http://localhost:3001/api/health

You should see a response like:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "services": {
      "api": "operational",
      "database": "operational",
      "storage": "operational"
    }
  }
}
```

## API Testing

### 1. Test Document Upload
```bash
curl -X POST http://localhost:3001/api/documents/upload \
  -F "document=@./server/demo-documents/sample-rental-agreement.txt"
```

### 2. Test Analysis (replace DOCUMENT_ID with response from upload)
```bash
curl -X POST http://localhost:3001/api/analysis/DOCUMENT_ID/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Sample legal text for analysis...",
    "options": {
      "includeRiskAssessment": true,
      "generatePlainLanguage": true
    }
  }'
```

### 3. Test Voice Capabilities
```bash
curl http://localhost:3001/api/voice/capabilities
```

## Troubleshooting

### Common Issues

1. **Google Cloud Authentication Errors**
   - Verify service account key path is correct
   - Check that all required APIs are enabled
   - Ensure service account has proper permissions

2. **File Upload Errors**
   - Check file size limits in environment variables
   - Verify supported file types configuration
   - Ensure storage bucket exists and is accessible

3. **Voice Service Errors**
   - Confirm Speech-to-Text and Text-to-Speech APIs are enabled
   - Check voice name configuration matches available voices
   - Verify audio file formats are supported

4. **Analysis Errors**
   - Ensure Vertex AI API is enabled
   - Check model name configuration
   - Verify quota limits haven't been exceeded

### Verification Commands
```bash
# Check Google Cloud project
gcloud config get-value project

# List enabled APIs
gcloud services list --enabled

# Test service account permissions
gcloud auth activate-service-account --key-file=./server/keys/service-account-key.json
gcloud auth list

# Check Firestore setup
gcloud firestore databases list

# Verify storage bucket
gsutil ls -b gs://lexiplain-documents-bucket
```

## Production Deployment

For production deployment:

1. Use environment-specific service accounts
2. Enable audit logging
3. Configure proper CORS origins
4. Set up load balancing for multiple instances
5. Enable Cloud Armor for DDoS protection
6. Use Cloud CDN for static assets
7. Implement proper secrets management with Secret Manager

## Cost Optimization

- Use Vertex AI quotas and limits appropriately
- Implement caching for frequently analyzed documents
- Optimize Cloud Storage lifecycle policies
- Monitor API usage with Cloud Monitoring
- Set up billing alerts

## Security Checklist

- [ ] Service account follows principle of least privilege
- [ ] API keys are not exposed in client-side code
- [ ] CORS is configured for production domains only
- [ ] Rate limiting is enabled and tuned appropriately
- [ ] File upload validation is in place
- [ ] Audit logging is enabled for sensitive operations
- [ ] HTTPS is enforced in production
- [ ] Input validation and sanitization is implemented

## Support

For issues with this setup:
1. Check the logs directory for error details
2. Verify Google Cloud service status
3. Test individual API endpoints with curl
4. Review the health check endpoints for service status

API Documentation: http://localhost:3001/api/health (when running)
