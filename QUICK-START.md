# Quick Start Guide

## ✅ Setup Complete!

Your Legal AI Document Analyzer is now set up. Here's what to do next:

### 1. Configure Google Cloud Services
- Update server/.env with your Google Cloud project details
- Add your service account key to server/keys/service-account-key.json
- Enable required APIs in Google Cloud Console

### 2. Start the Application
```bash
# Start both frontend and backend
pnpm dev

# Or start them separately:
# Terminal 1: Frontend
pnpm dev:frontend

# Terminal 2: Backend  
cd server && npm run dev
```

### 3. Access the Application
- Frontend: http://localhost:8080
- Backend API: http://localhost:3001/api
- Health Check: http://localhost:3001/api/health

### 4. Test the Integration
1. Open http://localhost:8080
2. Upload a document
3. Wait for analysis to complete
4. Try voice queries

### Need Help?
- See INTEGRATION-GUIDE.md for detailed instructions
- Run `node startup-check.js` to verify setup
- Check server logs in server/logs/ for troubleshooting

### File Structure
```
Legal-AI-Document-Analyser/
├── client/                 # Frontend React app
├── server/                # Backend Node.js app
│   ├── src/              # Source code
│   ├── keys/             # Google Cloud keys
│   ├── logs/             # Application logs
│   └── .env              # Backend environment
├── .env                  # Frontend environment
└── package.json          # Root package.json
```

🎉 Happy analyzing!