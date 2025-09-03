# LexiPlain API Requirements & Cloud Platform Setup

## 🚀 Complete Guide to Deploy Your Fully-Fledged Legal AI Website

This document provides all the APIs, keys, and cloud platform configurations needed to transform LexiPlain from a demo into a production-ready legal AI platform.

---

## 📋 Required Google Cloud APIs

### 1. **Vertex AI API** - Core LLM & Embeddings
- **Purpose**: Powers Gemini 1.5 Pro for legal analysis, plain language translation, and contextual responses
- **Enable Command**: `gcloud services enable aiplatform.googleapis.com`
- **Key Features Used**:
  - Document summarization and analysis
  - Plain language translation of legal jargon
  - Contextual Q&A with document awareness
  - Embedding generation for RAG functionality

### 2. **Cloud Vision API** - OCR & Document Processing
- **Purpose**: Extracts text from PDFs, images, and scanned documents
- **Enable Command**: `gcloud services enable vision.googleapis.com`
- **Key Features Used**:
  - Text detection from images
  - Document text detection with layout analysis
  - Handwriting recognition
  - PDF processing with OCR fallback

### 3. **Cloud Speech-to-Text API** - Voice Queries
- **Purpose**: Converts user voice queries to text for document analysis
- **Enable Command**: `gcloud services enable speech.googleapis.com`
- **Key Features Used**:
  - Real-time speech recognition
  - Multiple language support (12+ languages)
  - Enhanced models for better accuracy
  - Word-level timestamps and confidence scores

### 4. **Cloud Text-to-Speech API** - Audio Responses
- **Purpose**: Generates natural-sounding audio responses
- **Enable Command**: `gcloud services enable texttospeech.googleapis.com`
- **Key Features Used**:
  - Neural voice synthesis
  - Multiple voice options and languages
  - SSML support for enhanced speech
  - High-quality audio output (MP3/WAV)

### 5. **Firestore API** - Document Storage & Analysis
- **Purpose**: Stores document analyses, user sessions, and conversation history
- **Enable Command**: `gcloud services enable firestore.googleapis.com`
- **Key Features Used**:
  - Real-time document database
  - Automatic scaling
  - Offline support
  - Complex queries and indexing

### 6. **Cloud Storage API** - File Management
- **Purpose**: Stores uploaded documents and generated content
- **Enable Command**: `gcloud services enable storage.googleapis.com`
- **Key Features Used**:
  - Secure file uploads
  - Public URL generation
  - Lifecycle management
  - CDN integration ready

---

## 🔐 Required Service Account Permissions

Create a service account with these specific roles:

```bash
# Create service account
gcloud iam service-accounts create lexiplain-ai-service \
  --description="LexiPlain AI Legal Analyzer Service Account" \
  --display-name="LexiPlain AI Service"

# Assign required permissions
gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:lexiplain-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:lexiplain-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/vision.annotator"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:lexiplain-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/speech.client"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:lexiplain-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/texttospeech.client"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:lexiplain-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/datastore.user"

gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
  --member="serviceAccount:lexiplain-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Download service account key
gcloud iam service-accounts keys create ./server/keys/service-account-key.json \
  --iam-account=lexiplain-ai-service@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

---

## 🌐 Cloud Platform Infrastructure

### **Google Cloud Platform Setup**

#### 1. **Project Configuration**
```bash
# Create project (if needed)
gcloud projects create lexiplain-production --name="LexiPlain Production"
gcloud config set project lexiplain-production

# Enable billing
gcloud billing accounts list
gcloud billing projects link lexiplain-production --billing-account=YOUR_BILLING_ACCOUNT_ID
```

#### 2. **Firestore Database**
```bash
# Create Firestore database
gcloud firestore databases create --region=us-central1 --type=firestore-native
```

#### 3. **Cloud Storage Buckets**
```bash
# Create buckets for different purposes
gsutil mb -l us-central1 gs://lexiplain-documents-prod
gsutil mb -l us-central1 gs://lexiplain-exports-prod
gsutil mb -l us-central1 gs://lexiplain-backups-prod

# Set appropriate permissions
gsutil iam ch allUsers:objectViewer gs://lexiplain-documents-prod
```

#### 4. **Vertex AI Setup**
```bash
# Initialize Vertex AI
gcloud ai models list --region=us-central1
```

### **Additional Infrastructure (Optional but Recommended)**

#### **Cloud CDN** - For Global Performance
```bash
# Enable Cloud CDN for faster document delivery
gcloud services enable compute.googleapis.com
```

#### **Cloud Load Balancing** - For High Availability
```bash
# For production deployment with multiple instances
gcloud services enable cloudloadbalancing.googleapis.com
```

#### **Cloud Armor** - For Security
```bash
# DDoS protection and security policies
gcloud services enable cloudarmorapi.googleapis.com
```

---

## 💰 Cost Estimation & Optimization

### **Monthly Cost Breakdown (Estimated)**

| Service | Usage Estimate | Monthly Cost |
|---------|----------------|--------------|
| **Vertex AI (Gemini Pro)** | 10K requests | $100-300 |
| **Vision API** | 5K images | $15-30 |
| **Speech-to-Text** | 100 hours | $144 |
| **Text-to-Speech** | 50K characters | $20 |
| **Firestore** | 10GB + 1M operations | $25 |
| **Cloud Storage** | 100GB | $5 |
| **Networking** | 1TB egress | $120 |
| **Total Estimated** | | **$429-644/month** |

### **Cost Optimization Strategies**

1. **Implement Caching**
   - Cache analysis results for 24 hours
   - Use Redis for frequently accessed data
   - Implement client-side caching

2. **Usage Quotas & Limits**
   - Set daily/monthly spending limits
   - Implement rate limiting per user
   - Use cheaper models for simple tasks

3. **Efficient Model Usage**
   - Use appropriate model sizes
   - Batch similar requests
   - Implement request deduplication

---

## 🔒 Security & Compliance Requirements

### **Essential Security Measures**

1. **API Key Protection**
   - Use Google Secret Manager for production
   - Implement proper CORS policies
   - Rate limiting and request validation

2. **Data Encryption**
   - Enable encryption at rest (Firestore/Storage)
   - Use HTTPS everywhere
   - Implement client-side encryption for sensitive docs

3. **Access Controls**
   - Implement user authentication
   - Role-based access control
   - Audit logging for all operations

4. **Compliance Considerations**
   - GDPR compliance for EU users
   - CCPA compliance for California users
   - SOC 2 compliance for enterprise clients

### **Environment Variables (Production)**
```env
# Google Cloud
GOOGLE_CLOUD_PROJECT_ID=lexiplain-production
GOOGLE_APPLICATION_CREDENTIALS=/app/keys/service-account-key.json

