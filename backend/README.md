# Family Finance MVP - Backend

FastAPI backend for receipt processing, transactions, and price tracking.

## Architecture

- **FastAPI**: REST API framework
- **Firebase**:
  - Firestore: Document database
  - Storage: Receipt images
  - Auth: User authentication
- **Gemini Vision**: AI receipt extraction
- **Cloud Run**: Deployment platform

## Setup

### Prerequisites

1. Python 3.11+
2. Firebase project with:
   - Firestore enabled
   - Storage enabled
   - Service account key downloaded
3. Gemini API key

### Installation

```bash
# Install dependencies
pip install -r requirements.txt

# Copy environment template
cp .env.example .env

# Edit .env with your credentials
# - FIREBASE_PROJECT_ID
# - FIREBASE_STORAGE_BUCKET
# - GOOGLE_APPLICATION_CREDENTIALS (path to service account key)
# - GEMINI_API_KEY
```

### Initialize Database

```bash
# Create initial household, categories, and account
python scripts/seed_data.py

# Note the household_id output
# Create a test user in Firebase Console and link to this household
```

### Deploy Firebase Rules & Indexes

```bash
# Deploy Firestore rules
firebase deploy --only firestore:rules

# Deploy Firestore indexes
firebase deploy --only firestore:indexes

# Deploy Storage rules
firebase deploy --only storage
```

## Running Locally

```bash
# Start development server
uvicorn app.main:app --reload --port 8080

# Or use the main.py directly
python -m app.main
```

Visit http://localhost:8080/health to verify.

## API Endpoints

### Receipts

- `POST /api/receipts` - Upload receipt image
- `GET /api/receipts/{id}` - Get receipt details
- `POST /api/receipts/{id}/confirm` - Confirm and create transaction
- `POST /api/receipts/{id}/reject` - Reject receipt

### Jobs (Internal)

- `POST /api/jobs/process-receipt-extraction` - Process uploaded receipts with AI

## Deployment

### Cloud Run

```bash
# Deploy to Cloud Run
gcloud run deploy family-finance-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars FIREBASE_PROJECT_ID=your-project-id \
  --set-secrets GEMINI_API_KEY=gemini-api-key:latest
```

### Cloud Scheduler (for extraction job)

```bash
# Create scheduled job to process receipts every 5 minutes
gcloud scheduler jobs create http receipt-extraction-job \
  --schedule="*/5 * * * *" \
  --uri="https://your-cloud-run-url/api/jobs/process-receipt-extraction" \
  --http-method=POST
```

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   │       ├── receipts.py      # Receipt endpoints
│   │       └── jobs.py           # Extraction worker
│   ├── core/
│   │   ├── config.py             # Settings
│   │   ├── firebase.py           # Firebase init
│   │   └── auth.py               # Auth middleware
│   ├── models/
│   │   └── firestore_schema.py   # Data models
│   ├── schemas/
│   │   └── receipt.py            # API schemas
│   ├── services/
│   │   ├── ai_extractor.py       # Gemini Vision
│   │   ├── storage.py            # Firebase Storage
│   │   ├── product_matcher.py    # Fuzzy matching
│   │   └── receipt_processor.py  # Business logic
│   └── main.py                   # FastAPI app
├── scripts/
│   └── seed_data.py              # Initial data
├── Dockerfile                     # Cloud Run deployment
├── requirements.txt
└── .env.example
```

## Development Notes

- **Pluggable AI**: Extractor interface allows swapping AI backends
- **No auto-retry**: Failed extractions go to `needs_review` status
- **Fuzzy matching**: 85% threshold for product deduplication
- **Flat product_prices**: Enables cross-product/store queries
