# Registro de Decisiones de Arquitectura (ADR) - Belna Finanzas

## ADR 001: Lógica de Pago Diferido (Tarjeta de Crédito)
- **Estado:** Aprobado
- **Fecha:** 2026-03-03
- **Contexto:** El usuario paga las compras de supermercado con tarjeta de crédito (ej. Unipay). El gasto se planifica/consume en M, pero el flujo de caja se ve afectado en M+1.
- **Decisión:**
  1. Los compromisos reales (Unipay, Cencosud) se mantienen en el mes que se pagan.
  2. Los "Compromisos Sintéticos" (Meals + Shopping List) generados por la planificación deben sumarse al balance proyectado del **mes siguiente** al de su origen.
  3. El Dashboard de Marzo debe mostrar el pago de Febrero (Unipay) y la planificación de Marzo debe visualizarse como una deuda futura en el horizonte de Abril.

## ADR 002: Shopping List es fuente de verdad en Supabase, no en localStorage
- **Estado:** Aprobado
- **Fecha:** 2026-03-07
- **Contexto:** El frontend usaba localStorage como caché y podía perder sincronización con el backend.
- **Decisión:**
  1. Supabase es la fuente de verdad. El localStorage es solo un caché de lectura rápida.
  2. Si el `GET /api/shopping-list` falla, el frontend debe mantener los items del caché, NO vaciarlos a `[]`.
  3. El endpoint `GET /api/shopping-list/suggestions` debe existir como ruta separada en el backend.

## ADR 003: El router de shopping-list necesita ruta /suggestions ANTES de /{item_id}
- **Estado:** Aprobado
- **Fecha:** 2026-03-07
- **Contexto:** FastAPI interpreta `/shopping-list/suggestions` como `/shopping-list/{item_id}` donde item_id="suggestions", lo que causa un 405 Method Not Allowed.
- **Decisión:** El endpoint `GET /suggestions` debe declararse ANTES de `PATCH /{item_id}` y `DELETE /{item_id}` en el router.