# Security
CORS_ORIGIN=https://yourdomain.com
API_SECRET_KEY=your-256-bit-secret-key
RATE_LIMIT_MAX_REQUESTS=1000

# Model Configuration
LEGAL_MODEL_NAME=gemini-1.5-pro
MAX_TOKENS=4096
TEMPERATURE=0.2

# Storage
STORAGE_BUCKET_NAME=lexiplain-documents-prod
```

---

## 📊 Monitoring & Analytics

### **Required Monitoring Setup**

1. **Google Cloud Monitoring**
   ```bash
   gcloud services enable monitoring.googleapis.com
   ```

2. **Cloud Logging**
   ```bash
   gcloud services enable logging.googleapis.com
   ```

3. **Error Reporting**
   ```bash
   gcloud services enable clouderrorreporting.googleapis.com
   ```

### **Key Metrics to Track**
- API response times
- Error rates by service
- Document processing success rate
- Voice query accuracy
- User engagement metrics
- Cost per analysis
- Storage usage trends

---

## 🚀 Deployment Options

### **Option 1: Google Cloud Run (Recommended)**
- Serverless container deployment
- Auto-scaling
- Pay-per-request pricing
- Easy CI/CD integration

### **Option 2: Google Kubernetes Engine (GKE)**
- Full container orchestration
- Advanced scaling options
- Better for complex microservices

### **Option 3: App Engine**
- Fully managed platform
- Zero server management
- Built-in services integration

---

## 🔧 Development to Production Checklist

### **Backend Requirements**
- [ ] Google Cloud APIs enabled
- [ ] Service account configured
- [ ] Environment variables set
- [ ] Database indexes created
- [ ] Storage buckets configured
- [ ] Monitoring set up

### **Frontend Requirements**
- [ ] API endpoints updated
- [ ] Error handling implemented
- [ ] Loading states added
- [ ] Mobile responsiveness tested
- [ ] Accessibility features added

### **Security Checklist**
- [ ] HTTPS enabled
- [ ] API keys secured
- [ ] Rate limiting implemented
- [ ] Input validation added
- [ ] CORS configured properly
- [ ] Security headers set

### **Performance Optimizations**
- [ ] Caching implemented
- [ ] Image optimization
- [ ] Code splitting
- [ ] CDN configured
- [ ] Database queries optimized

---

## 📞 Support & Resources

### **Google Cloud Support**
- Free tier: Community support
- Basic: $29/month
- Standard: $100/month (recommended for production)
- Enhanced: $500/month (for enterprise)

### **Useful Resources**
- [Google Cloud Console](https://console.cloud.google.com/)
- [Vertex AI Documentation](https://cloud.google.com/vertex-ai/docs)
- [Vision API Pricing](https://cloud.google.com/vision/pricing)
- [Speech API Documentation](https://cloud.google.com/speech-to-text/docs)
- [Firestore Pricing](https://cloud.google.com/firestore/pricing)

### **Development Tools**
- Google Cloud SDK
- Cloud Code for VS Code
- Cloud Shell Editor
- Firebase Console

---

## ⚡ Quick Start Command Summary

```bash
# 1. Enable all required APIs
gcloud services enable aiplatform.googleapis.com vision.googleapis.com speech.googleapis.com texttospeech.googleapis.com firestore.googleapis.com storage.googleapis.com

# 2. Create service account and download key
gcloud iam service-accounts create lexiplain-ai-service
# (Add permissions as shown above)

# 3. Create storage bucket
gsutil mb -l us-central1 gs://lexiplain-documents-prod

# 4. Create Firestore database
gcloud firestore databases create --region=us-central1

# 5. Deploy backend
cd server && gcloud run deploy lexiplain-backend --source .

# 6. Deploy frontend
cd client && npm run build && gcloud run deploy lexiplain-frontend --source .
```

This setup will give you a fully functional, production-ready legal AI platform with enterprise-grade capabilities. The total setup time is approximately 2-3 hours for an experienced developer, or 4-6 hours for someone new to Google Cloud Platform.

---

**🎉 Congratulations!** You now have everything needed to deploy a cutting-edge legal AI platform that can compete with enterprise solutions while maintaining the beautiful design and user experience you've built.
