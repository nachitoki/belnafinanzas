from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.firebase import initialize_firebase
from app.core.config import settings
from app.api.routes import receipts, jobs, telegram, dashboard, products, catalog, incomes, commitments, events, alerts, horizon, recipes, shopping_list, bitacora, diagnose, meal_planner, advisor
import logging
import traceback

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

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler - ensures CORS headers on ALL error responses
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )


@app.on_event("startup")
async def startup_event():
    """Initialize Firebase on startup (non-fatal if missing)"""
    logger.info("Starting Family Finance API...")
    try:
        initialize_firebase()
        logger.info("Firebase initialized successfully")
    except Exception as e:
        logger.warning(f"Firebase initialization failed (non-fatal, Supabase will be used): {e}")




@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "family-finance-api",
        "version": "1.0.0",
        "telegram_bot": "configured" if settings.telegram_bot_token and "reemplazar" not in settings.telegram_bot_token else "not_configured"
    }

@app.get("/debug/db")
async def debug_db():
    """Temporary debug endpoint to check DB state"""
    try:
        from app.core.supabase import get_supabase
        supabase = get_supabase()
        
        # 1. Households
        hh_resp = supabase.table("households").select("id, name").execute()
        
        # 2. Total counts across all tables (no filter)
        totals = {
            "households": len(hh_resp.data),
            "incomes_total": supabase.table("incomes").select("id", count="exact").execute().count,
            "commitments_total": supabase.table("commitments").select("id", count="exact").execute().count,
            "transactions_total": supabase.table("transactions").select("id", count="exact").execute().count,
            "events_total": supabase.table("events").select("id", count="exact").execute().count,
            "users_total": supabase.table("users").select("id", count="exact").execute().count
        }
        
        # 3. Stats per household
        hh_stats = {}
        for hh in hh_resp.data:
            hid = hh["id"]
            inc_c = supabase.table("incomes").select("id", count="exact").eq("household_id", hid).execute().count
            com_c = supabase.table("commitments").select("id", count="exact").eq("household_id", hid).execute().count
            hh_stats[hid] = {
                "name": hh.get("name"),
                "incomes": inc_c,
                "commitments": com_c
            }
            
        return {
            "totals": totals,
            "households_detail": hh_stats
        }
    except Exception as e:
        import traceback
        return {"error": str(e), "trace": traceback.format_exc()}



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
app.include_router(advisor.router, prefix="/api/advisor", tags=["advisor"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
