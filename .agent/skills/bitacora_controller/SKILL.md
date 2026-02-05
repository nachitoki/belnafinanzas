---
name: Bitacora Controller
description: Interactive CLI to simulate and debug Bitacora (AI Advisor) flows without using the Frontend.
version: 1.0.0
---

# 🧠 Bitacora Controller Skill

This skill allows you to interact with the Bitacora logic directly from the terminal. It is useful for testing the "AI Advisor" capabilities, creating entries, and simulating state transitions (e.g., Question -> Idea -> Project) without needing to click through the UI.

## Capabilities

1.  **Chat Simulation**: Send messages as if you were a user and see the AI response.
2.  **Inspect Entries**: View the raw JSON of Bitacora entries to check `type`, `status`, and `impact`.
3.  **Force Transitions**: Manually convert an entry (e.g., from `idea` to `project`) to test workflows.

## Usage

Run the following command from the `backend` directory:

```powershell
python ../.agent/skills/bitacora_controller/bitacora_cli.py
```

## Interactive Commands

Inside the tool, you can use:
- `list`: Show active entries.
- `chat <message>`: Create a new question/entry.
- `inspect <id>`: View full details of an entry.
- `convert <id> <target_type>`: Force a type change (e.g., `convert 123 project`).
- `quit`: Exit.
