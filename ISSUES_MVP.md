# 🎫 Issues MVP — CBC Family

> Lista lista para copiar/pegar en GitHub Issues cuando el repo esté listo.

## Bitácora

### B-01 — Vista principal (agrupada por tipo) *(M)*
**Resumen**
Mostrar Bitácora por bloques (Observaciones, Consultas, Patrones, Ideas/Sueños, Proyectos).

**Alcance**
- Query `BitacoraEntry` con `status=active`.
- Agrupar por `type` y ordenar por `impact` + `updated_at`.
- Secciones colapsables con contador.

**Criterios de aceptación**
- Se ven 5 bloques con contador.
- Orden consistente por impacto/recencia.
- Estado vacío claro por bloque.

**Dependencias**
- Esquema `BitacoraEntry` definido.

---

### B-02 — Tarjeta unificada *(S)*
**Resumen**
Card reutilizable para cualquier `BitacoraEntry`.

**Alcance**
- Título, resumen, tipo, impacto, CTA “Ver detalle”.

**Criterios de aceptación**
- Una misma tarjeta renderiza observation/question/idea/project.

---

### B-03 — Detalle de tarjeta *(M)*
**Resumen**
Vista de detalle con acciones por tipo.

**Alcance**
- Ruta `/bitacora/:id`.
- Render markdown seguro.
- Acciones: archivar / convertir en Sueño / aceptar proyecto.

**Criterios de aceptación**
- Acciones visibles solo cuando aplican.
- Actualiza `status`/`type` en Firestore.

---

### B-04 — Consulta puntual (Q&A guiado) *(S)*
**Resumen**
Pregunta corta + respuesta IA guardada como tarjeta.

**Alcance**
- Input corto con contexto automático.
- Crear `BitacoraEntry(type=question)`.

**Criterios de aceptación**
- Respuesta queda persistida como tarjeta.

---

### B-05 — Conversión consulta → idea (Sueño) *(S)*
**Resumen**
Convertir Q&A en idea con formulario ligero.

**Alcance**
- Formulario prellenado por IA.
- Mutar `type=idea` y conservar `origin`.

**Criterios de aceptación**
- Se mantiene trazabilidad desde la consulta.

---

### B-06 — Conversión idea → proyecto *(M)*
**Resumen**
Aceptar Sueño y crear proyecto operativo.

**Alcance**
- Confirmación explícita.
- Mutar `type=project` + campos project.

**Criterios de aceptación**
- Proyecto aparece en Inicio.

---

### B-07 — Proyectos activos *(S)*
**Resumen**
Lista de proyectos activos con estado visual.

**Alcance**
- Query `type=project`.
- Cards con progreso y horizonte.

**Criterios de aceptación**
- Cada card enlaza al detalle.

---

### B-08 — Exportación Markdown *(S)*
**Resumen**
Generar resumen MD desde Bitácora.

**Alcance**
- Selector de rango.
- Descargar / copiar.

**Criterios de aceptación**
- Export funciona en 1 clic.

---

## Inicio

### I-01 — Estado del hogar *(S)*
**Resumen**
Semáforo de estado (verde/amarillo/rojo).

**Alcance**
- Cálculo básico desde flujo mensual.

**Criterios de aceptación**
- Estado visible en <1s.

---

### I-02 — Horizonte 30–60 días *(S)*
**Resumen**
Resumen de próximos eventos/compromisos.

**Alcance**
- Top 5 con fecha e impacto.

**Criterios de aceptación**
- Ordenado por proximidad/impacto.

---

### I-03 — Notificaciones relevantes *(S)*
**Resumen**
Insights visibles con contador.

**Alcance**
- Mostrar impacto medio/alto.
- Marcar leído/archivar.

**Criterios de aceptación**
- Badge y filtro activo.

---

### I-04 — Proyecto activo (resumen) *(S)*
**Resumen**
Widget con estado/horizonte/impacto.

**Alcance**
- Link a detalle.

**Criterios de aceptación**
- Visible solo si hay project activo.

