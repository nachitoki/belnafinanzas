---
name: Notion Bridge
description: Tools to synchronize and migrate historical data from Notion exports to the App.
version: 1.0.0
---

# 🌉 Notion Bridge Skill

This skill provides a reliable way to import your historical data from Notion CSV exports into the Finanzas Familiares app. It solves the problem of starting with an empty database by creating a "living" catalog of prices and products from day one.

## Capabilities

1.  **Product Import**: Reads `Despensa Productos (Maestra)...csv` and `Extras despensa...csv` to populate the global product catalog.
2.  **Price Seeding**: Injects historical prices into Firestore so that price history charts work immediately.
3.  **Recipe Sync**: Links products to recipes if available.

## Usage

1.  Place your Notion CSV exports in `backend/Datos Notion/Extracted/...` (Standard path).
2.  Run the bridge:

```powershell
python ../.agent/skills/notion_bridge/run_bridge.py
```

## Options

- `--dry-run`: Preview what would be imported without writing to Firestore.
- `--verbose`: Show detailed logs of every product processed.
