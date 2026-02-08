from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.firebase import initialize_firebase
from app.core.config import settings
from app.api.routes import receipts, jobs, telegram, dashboard, products, catalog, incomes, commitments, events, alerts, horizon, recipes, shopping_list, bitacora, diagnose, meal_planner
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Family Finance API",
    description="MVP ERP Familiar - Receipt processing, transactions, and price tracking",
    version="1.0.0"
)

# CORS middleware (MVP: allow all origins to avoid deployment blockers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    """Initialize Firebase on startup"""
    logger.info("Starting Family Finance API...")
    try:
        initialize_firebase()
        logger.info("Firebase initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {e}")
        raise




@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "family-finance-api",
        "version": "1.0.0",
        "telegram_bot": "configured" if settings.telegram_bot_token and "reemplazar" not in settings.telegram_bot_token else "not_configured"
    }

# Include routers
app.include_router(receipts.router, prefix="/api", tags=["receipts"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(telegram.router, prefix="/api/telegram", tags=["telegram"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(products.router, prefix="/api/products", tags=["products"])
app.include_router(catalog.router, prefix="/api", tags=["catalog"])
app.include_router(incomes.router, prefix="/api", tags=["incomes"])
app.include_router(commitments.router, prefix="/api", tags=["commitments"])
app.include_router(events.router, prefix="/api", tags=["events"])
app.include_router(alerts.router, prefix="/api", tags=["alerts"])
app.include_router(horizon.router, prefix="/api", tags=["horizon"])
app.include_router(recipes.router, prefix="/api", tags=["recipes"])
app.include_router(shopping_list.router, prefix="/api", tags=["shopping-list"])
app.include_router(bitacora.router, prefix="/api", tags=["bitacora"])
app.include_router(diagnose.router, prefix="/api", tags=["diagnose"])
app.include_router(meal_planner.router, prefix="/api", tags=["meal_planner"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
