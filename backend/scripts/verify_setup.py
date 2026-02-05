#!/usr/bin/env python3
"""
Quick verification script to check Sprint 1 setup

Run after initial setup to verify all components are ready
"""
import sys
import os

def check_files():
    """Check if all required files exist"""
    print("📁 Checking file structure...")
    
    required_files = [
        "requirements.txt",
        ".env.example",
        "app/main.py",
        "app/core/config.py",
        "app/core/firebase.py",
        "app/core/auth.py",
        "app/services/storage.py",
        "app/services/ai_extractor.py",
        "app/services/product_matcher.py",
        "app/services/receipt_processor.py",
        "app/api/routes/receipts.py",
        "app/api/routes/jobs.py",
        "app/models/firestore_schema.py",
        "app/schemas/receipt.py",
        "scripts/seed_data.py",
        "Dockerfile",
        "../firebase-config/firestore.indexes.json",
        "../firebase-config/firestore.rules",
        "../firebase-config/storage.rules",
    ]
    
    missing = []
    for file in required_files:
        if not os.path.exists(file):
            missing.append(file)
    
    if missing:
        print(f"❌ Missing files ({len(missing)}):")
        for f in missing:
            print(f"   - {f}")
        return False
    
    print(f"✅ All {len(required_files)} required files present")
    return True


def check_env():
    """Check if .env is configured"""
    print("\n🔧 Checking environment configuration...")
    
    if not os.path.exists(".env"):
        print("❌ .env file not found")
        print("   Run: cp .env.example .env")
        print("   Then edit .env with your credentials")
        return False
    
    with open(".env") as f:
        content = f.read()
    
    required_vars = [
        "FIREBASE_PROJECT_ID",
        "FIREBASE_STORAGE_BUCKET",
        "GOOGLE_APPLICATION_CREDENTIALS",
        "GEMINI_API_KEY"
    ]
    
    missing_vars = []
    for var in required_vars:
        if var not in content or f"{var}=your-" in content:
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing or unconfigured variables ({len(missing_vars)}):")
        for v in missing_vars:
            print(f"   - {v}")
        return False
    
    print(f"✅ All {len(required_vars)} environment variables configured")
    return True


def check_service_account():
    """Check if service account key exists"""
    print("\n🔑 Checking service account key...")
    
    # Try to read path from .env
    sa_path = None
    if os.path.exists(".env"):
        with open(".env") as f:
            for line in f:
                if line.startswith("GOOGLE_APPLICATION_CREDENTIALS"):
                    sa_path = line.split("=")[1].strip()
                    break
    
    if not sa_path:
        print("⚠️  GOOGLE_APPLICATION_CREDENTIALS not set in .env")
        return False
    
    if not os.path.exists(sa_path):
        print(f"❌ Service account key not found: {sa_path}")
        print("   Download from Google Cloud Console > IAM > Service Accounts")
        return False
    
    print(f"✅ Service account key found: {sa_path}")
    return True


def check_dependencies():
    """Check if dependencies are installed"""
    print("\n📦 Checking dependencies...")
    
    try:
        import fastapi
        import firebase_admin
        import google.generativeai
        import PIL
        print("✅ Core dependencies installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("   Run: pip install -r requirements.txt")
        return False


def main():
    print("="*60)
    print("Sprint 1 Setup Verification")
    print("="*60)
    
    checks = [
        check_files(),
        check_env(),
        check_service_account(),
        check_dependencies()
    ]
    
    print("\n" + "="*60)
    if all(checks):
        print("✅ Sprint 1 setup complete!")
        print("="*60)
        print("\nNext steps:")
        print("1. Deploy Firebase rules: firebase deploy --only firestore:rules,firestore:indexes,storage")
        print("2. Run seed script: python scripts/seed_data.py")
        print("3. Create test user in Firebase Console")
        print("4. Start API: uvicorn app.main:app --reload --port 8080")
        print("5. Test health: http://localhost:8080/health")
        return 0
    else:
        print("❌ Setup incomplete - fix issues above")
        print("="*60)
        return 1


if __name__ == "__main__":
    os.chdir(os.path.dirname(__file__) or ".")
    os.chdir("..")  # Move to backend directory
    sys.exit(main())
