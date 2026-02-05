# STATUS

## Último estado
- Fecha: 2026-01-24
- Contexto: Implementados fixes críticos y mejoras de robustez en backend/frontend.

## Cambios recientes aplicados
- Auth: bypass sin token solo en development; en prod responde 401. (`backend/app/core/auth.py`)
- Dashboard: household_id ya no hardcodeado; usa usuario autenticado. (`backend/app/api/routes/dashboard.py`)
- Receipts API: se importa `ReceiptItemDetail` y se guarda `image_path`; detalle genera URL firmada al vuelo. (`backend/app/api/routes/receipts.py`)
- Storage: upload devuelve `(public_url, blob_path)`; delete usa `blob_path` y se agregó `generate_signed_url`. (`backend/app/services/storage.py`)
- Spending zone: cálculo basado en histórico del año en curso (meses previos). (`backend/app/domain/logic.py`)
- Receipt processor: parseo de fecha a `datetime`. (`backend/app/services/receipt_processor.py`)
- Pydantic: listas con `default_factory`. (`backend/app/schemas/receipt.py`)
- UI: botón "Ver imagen" en historial. (`frontend/src/components/receipts/ReceiptHistory.jsx`)

## Dónde quedó el flujo
- Próximo paso: probar flujo completo (subir boleta → confirmar → historial → ver imagen).
- Si crashea: pegar stacktrace completo + qué acción se estaba ejecutando.

## Cómo reconectar rápido
1) Indicar qué estabas haciendo cuando falló.
2) Pegar el error completo.
3) Confirmar si backend y frontend estaban levantados.