---

### I-05 — Gráfico distribución de ingreso *(M)*
**Resumen**
Gráfico principal con meta vs real.

**Alcance**
- Barra apilada o donut simple (máx 3 segmentos).
- Texto IA asociado según estado.

**Criterios de aceptación**
- 1 mensaje activo por estado.

---

### I-06 — Pulso del mes *(S)*
**Resumen**
Gráfico de tendencia + semáforo.

**Alcance**
- Línea suave o barras semanales.
- Comparación vs promedio mensual.

**Criterios de aceptación**
- Lectura en <5s.

---

## Flujo

### F-01 — Ingresos (fijos/variables) *(S)*
**Resumen**
Captura y total mensual.

**Criterios de aceptación**
- Total mensual calculado.

---

### F-02 — Compromisos *(S)*
**Resumen**
Recurrentes + deudas.

**Criterios de aceptación**
- Calendario de pagos visible.

---

### F-03 — Eventos de gasto *(S)*
**Resumen**
Anuales/técnicos/eventuales.

**Criterios de aceptación**
- Próximos eventos con impacto estimado.

---

### F-04 — Horizonte 30–60 días *(S)*
**Resumen**
Cruce ingresos + compromisos + eventos.

**Criterios de aceptación**
- Alerta suave si impacto ≥3%.

---

### F-05 — Flow categories + provisiones *(M)*
**Resumen**
Nueva categoría de flujo y provisión mensual.

**Alcance**
- `flow_category` en compromisos/eventos.
- Provisión mensual automática.

**Criterios de aceptación**
- Pagos anuales no “pegan” en el mes.

---

### F-06 — Fondo de estabilización (invisible) *(S)*
**Resumen**
Buffer automático para excedentes.

**Criterios de aceptación**
- No aparece como “gastable”.

---

### F-07 — Distribución % ingreso *(M)*
**Resumen**
Oxígeno/Vida/Blindaje con meta vs real.

**Alcance**
- Entidad `IncomeDistributionGroup`.
- Mapeo de gastos a grupo.

**Criterios de aceptación**
- % real mensual calculado sin input manual.

---

## Compras

### C-01 — Registro de boletas *(M)*
**Resumen**
Carga rápida de boletas.

**Criterios de aceptación**
- Boleta creada en <3 min.

---

### C-02 — Confirmación / edición *(M)*
**Resumen**
Editar productos, cantidades y precios.

**Criterios de aceptación**
- Correcciones en 24h.

---

### C-03 — Consulta de precios *(S)*
**Resumen**
Precio por unidad + mejor tienda.

**Criterios de aceptación**
- Histórico simple visible.

---

### C-04 — Historial de compras *(S)*
**Resumen**
Lista cronológica de boletas.

**Criterios de aceptación**
- Acceso a edición desde historial.

---

### C-05 — Lista de compras inteligente *(M)*
**Resumen**
Lista actual + ajustes por precios.

**Criterios de aceptación**
- Sugerencia de ahorro básica.

---

### C-06 — Índice de sustitución (inflación activa) *(M)*
**Resumen**
Detectar desvío y proponer sustitutos.

**Alcance**
- PUR + desvío ≥15–20%.
- Sustitución por categoría (confirmable).

**Criterios de aceptación**
- Ajuste sugerido en lista con confirmación.

---

## Despensa

### D-01 — Inventario proyectado *(M)*
**Resumen**
Inventario estimado + valor.

**Criterios de aceptación**
- Alertas básicas de merma.

---

### D-02 — Productos estratégicos *(S)*
**Resumen**
Gestión de productos Clase A.

**Criterios de aceptación**
- Min/max solo en productos Clase A.

---

### D-03 — Platos base *(S)*
**Resumen**
Ingredientes + costo estimado.

**Criterios de aceptación**
- Base para lista inteligente.

---

### D-04 — Calendario de platos (básico) *(M)*
**Resumen**
Asignación simple por día.

**Criterios de aceptación**
- Vista semana/mes.
