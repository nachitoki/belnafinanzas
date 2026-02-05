---
name: State Manager
description: Utilities to wipe, seed, and reset the application database state.
version: 1.0.0
---

# 🧹 State Manager Skill

Managing database state during development is pain. This skill provides a centralized way to trigger "Wipe" (clear data) and "Seed" (load demo data) operations.

## Capabilities

1.  **Seed Data**: populates the database with a "Golden Standard" family setup (Categories, defaults).
2.  **Reset**: (Planned) Clears user data to start fresh.

## Usage

```powershell
# Run the seeder (idempotent-ish)
python ../.agent/skills/state_manager/manage_state.py seed
```

⚠️ **Warning**: Wiping data is destructive. Development use only.
