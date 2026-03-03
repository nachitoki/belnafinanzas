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
            "meal_plans_total": supabase.table("meal_plans").select("id", count="exact").execute().count,
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



@app.get("/debug/inject")
async def debug_inject():
    """Emergency injection using backend's own env vars"""
    try:
        from app.core.supabase import get_supabase
        supabase = get_supabase()
        hh_id = "51e7a0a0-6de5-52a5-be37-b9cad7e49257" # Familia Demo
        
        # Incomes
        incomes = [
            {"household_id": hh_id, "name": "Sueldo 1", "amount": 1800000, "frequency": "monthly", "next_date": "2026-03-01"},
            {"household_id": hh_id, "name": "Sueldo 2", "amount": 350000, "frequency": "monthly", "next_date": "2026-03-01"}
        ]
        supabase.table("incomes").insert(incomes).execute()
        
        # Commitments
        commitments = [
            {"household_id": hh_id, "name": "Arriendo", "amount": 600000, "frequency": "monthly", "flow_category": "structural", "next_date": "2026-03-05"},
            {"household_id": hh_id, "name": "Luz", "amount": 259300, "frequency": "monthly", "flow_category": "structural", "next_date": "2026-03-05"},
            {"household_id": hh_id, "name": "Agua", "amount": 79850, "frequency": "monthly", "flow_category": "structural", "next_date": "2026-03-05"},
            {"household_id": hh_id, "name": "Internet", "amount": 47000, "frequency": "monthly", "flow_category": "structural", "next_date": "2026-03-05"},
            {"household_id": hh_id, "name": "Unipay", "amount": 317817, "frequency": "monthly", "flow_category": "structural", "next_date": "2026-03-05"},
            {"household_id": hh_id, "name": "Cencosud 1", "amount": 120000, "frequency": "monthly", "flow_category": "structural", "next_date": "2026-03-05"},
            {"household_id": hh_id, "name": "Cencosud 2", "amount": 70000, "frequency": "monthly", "flow_category": "structural", "next_date": "2026-03-05"},
        ]
        supabase.table("commitments").upsert(commitments, on_conflict="household_id,name").execute()
        
        # Meal Plans (Mock for March) - Safe Delete then Insert
        meal_plans = [
            {"household_id": hh_id, "date": "2026-03-03", "type": "lunch", "recipe_name": "Lentejas", "recipe_cost": 5000},
            {"household_id": hh_id, "date": "2026-03-04", "type": "lunch", "recipe_name": "Pollo con Arroz", "recipe_cost": 8000},
            {"household_id": hh_id, "date": "2026-03-05", "type": "lunch", "recipe_name": "Pasta Boloñesa", "recipe_cost": 6000}
        ]
        
        for m in meal_plans:
            supabase.table("meal_plans").delete().eq("household_id", hh_id).eq("date", m["date"]).eq("type", m["type"]).execute()
        supabase.table("meal_plans").insert(meal_plans).execute()
        
        # Shopping List (Mock for March) - Safe Delete then Insert
        shopping_list = [
            {"household_id": hh_id, "name": "Pan molde", "estimated_cost": 3000, "month": "2026-03"},
            {"household_id": hh_id, "name": "Leche 12pk", "estimated_cost": 12000, "month": "2026-03"},
            {"household_id": hh_id, "name": "Frutas", "estimated_cost": 15000, "month": "2026-03"}
        ]
        
        for s in shopping_list:
            supabase.table("shopping_list").delete().eq("household_id", hh_id).eq("name", s["name"]).eq("month", s["month"]).execute()
        supabase.table("shopping_list").insert(shopping_list).execute()
        
        return {"success": True, "message": "Injected commitments, meals and shopping list (safe mode)"}
    except Exception as e:
        return {"success": False, "error": str(e)}

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
