---
name: Receipt Lab
description: Tool to debug and re-process receipt image extraction using Gemini.
version: 1.0.0
---

# 🧾 Receipt Lab Skill

When the AI fails to read a receipt correctly, you need a quick way to "retry" and see exactly what the AI sees, without the UI overhead. This skill connects directly to the `GeminiVisionExtractor` service.

## Capabilities

1.  **Re-Extract**: Takes an existing receipt ID, fetches its image URL from Firestore, and runs it through Gemini again.
2.  **View Raw**: Prints the raw JSON response from Gemini, including confidence scores and detected line items.

## Usage

```powershell
# Debug a specific receipt
python ../.agent/skills/receipt_lab/debug_receipt.py <receipt_id>
```

## Prerequisites
- The backend must be configured with a valid `GEMINI_API_KEY`.
- The receipt must already exist in Firestore (status can be `error`, `uploaded`, etc.).
