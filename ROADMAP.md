# 🌳 Árbol Final de Navegación — CBC Family (v2.1)

## Navegación primaria (tabs principales)
Inicio · Flujo · Compras · Despensa · Bitácora

> Cada módulo usa **subpestañas / botones segmentados** para alternar vistas sin cambiar de contexto.

**Navegación móvil (v1)**  
2 niveles: **Módulo** (barra principal) → **Subpestañas** (globos arriba).  
Las acciones rápidas viven dentro de cada pantalla (no como nivel 3).

**Estilo visual (globos / pills)**  
- Contenedor redondeado con fondo suave (pastel claro).  
- Píldora activa con fondo blanco y leve sombra.  
- Icono + texto corto (1 palabra) por píldora.  
- Scroll horizontal si excede 5 ítems.  
- Transición suave al cambiar de tab (sin animaciones agresivas).

**Comportamiento (v1)**  
- Estado activo: fondo blanco + sombra leve + texto en color principal.  
- Estado inactivo: fondo transparente sobre contenedor + texto gris.  
- Badges: solo en Notificaciones y Observaciones (máx 9+).  
- Truncado: textos largos a 1 línea con elipsis.  
- Scroll: snapping suave al centro del ítem activo.  
- Feedback: vibración sutil (haptic) en mobile al cambiar.

---

## Inicio
**Subpestañas rápidas**
- Estado del Hogar (verde / amarillo / rojo)
- Horizonte (30–60 días)
- Estado del mes (IA)
- Notificaciones 🔔
- Proyecto activo (resumen)
  - Estado
  - Horizonte
  - Impacto mensual

**Principio (v1)**  
Los gráficos no explican. La IA explica. Los porcentajes orientan, no presionan.

**Orden móvil (globos)**  
Estado · Horizonte · Mes · Notificaciones · Proyecto

**Iconos sugeridos**
- Estado: semáforo / panel.
- Horizonte: calendario.
- Mes: gráfico de pulso.
- Notificaciones: campana.
- Proyecto: objetivo / bandera.

---

## Flujo
**Subpestañas**
- Ingresos
  - Fijos
  - Variables
- Compromisos
  - Cuentas recurrentes
  - Deudas
- Eventos de gasto
  - Anuales
  - Técnicos
  - Eventuales
- Horizonte
  - Próximos 30–60 días
  - Alertas de impacto

**Modelo interno (v1)**  
Estructural (survival) · Provisiones (sinking funds) · Discrecional/Deuda

**Acción rápida (v1)**  
Botón de **postergación de gastos** en tarjetas de compromisos/eventos: 5, 10, 15 días o **siguiente mes** (programable).

**Distribución del ingreso (v1)**  
Oxígeno · Vida · Blindaje (configurables, no hardcodeados)

**Orden móvil (globos)**  
Ingresos · Compromisos · Eventos · Horizonte · Distribución

**Iconos sugeridos**
- Ingresos: flecha arriba / moneda.
- Compromisos: recibo / contrato.
- Eventos: calendario con punto.
- Horizonte: reloj / calendario.
- Distribución: dona / barra apilada.

---

## Compras
**Subpestañas**
- Lista de compras inteligente
- Consulta de precios
- Registro de boletas
- Tiendas
- Historial de compras
- Sugerencias de ahorro (producto / tienda)

**Mejora IA (v1)**  
Normalización de nombres en boletas: cuando el nombre detectado es ruidoso (marca + atributos), la app propone categoría/normalización (ej: "Pila Duracell Triple A" → "Pilas AAA").  
Se guarda el nombre original como alias asociado para mejorar reconocimiento futuro.

**Tiendas (v1)**  
Cada boleta debe registrar la tienda. Permite triangulación de precios por producto entre tiendas (ej: Unimarc vs Kosten) y recomendaciones de compra más convenientes.

**Limpieza de datos (v1)**  
Barrido inicial de Notion + boletas antiguas para extraer marcas, alias y normalizar catálogo existente.

**Regla v1.5**  
Índice de sustitución (PUR + desvío ≥15–20%) con propuesta confirmable.

**Orden móvil (globos)**  
Registro · Lista · Precios · Tiendas · Historial · Ahorro

**Iconos sugeridos**
- Lista: checklist.
- Precios: etiqueta / tag.
- Registro: cámara / recibo.
- Tiendas: tienda / ubicación.
- Historial: reloj.
- Ahorro: moneda / cerdito.

---

## Despensa
**Subpestañas**
- Inventario proyectado
- Productos estratégicos
- Platos base
- Calendario de platos
- Alertas de merma o exceso

**Platos base (v1)**
- Constructor de platos con ingredientes y costo estimado.
- Permite crear producto desde aquí si no existe en boletas (precio manual verificado en mercado).

**Regla v1**  
Solo se controla inventario de productos estratégicos (Clase A).

**Orden móvil (globos)**  
Inventario · Estratégicos · Platos · Calendario · Alertas

**Iconos sugeridos**
- Inventario: caja / almacén.
- Estratégicos: estrella.
- Platos: plato/cubiertos.
- Calendario: calendario.
- Alertas: triángulo/alerta.

---

## Bitácora (Asesor IA)
**Subpestañas / bloques**
- Observaciones IA
- Consultas
- Patrones
- Ideas / Ideas
- Proyectos

**Acciones rápidas**
- + Nueva consulta

### Derivados de Bitácora
1. Tipos de interacción dentro de Bitácora
2. Cómo una conversación / tarjeta se convierte en Idea (y luego proyecto)

**Orden móvil (globos)**  
Observaciones · Consultas · Patrones · Ideas · Proyectos

**Iconos sugeridos**
- Observaciones: ojo.
- Consultas: burbuja.
- Patrones: gráfico / ondas.
- Ideas: foco.
- Proyectos: bandera / check.

---

## Configuracion
**Asistente distribucion % ingreso (v1)**
- Diagnostico rapido con ingresos/compromisos reales.
- Propuesta inicial de metas (Oxigeno / Vida / Blindaje).
- Ajuste guiado segun realidad y objetivo.
- Confirmacion final y guardado en `IncomeDistributionGroup`.

# 📆 Gantt conceptual (actualizado)

> No es calendario rígido. Es orden lógico de construcción.

## 🟢 Fase 1 — Fundaciones y flujo mínimo
**Enero (24 → 30)**
```nginx
Inicio (estado + horizonte + notificaciones)   ██████████
Compras (registro + precios + historial)       █████████
Flujo (ingresos + compromisos + eventos)       ████████
Distribución % ingreso + gráficos mínimos      ███████
Bitácora: vista principal + tarjetas           ███████
Bitácora: detalle de tarjeta                   ██████
```

## 🟡 Fase 2 — Bitácora funcional y decisiones
**Febrero — Semana 1**
```makefile
Consulta puntual (Q&A guiado)                  ███████
Conversión consulta → idea (Idea)             ██████
Idea → proyecto                               ██████
Proyectos activos                              █████
Notificaciones relevantes                      █████
```

## 🟡 Fase 3 — Despensa + compra mensual
**Febrero — Semana 2**
```csharp
Lista de compras inteligente                   ████████
Despensa (inventario + platos base)            ███████
Calendario de platos                           ██████
Alertas merma/exceso                           █████
```

## 🟢 Fase 4 — Tranquilidad operativa
**Febrero — Semana 3**
```nginx
Horizonte (provisiones + alertas suaves)       ███████
Bitácora: observaciones IA automáticas         ██████
Exportación Markdown (MD)                      █████
```

**Detalle Fase 4 (entregables y foco)**
- **Horizonte operativo**: alertas suaves por impacto ≥3% con texto IA descriptivo.
- **Observaciones IA**: disparadores canónicos + límite 3–5 activas.
- **Exportación MD**: resumen mensual (flujo + insights + proyectos).

**Tareas clave**
- Ajustar motor de observaciones IA (patrón + impacto).
- Afinar umbrales de alerta y mensajes (no moral, baja fricción).
- Validar export MD con formato final.

## 🔵 Fase 5 — Estrategia y largo plazo
**Febrero — Semana 4 / Marzo**
```css
Simulación avanzada de ideas                  ███████
Insights avanzados IA                          ███████
Ahorro / inversión básica                      ██████
```

---

# 🧠 Ajustes expertos financieros (v1 / post-v1)

**Principio:** no se agregan pantallas nuevas; se ajusta lógica interna, reglas IA y jerarquías.

## v1 (enero–febrero)
- **Flujo canónico:** Estructural / Provisiones / Discrecional-Deuda.
- **Provisiones mensuales:** pagos anuales no “pegan” fuerte en el mes.
- **Horizonte:** usa provisiones, no eventos puntuales.
- **Despensa:** inventario solo para productos estratégicos (Clase A).
- **Inflación activa:** índice de sustitución (PUR + desvío ≥15–20%).
- **Fondo de estabilización:** excedentes no se muestran como disponibles.
- **Distribución % ingreso:** 3 grupos (Oxígeno/Vida/Blindaje) + metas vs real.
- **Dashboard mínimo:** 2 gráficos (distribución + pulso) con mensaje IA asociado.

## Post-v1 (marzo+)
- **Ideas → proyectos:** TCO + trade-offs entre proyectos.
- **Bitácora emoción (opt-in):** correlación emoción + gasto si hay patrón.
- **Distribución % dinámica:** metas ajustadas por realidad + vínculo con Ideas.
- **Exploración visual:** rueda mensual para ingresos/gastos (selector por mes).

### Ruta post-v1 (ABC)
**Entrega A — Post-v1 básico (3–6 días)**
- Distribución % dinámica (metas se ajustan con realidad).
- Integración con Ideas/Proyectos (impacto al presupuesto).
- IA: mensajes basados en cambios reales (no cada render).

**Entrega B — Proyectos avanzados (4–8 días)**
- TCO por proyecto.
- Trade-offs entre proyectos (mensajes claros).
- Vista de impacto en calendario/flujo.

**Entrega C — Fase 5 (6–12 días)**
- Simulación avanzada de ideas.
- Insights IA avanzados.
- Ahorro/inversión básica.

## v2
- Economía de los hijos (documentado, no implementado en v1).

---

# ✅ MVP actualizado (alcance mínimo)

**Objetivo:** Bitácora operativa + decisiones básicas + flujo mínimo confiable.

**Incluye**
- Inicio: estado del hogar, horizonte, notificaciones y proyecto activo (resumen).
- Flujo: ingresos, compromisos, eventos y horizonte 30–60 días.
- Compras: registro de boletas + precios + tiendas + historial básico.
- Bitácora: vista principal, detalle, consulta puntual, conversiones y proyectos activos.
- Provisiones mensuales + fondo de estabilización (invisible).
- Inflación activa (sustitución básica en productos estratégicos).
- Distribución % ingreso + gráficos mínimos + mensajes IA.

**Fuera del MVP**
- Simulación avanzada de ideas.
- Insights IA avanzados y estrategias de inversión.
- Calendario de platos avanzado (solo base + inventario proyectado).
- TCO de proyectos y trade-offs.
- Emoción opt-in en Bitácora.
- Distribución % dinámica y ajustes automáticos de metas.

---

# 🧭 Prioridad del backlog (alineada a Bitácora)

1. **Bitácora core**: vista principal → detalle → consulta puntual.
2. **Decisiones**: convertir a Idea → aceptar Proyecto.
3. **Integración con Inicio**: proyecto activo + notificaciones relevantes.
4. **Flujo mínimo**: ingresos + compromisos + eventos + provisiones + horizonte.
5. **Compras mínimo**: registro de boletas + precios + tiendas + historial.
6. **Despensa mínimo**: inventario proyectado + alertas de merma.
7. **Exportación Markdown**.
8. **Fase 5**: simulaciones avanzadas + IA avanzada.
9. **Post-v1**: TCO + trade-offs + emoción opt-in.
10. **Post-v1**: distribución % dinámica y ajustes de metas.

---

# 🎯 Criterios de éxito por fase (KPIs)

| Fase | Criterio de éxito |
| :--- | :--- |
| **Fase 1** | 90% de boletas capturadas en <3 min; 80% de correcciones hechas en 24h; distribución % visible con 1 mensaje IA. |
| **Fase 2** | 1 consulta puntual/semana con respuesta útil; al menos 1 idea convertida a idea/mes; 1 proyecto aceptado/trimestre. |
| **Fase 3** | Lista de compras reduce gasto en ≥5% (promedio 3 meses) ≈ **25.000–30.000** sobre gasto promedio 500.000–600.000 y evita 1 compra extra/mes. |
| **Fase 4** | 0 pagos olvidados; ≤2 alertas semanales con ≥70% relevancia; 1–2 observaciones IA útiles/semana con ≤5 activas. |
| **Fase 5** | 1 idea simulado/mes; 1 ajuste realista en presupuesto/mes. |

---

# 🗺️ Mapa mínimo de datos (actualizado)

## Entidades base
- Hogar, Usuario
- Boleta, Item, Producto, Precio, Tienda
- Evento, Compromiso, Ingreso
- Inventario, Plato
- BitacoraEntry, Insight
- `flow_category` (structural | provision | discretionary)
- `emotion_tag` (opcional)
- `IncomeDistributionGroup` (Oxígeno/Vida/Blindaje, metas %)

## Flujos críticos
1. **Boleta → Items → Producto → Precio por unidad (por tienda) → Histórico.**
2. **Eventos + Compromisos → Provisiones → Horizonte → Alertas.**
3. **Gastos → Grupo de distribución → % real vs meta → Dashboard + IA.**
4. **Platos → Ingredientes → Inventario proyectado → Lista de compras.**
5. **Bitácora (question/idea/project) → proyecto activo en Inicio.**

---

# 🧠 Bitácora — Diseño funcional definitivo

## Qué es Bitácora (definición operativa)
Bitácora no es un chat. Es un espacio de trabajo cognitivo donde la IA y tú observan patrones, analizan decisiones, simulan escenarios, estructuran ideas y generan resultados reutilizables.

**Ajuste v1**  
La distribución % puede disparar observaciones IA, pero sin gráficos dentro de Bitácora.

## Estructura visual
Bitácora no es un chat largo infinito. Se organiza por bloques:
```css
[ Observaciones IA ]
[ Consultas ]
[ Patrones ]
[ Ideas / Ideas ]
[ Proyectos ]
```
El chat vive dentro de una tarjeta, no se pierde en el tiempo.

---

# 1️⃣ Entidades técnicas — Bitácora (modelo canónico)

## Entidad principal: BitacoraEntry
Representa una tarjeta (no un mensaje suelto).

```ts
BitacoraEntry {
  id: string
  type: "observation" | "question" | "pattern" | "idea" | "project"
  title: string
  summary: string
  content: string          // texto estructurado o markdown
  origin: "system" | "user" | "mixed"
  emotion_tag?: "cansado" | "apurado" | "celebración"
  related_context?: {
    month?: "2026-01"
    product_ids?: string[]
    event_ids?: string[]
    flow_items?: string[]
  }
  impact: "low" | "medium" | "high"
  status: "active" | "archived" | "converted"
  created_at: timestamp
  updated_at: timestamp
}
```

## Tipos específicos
- **Observation**: generada automáticamente; no editable (solo archivable); puede disparar notificación.
- **Question**: contiene user_question + ai_answer; puede derivar en patrón o idea.
- **Pattern**: descripción + evidencia + acciones sugeridas.
- **Idea**: base del Idea; category, costo, horizonte, factibilidad.
- **Proyecto**: Idea aceptado; mantiene origen y progreso.

## Relación Idea → proyecto
No es otra tabla. Es el mismo objeto que cambia de type:
```nginx
idea  →  project
```

## Entidad soporte: Insight
```ts
Insight {
  id: string
  source_bitacora_id?: string
  message: string
  impact: "medium" | "high"
  resolved: boolean
  created_at: timestamp
}
```

---

# 2️⃣ Wireframe funcional — Bitácora (estructura)

## Vista principal
```css
┌──────────────────────────────┐
│ 🧠 Bitácora                  │
│ Pensar con tu asesor         │
└──────────────────────────────┘

[ + Nueva consulta ]

────────────────────────────────

▸ Observaciones IA (2)
  ┌──────────────┐ ┌──────────────┐
  │ Tarjeta      │ │ Tarjeta      │
  └──────────────┘ └──────────────┘

▸ Consultas (1)
  ┌──────────────┐
  │ Tarjeta      │
  └──────────────┘

▸ Ideas / Ideas (3)
  ┌──────────────┐ ┌──────────────┐
  │ Tarjeta      │ │ Tarjeta      │
  └──────────────┘ └──────────────┘

▸ Proyectos (1)
  ┌──────────────┐
  │ Proyecto     │
  └──────────────┘
```

## Tarjeta común
```css
┌──────────────────────────────┐
│ Título                       │
│ tipo · impacto               │
│                              │
│ resumen corto                │
│                              │
│ [ Ver detalle ]              │
└──────────────────────────────┘
```

## Detalle de tarjeta
```scss
┌──────────────────────────────┐
│ ← Volver                     │
│                              │
│ TÍTULO                       │
│                              │
│ Contenido (markdown)         │
│                              │
│ Contexto relacionado         │
│ - Mes                        │
│ - Productos                  │
│ - Eventos                    │
│                              │
│ Acciones                     │
│ [ Archivar ]                 │
│ [ Convertir en Idea ]       │
│ [ Aceptar como Proyecto ]    │
└──────────────────────────────┘
```

## Nueva consulta
```markdown
┌──────────────────────────────┐
│ ¿Qué quieres analizar hoy?   │
│ [_________________________]  │
│                              │
│ [ Analizar con IA ]          │
└──────────────────────────────┘
```

## Convertir en Idea
```css
┌──────────────────────────────┐
│ Convertir en Idea           │
│                              │
│ Nombre        [_________]    │
│ Tipo          [ selector ]   │
│ Costo         [_________]    │
│ Horizonte     [ meses ]      │
│                              │
│ [ Guardar como Idea ]       │
└──────────────────────────────┘
```

## Proyecto (resumen)
```yaml
┌──────────────────────────────┐
│ Proyecto activo              │
│                              │
│ Objetivo:                    │
│ Horizonte:                   │
│ Progreso: ████░░░░           │
│                              │
│ [ Ver detalle ]              │
└──────────────────────────────┘
```

---

# 📋 Issues técnicas — Bitácora

## EPIC: Bitácora (Asesor IA)

1. **Vista principal Bitácora**
   - Query BitacoraEntry (status=active)
   - Agrupar por type
   - Ordenar por impact + updated_at
   - UI con secciones colapsables

2. **Componente Tarjeta Bitácora**
   - Card reutilizable
   - Título, resumen, tipo, impacto
   - Acción “Ver detalle”

3. **Detalle de Tarjeta**
   - Ruta /bitacora/:id
   - Render markdown (content)
   - Contexto relacionado
   - Acciones dinámicas según type

4. **Consulta puntual (Q&A guiado)**
   - Input corto + botón “Analizar”
   - Contexto automático (mes, flujo, eventos)
   - Llamada IA
   - Crear BitacoraEntry(type=question)

5. **Conversión consulta → idea (Idea)**
   - Acción “Convertir en Idea”
   - Formulario ligero (prellenado por IA)
   - Mutar type=idea
   - Guardar trazabilidad

6. **Conversión idea → proyecto**
   - Confirmación explícita
   - Mutar type=project
   - Crear campos project
   - Vincular a Flujo
   - Crear Insight inicial

7. **Vista Proyectos Activos**
   - Listar type=project
   - Mostrar progreso y horizonte
   - Link a detalle (Bitácora)

8. **Exportación Markdown**
   - Selector de rango
   - Generar MD desde Bitácora
   - Descargar / copiar

---

# 🎫 Backlog MVP — EPICs y tickets

## EPIC A — Inicio (panel operativo)
1. **Estado del hogar**
   - Mostrar semáforo (verde / amarillo / rojo).
   - Reglas básicas desde flujo mensual.
   - Criterio: estado visible en < 1s.
2. **Horizonte 30–60 días**
   - Lista de próximos eventos/compromisos.
   - Impacto mensual agregado.
   - Criterio: muestra top 5 con fecha e impacto.
3. **Notificaciones relevantes**
   - Mostrar insights con impacto medio/alto.
   - Marcar como leído/archivar.
   - Criterio: badge con contador y filtro activo.
4. **Proyecto activo (resumen)**
   - Estado + horizonte + impacto mensual.
   - Link a detalle del proyecto.
   - Criterio: visible cuando existe proyecto activo.
5. **Gráfico distribución de ingreso**
   - Barra apilada o donut simple (3 segmentos).
   - Meta vs real + texto IA asociado.
   - Criterio: 1 mensaje activo por estado.
6. **Pulso del mes**
   - Tendencia suave + semáforo.
   - Comparación vs promedio.
   - Criterio: lectura en < 5s.

---

## EPIC B — Bitácora (core + decisiones)
1. **Vista principal (agrupada por tipo)**
   - Query `BitacoraEntry` (status=active).
   - Agrupar por type y ordenar por impact/updated_at.
   - Criterio: bloques colapsables con contador.
2. **Tarjeta unificada**
   - Título, resumen, tipo, impacto, acción “Ver detalle”.
   - Criterio: reutilizable para observation/question/idea/project.
3. **Detalle de tarjeta**
   - Ruta `/bitacora/:id`.
   - Render markdown seguro.
   - Acciones según type (archivar/convertir/aceptar).
   - Criterio: acciones visibles y guardan estado.
4. **Consulta puntual (Q&A guiado)**
   - Input corto + contexto automático.
   - Guardar en `BitacoraEntry(type=question)`.
   - Criterio: respuesta persiste como tarjeta.
5. **Conversión consulta → idea (Idea)**
   - Formulario ligero prellenado.
   - Mutar type a `idea`.
   - Criterio: trazabilidad conserva origin.
6. **Conversión idea → proyecto**
   - Confirmación explícita + explicación impacto.
   - Mutar type a `project` + campos project.
   - Criterio: aparece en Inicio.
7. **Proyectos activos**
   - Query `type=project`.
   - Estado visual + progreso.
   - Criterio: cards enlazan a detalle.
8. **Exportación Markdown**
   - Selector de rango.
   - Generar MD desde Bitácora.
   - Criterio: descargar/copiar funcionando.
9. **Patrones (IA)**
   - Generación automática (no usuario).
   - Criterio: solo si hay patrón + impacto.

---

## EPIC C — Flujo (mínimo confiable)
1. **Ingresos**
   - Fijos/variables.
   - Criterio: total mensual calculado.
2. **Compromisos**
   - Recurrentes + deudas.
   - Selección `flow_category` obligatoria (structural / provision / discretionary).
   - Criterio: calendario de pagos visible.
3. **Eventos de gasto**
   - Anuales/técnicos/eventuales.
   - Selección `flow_category` obligatoria (structural / provision / discretionary).
   - Criterio: próximos eventos con impacto estimado.
4. **Horizonte 30–60 días**
   - Cruce ingresos + compromisos + provisiones (no eventos puntuales).
   - Criterio: alerta suave si impacto ≥3%.
5. **Flow categories + provisiones**
   - `flow_category` en compromisos/eventos.
   - Provisión mensual automática (prorrateo de anualidades).
   - Criterio: pagos anuales no “pegan” en el mes.
6. **Fondo de estabilización (invisible)**
   - Excedentes se mueven a buffer.
   - Criterio: no aparece como “gastable”.
7. **Distribución % ingreso**
   - Entidad `IncomeDistributionGroup` (Oxígeno / Vida / Blindaje).
   - Mapeo de gastos a grupo (meta vs real).
   - Criterio: % real mensual calculado sin input manual.

---

## EPIC D — Compras (registro + precios)
1. **Registro de boletas**
   - Carga rápida (foto + texto).
   - OCR opcional; entrada manual siempre disponible.
   - Criterio: boleta creada en <3 min.
2. **Confirmación / edición**
   - Productos, cantidades, precios.
   - Criterio: corrección en 24h.
3. **Consulta de precios**
   - Precio por unidad + mejor tienda reciente.
   - Criterio: histórico simple visible.
4. **Historial de compras**
   - Lista cronológica.
   - Criterio: acceso a edición.
5. **Lista de compras inteligente**
   - Lista actual + ajustes por precios.
   - Criterio: sugerencia de ahorro básica.
6. **Índice de sustitución (inflación activa)**
   - PUR + desvío ≥15–20%.
   - Propuesta de sustitutos por categoría.
   - Criterio: ajuste confirmable en lista.

---

## EPIC E — Despensa (inventario mínimo)
1. **Inventario proyectado**
   - Inventario estimado + valor.
   - Criterio: alertas de merma básicas.
2. **Productos estratégicos**
   - Estado de precio + historial.
   - Criterio: prioridad de compra visible.
   - Regla: solo productos Clase A con min/max.
3. **Platos base**
   - Ingredientes + costo estimado.
   - Criterio: base para lista inteligente.
   - Constructor de platos (crea ingredientes y precio manual si no existe en boletas).
4. **Calendario de platos (básico)**
   - Semana / mes.
   - Criterio: asignación simple por día.

---

## Dependencias clave
- **Bitácora → Inicio:** proyecto activo y notificaciones dependen de `BitacoraEntry` + `Insight`.
- **Flujo → Horizonte:** requiere ingresos + compromisos + eventos.
- **Compras → Despensa:** precios por unidad alimentan inventario proyectado.
- **Despensa → Lista inteligente:** platos base requieren inventario mínimo.

---

# 🥇 Orden de ejecución (prioridad real MVP)

1. **Bitácora core**: vista principal → tarjeta → detalle. *(M)*
2. **Registro de boletas**: captura + confirmación/edición + historial. *(M)*
3. **Consulta de precios**: precio unitario + histórico simple. *(S)*
4. **Flujo mínimo**: ingresos + compromisos + eventos. *(M)*
5. **Distribución % ingreso + gráfico principal**. *(M)*
6. **Pulso del mes + mensaje IA**. *(S)*
7. **Consulta puntual (Q&A)**: respuesta guardada como tarjeta. *(S)*
8. **Conversión consulta → idea (Idea)**. *(S)*
9. **Conversión idea → proyecto + resumen en Inicio**. *(M)*
10. **Lista de compras inteligente (básica)**. *(M)*
11. **Índice de sustitución (inflación activa)**. *(M)*
12. **Inventario proyectado + alertas básicas**. *(M)*
13. **Productos estratégicos**. *(S)*
14. **Platos base + calendario básico**. *(M)*
15. **Flow categories + provisiones**. *(M)*
16. **Fondo de estabilización (invisible)**. *(S)*
17. **Horizonte 30–60 días** (alerta suave ≥3%). *(S)*
18. **Exportación Markdown**. *(S)*

---

# ⚠️ Riesgos y decisiones abiertas

1. **IA/Bitácora**: definir proveedor y límites de costo por consulta.
2. **Observaciones IA**: confirmar reglas de disparo exactas y frecuencia máxima.
3. **Modelo `BitacoraEntry`**: validar esquema final con backend antes de implementar UI.
4. **Horizonte 30–60 días**: definir fórmula de impacto mensual.
5. **Provisiones**: reglas de cálculo y periodicidad (mensual vs prorrateado).
6. **Fondo de estabilización**: regla de excedentes y visibilidad en UI.
7. **Registro de boletas**: OCR vs entrada manual (alcance MVP).
8. **Exportación MD**: definir formato final y rango por defecto.
9. **Inflación activa**: definición de PUR y criterio de sustitución.
10. **Distribución %**: definición de grupos iniciales y mapeo de gastos.
11. **Dashboard mínimo**: criterio exacto de estados (ok/alerta) y mensajes IA.

---

# 🧾 Issues reales (MVP)

## Bitácora
- **B-01** Vista principal (agrupada por tipo) *(M)*
- **B-02** Tarjeta unificada *(S)*
- **B-03** Detalle de tarjeta *(M)*
- **B-04** Consulta puntual (Q&A guiado) *(S)*
- **B-05** Conversión consulta → idea (Idea) *(S)*
- **B-06** Conversión idea → proyecto *(M)*
- **B-07** Proyectos activos *(S)*
- **B-08** Exportación Markdown *(S)*

## Inicio
- **I-01** Estado del hogar *(S)*
- **I-02** Horizonte 30–60 días *(S)*
- **I-03** Notificaciones relevantes *(S)*
- **I-04** Proyecto activo (resumen) *(S)*
- **I-05** Gráfico distribución de ingreso *(M)*
- **I-06** Pulso del mes *(S)*

## Flujo
- **F-01** Ingresos (fijos/variables) *(S)*
- **F-02** Compromisos *(S)*
- **F-03** Eventos de gasto *(S)*
- **F-04** Horizonte 30–60 días *(S)*
- **F-05** Flow categories + provisiones *(M)*
- **F-06** Fondo de estabilización (invisible) *(S)*
- **F-07** Distribución % ingreso *(M)*

## Compras
- **C-01** Registro de boletas *(M)*
- **C-02** Confirmación / edición *(M)*
- **C-03** Consulta de precios *(S)*
- **C-04** Historial de compras *(S)*
- **C-05** Lista de compras inteligente *(M)*
- **C-06** Índice de sustitución (inflación activa) *(M)*
- **C-07** Tiendas (lista + comparación básica) *(S)*

## Despensa
- **D-01** Inventario proyectado *(M)*
- **D-02** Productos estratégicos *(S)*
- **D-03** Platos base *(S)*
- **D-04** Calendario de platos (básico) *(M)*

---

# 📱 Prototipo textual (mobile-first)

> Estructura funcional sin diseño gráfico.

## Inicio (mobile)
```text
Barra superior: Inicio
Globos: Estado | Horizonte | Mes | Notificaciones | Proyecto

Estado
- Semáforo grande (verde/amarillo/rojo)
- Texto IA: 1 frase accionable

Horizonte
- Lista top 5 (fecha + impacto)
- Acción: "Ver horizonte completo"

Mes
- Gráfico distribución (Oxígeno/Vida/Blindaje)
- Texto IA asociado (1 mensaje)
- Pulso del mes (mini)

Notificaciones
- Lista de 3–5 insights
- Badges por impacto (medio/alto)

Proyecto
- Card proyecto activo (estado + horizonte + impacto)
- Acción: "Ver proyecto"
```

## Flujo (mobile)
```text
Barra superior: Flujo
Globos: Ingresos | Compromisos | Eventos | Horizonte | Distribución

Ingresos
- Lista mensual (fijos/variables)
- Total mensual calculado

Compromisos
- Recurrentes + deudas (lista)
- Próximo pago destacado

Eventos
- Anuales / técnicos / eventuales
- Próximos 30–60 días

Horizonte
- Provisión mensual + eventos próximos
- Alerta suave si impacto ≥3%

Distribución
- Meta vs real por grupo (Oxígeno/Vida/Blindaje)
- Diferencia $ y %
```

## Compras (mobile)
```text
Barra superior: Compras
Globos: Registro | Lista | Precios | Tiendas | Historial | Ahorro

Lista
- Lista actual
- Ajustes por precios
- Acción: "Confirmar lista"

Precios
- Precio unitario + mejor tienda
- Histórico simple

Tiendas
- Lista de tiendas detectadas
- Productos y precios recientes por tienda
- Comparación rápida (mejor tienda por producto)

Registro
- Botón foto boleta
- Campo texto rápido

Historial
- Boletas en orden cronológico
- Estado: ok / revisable

Ahorro
- Sugerencias por producto/tienda
- Sustituciones confirmables
```

## Despensa (mobile)
```text
Barra superior: Despensa
Globos: Inventario | Estratégicos | Platos | Calendario | Alertas

Inventario
- Inventario proyectado (valor + alertas)
- Solo productos Clase A

Estratégicos
- Estado de precio + prioridad compra

Platos
- Platos base + costo estimado
- Constructor de platos (ingredientes + precio manual)

Calendario
- Semana / Mes (toggle simple)
- Asignación por día

Alertas
- Merma / recompra temprana
```

## Bitácora (mobile)
```text
Barra superior: Bitácora
Globos: Observaciones | Consultas | Patrones | Ideas | Proyectos

Observaciones
- Tarjetas IA (leer/archivar)

Consultas
- Input corto + botón "Analizar"
- Respuesta como tarjeta

Patrones
- Tarjetas de patrón + acciones sugeridas

Ideas
- Tarjetas Idea (estado)
- Acción: "Convertir en proyecto"

Proyectos
- Tarjetas con progreso
- Acción: "Ver detalle"
```

---

# 🧭 Pantalla temporal — Progreso del Roadmap (borrable)

> Objetivo: ver rápido “dónde vamos” en cada sesión.  
> Esta pantalla es **temporal** y se puede eliminar después del MVP.

## Ubicación sugerida (temporal)
- Configuración → “Progreso MVP”

## Contenido (mobile)
```text
Barra superior: Progreso MVP

Progreso general
- Barra 0–100% (según tickets completados)
- % grande + texto: "X de Y completados"

Checklist por fase
- Fase 1 (Fundaciones): [✔] Estado, Compras, Flujo, Bitácora core
- Fase 2 (Bitácora decisiones): [ ] Consulta, Idea, Proyecto
- Fase 3 (Despensa/Compra): [ ] Lista inteligente, Inventario, Platos
- Fase 4 (Tranquilidad): [ ] Observaciones IA, Export MD
- Fase 5 (Estrategia): [ ] Simulación, Insights

Última sesión
- Fecha/hora última actualización
- Último hito marcado

Notas rápidas
- Campo texto corto (opcional)
```

## Lógica de progreso
- Cada fase suma % según tickets del backlog MVP.
- Estado se actualiza manualmente al cierre de cada sesión (por ahora).
- Se guarda en `households/{id}/roadmap_progress`.

## Implementación rápida (orden recomendado)
1. Mapear cada ticket del backlog a una fase (F1–F5).
2. Definir esquema `roadmap_progress`.
3. UI simple con checklist + barra de progreso.

## Mapeo de tickets → Fases

**Fase 1 (Fundaciones)**
- I-01, I-02, I-03, I-05, I-06
- F-01, F-02, F-03, F-07
- B-01, B-02, B-03
- C-01, C-02, C-03, C-04

**Fase 2 (Bitácora decisiones)**
- B-04, B-05, B-06, B-07
- I-04

**Fase 3 (Despensa / Compra mensual)**
- C-05, C-06
- C-07
- D-01, D-02, D-03, D-04

**Fase 4 (Tranquilidad operativa)**
- B-08
- F-05, F-06, F-04

**Fase 5 (Estrategia)**
- Post‑v1 (TCO, trade‑offs, emoción opt‑in, distribución dinámica)

## Esquema `roadmap_progress` (v1)
```json
{
  "householdId": "h1",
  "updated_at": "2026-01-25T12:00:00Z",
  "phases": {
    "F1": { "total": 16, "done": 0, "percent": 0, "items": ["I-01","I-02","I-03","I-05","I-06","F-01","F-02","F-03","F-07","B-01","B-02","B-03","C-01","C-02","C-03","C-04"] },
    "F2": { "total": 5, "done": 0, "percent": 0, "items": ["B-04","B-05","B-06","B-07","I-04"] },
    "F3": { "total": 6, "done": 0, "percent": 0, "items": ["C-05","C-06","D-01","D-02","D-03","D-04"] },
    "F4": { "total": 4, "done": 0, "percent": 0, "items": ["B-08","F-05","F-06","F-04"] },
    "F5": { "total": 0, "done": 0, "percent": 0, "items": [] }
  },
  "last_completed": { "id": "B-01", "when": "2026-01-25" },
  "notes": "Sesión 3: cerramos Bitácora core."
}
```

## Formato de update diario (rápido)
```text
Fecha: 2026-01-25
Fase actual: F1
Completados hoy: B-01, B-02
Bloqueos: ninguno
Próximo paso: B-03
Notas: revisión rápida de tarjetas
```

---

# 🤖 Reglas IA y mensajes asociados a gráficos

## Gráfico 1 — Distribución del ingreso (Oxígeno/Vida/Blindaje)
**Estados**
- **OK:** todos los grupos dentro de ±5% de su meta.
- **Alerta suave:** un grupo supera +10% de su meta o queda en -10%.
- **Alerta alta:** dos grupos fuera de ±15% o Blindaje = 0%.

**Mensajes canónicos (1 activo)**
- OK: “Vas en línea con tu distribución. Mantén el ritmo.”
- Alerta suave (Oxígeno > meta): “Si reduces $X en Oxígeno, Blindaje puede subir a Y%.”
- Alerta suave (Blindaje < meta): “Queda $Y para Blindaje este mes.”
- Alerta alta (Blindaje = 0): “No hay margen de Blindaje sin ajustar Oxígeno.”

## Gráfico 2 — Pulso del mes
**Estados**
- **Verde:** gasto real ≤ promedio histórico.
- **Amarillo:** gasto real 5–10% sobre promedio.
- **Rojo:** gasto real ≥10% sobre promedio.

**Mensajes canónicos (1 activo)**
- Verde: “Mes estable respecto a tu promedio.”
- Amarillo: “El mes viene más ajustado. Ojo con gastos variables.”
- Rojo: “Ritmo alto de gasto. Revisa variables esta semana.”

## Reglas generales
- 1 mensaje activo por gráfico (máximo 2 mensajes en Inicio).
- Lenguaje descriptivo, no moral.
- Si hay observación IA relevante, priorizarla sobre el mensaje del gráfico.

---

# 🧭 Flujos UX detallados (mobile-first)

## Bitácora — Consulta → Idea → Proyecto
1. Usuario abre **Consultas** y escribe pregunta corta.
2. IA responde y se crea tarjeta `question`.
3. Usuario elige **Acción: Convertir en Idea**.
4. Formulario ligero (nombre, tipo, costo, horizonte) prellenado.
5. Se guarda como `idea` con estado **Explorando**.
6. Usuario acepta → **Acción: Convertir en proyecto**.
7. Se crea `project`, aparece en Inicio y se genera Insight inicial.

## Compras — Registro de boleta → Historial → Precios
1. Usuario abre **Registro de boletas** y captura foto o texto.
2. Sistema crea boleta en estado “revisable”.
3. Usuario confirma productos/cantidades/precios.
4. Boleta pasa a “ok” y actualiza **Historial**.
5. Precios por unidad se actualizan y alimentan **Consulta de precios**.

## Flujo — Compromiso/Evento → Provisión → Horizonte
1. Usuario registra compromiso o evento con `flow_category`.
2. Sistema calcula provisión mensual automática.
3. **Horizonte** muestra impacto 30–60 días con provisiones.
4. Si impacto ≥3%: alerta suave + mensaje IA.

## Distribución % — Meta vs Real → Mensaje IA
1. Se mapea gasto a grupo (Oxígeno/Vida/Blindaje).
2. Sistema calcula % real mensual vs meta.
3. Gráfico en Inicio muestra desviación.
4. IA muestra 1 mensaje contextual (acción única).

---

# 🧩 Modelo de datos y reglas de negocio (v1)

## Entidades nuevas / extendidas
- **IncomeDistributionGroup**: nombre, meta_pct, orden, activo.
- **Gasto/Compromiso/Evento**: `flow_category` (structural | provision | discretionary).
- **BitacoraEntry**: `emotion_tag` opcional (cansado, apurado, celebración).

## Reglas de negocio clave
1. **Provisiones**  
   - Eventos anuales se prorratean mensualmente.  
   - Horizonte usa provisiones, no el total del mes puntual.  

2. **Fondo de estabilización**  
   - Excedentes mensuales se trasladan a buffer.  
   - No se muestran como “gastables” en UI.  

3. **Distribución % ingreso**  
   - Cada gasto se mapea a Oxígeno/Vida/Blindaje.  
   - % real mensual se calcula automáticamente (sin input manual).  
   - Diferencia vs meta se expresa en $ y %.  

4. **Inflación activa (sustitución)**  
   - PUR con desvío ≥15–20% gatilla sugerencia.  
   - Sustitutos por categoría (confirmables).  

5. **Despensa estratégica**  
   - Solo productos Clase A tienen min/max.  
   - Alertas por recompra temprana o inmovilización prolongada.  

6. **Observaciones IA**  
   - Solo si hay patrón + impacto.  
   - Máx 3–5 observaciones activas.  

---

# 🛠️ Plan técnico por módulo (frontend / backend / IA)

## Inicio
- **Frontend:** semáforo + gráfico distribución + pulso del mes + tarjetas (notificaciones, proyecto).
- **Backend:** agregados mensuales, estados (ok/alerta), métricas de distribución.
- **IA:** mensaje asociado por estado (1 activo).

## Flujo
- **Frontend:** vistas ingresos/compromisos/eventos/horizonte/distribución.
- **Backend:** provisiones + fondo estabilización + cálculo horizonte.
- **IA:** alertas suaves y explicaciones de impacto.

## Compras
- **Frontend:** registro boleta, historial, precios, ahorro.
- **Backend:** precios por unidad + PUR + sustituciones.
- **IA:** sugerencias de sustituto (confirmables).

## Despensa
- **Frontend:** inventario proyectado + alertas.
- **Backend:** min/max solo en productos Clase A.
- **IA:** alertas de merma/inmovilización.
 - **Platos base:** constructor con alta rápida de producto y precio manual.

## Bitácora
- **Frontend:** bloques por tipo + detalle + acciones.
- **Backend:** `BitacoraEntry` + `Insight`.
- **IA:** observaciones + simulaciones + conversión a Idea.

## Dependencias técnicas
- Distribución % depende de mapeo de gastos a grupos.
- Horizonte depende de provisiones y fondo de estabilización.
- Sustituciones dependen de PUR e histórico por categoría.

---

# 🗃️ Esquema Firestore + endpoints (v1)

## Colecciones (Firestore)
- `households/{householdId}`
- `users/{userId}`
- `receipts/{receiptId}`
- `receiptItems/{itemId}`
- `products/{productId}`
- `prices/{priceId}`
- `stores/{storeId}`
- `incomes/{incomeId}`
- `commitments/{commitmentId}`
- `events/{eventId}`
- `inventory/{inventoryId}`
- `meals/{mealId}`
- `bitacoraEntries/{entryId}`
- `insights/{insightId}`
- `incomeDistributionGroups/{groupId}`

## Campos clave (referencia rápida)
- `commitments/events`: `flow_category` = structural | provision | discretionary
- `products`: `class` = A | B | C
- `inventory`: `stock_min`, `stock_max` (solo Clase A)
- `bitacoraEntries`: `type`, `impact`, `status`, `emotion_tag`?
- `incomeDistributionGroups`: `name`, `meta_pct`, `order`, `active`

## Endpoints (si se usa API)
- `GET /dashboard` → estado hogar + distribución + pulso + notificaciones
- `GET /bitacora` → listados por tipo
- `GET /bitacora/:id` → detalle
- `POST /bitacora/question` → crear consulta
- `POST /bitacora/idea` → convertir a Idea
- `POST /bitacora/project` → convertir a Proyecto
- `GET /flow/horizon` → horizonte 30–60 días
- `GET /purchases/prices` → precio unitario + histórico

## Payloads (v1)

### GET /dashboard
**Response**
```json
{
  "household_state": "green",
  "pulse": { "state": "yellow", "delta_pct": 7 },
  "distribution": [
    { "group": "Oxígeno", "meta_pct": 50, "real_pct": 58, "delta_pct": 8 }
  ],
  "insights": [
    { "id": "ins_1", "message": "Queda $Y para Blindaje.", "impact": "medium" }
  ],
  "active_project": { "id": "p1", "name": "Viaje", "horizon_months": 6 }
}
```

### GET /bitacora?type=idea&status=active
**Response**
```json
{
  "items": [
    { "id": "b1", "type": "idea", "title": "Viaje", "impact": "medium", "updated_at": "2026-01-24" }
  ]
}
```

### GET /bitacora/:id
**Response**
```json
{
  "id": "b1",
  "type": "idea",
  "title": "Viaje",
  "content": "markdown...",
  "impact": "medium",
  "status": "active"
}
```

### POST /bitacora/question
**Request**
```json
{ "question": "¿Compro ahora o espero?", "context": { "month": "2026-01" } }
```
**Response**
```json
{ "id": "b2", "type": "question", "answer": "..." }
```

### POST /bitacora/idea
**Request**
```json
{ "source_id": "b2", "name": "Viaje", "estimated_cost": 800000, "horizon_months": 6 }
```
**Response**
```json
{ "id": "b3", "type": "idea", "status": "active" }
```

### POST /bitacora/project
**Request**
```json
{ "source_id": "b3", "monthly_target": 130000 }
```
**Response**
```json
{ "id": "b3", "type": "project", "status": "active" }
```

### GET /flow/horizon
**Response**
```json
{
  "window_days": 60,
  "items": [
    { "name": "Seguro auto", "impact_pct": 4, "due_date": "2026-02-15" }
  ]
}
```

### GET /purchases/prices
**Response**
```json
{
  "product_id": "prod1",
  "unit_price": 1200,
  "history": [1100, 1150, 1200],
  "store_best": "Tienda X"
}
```

---

# 🔐 Reglas de seguridad (Firestore) — borrador v1

## Principios
- Cada usuario solo accede a su `householdId`.
- Lectura/escritura limitada por rol (admin / editor / viewer).
- Bitácora privada por hogar, no por usuario.

## Reglas (pseudocódigo)
```js
match /households/{householdId} {
  allow read, write: if isMember(householdId);
}

match /{collection}/{docId} {
  allow read: if isMember(resource.data.householdId);
  allow write: if isEditor(resource.data.householdId);
}

match /bitacoraEntries/{docId} {
  allow read: if isMember(resource.data.householdId);
  allow write: if isEditor(resource.data.householdId);
}
```

## Roles sugeridos
- **admin**: acceso total + configuración.
- **editor**: crear/editar datos operativos.
- **viewer**: solo lectura.

---

# 🔎 Queries Firestore por pantalla (v1)

## Inicio
- Estado del hogar: agregados de `incomes`, `commitments`, `events` por mes.
- Distribución %: `incomeDistributionGroups` + gastos del mes mapeados.
- Pulso: suma semanal vs promedio mensual.
- Notificaciones: `insights` activos (impact medium/high).
- Proyecto activo: `bitacoraEntries` con `type=project` y `status=active`.

## Flujo
- Ingresos: `incomes` del mes (fijos/variables).
- Compromisos: `commitments` activos + `flow_category`.
- Eventos: `events` próximos 30–60 días.
- Horizonte: combinación provisiones + eventos próximos.
- Distribución: gastos agrupados por `IncomeDistributionGroup`.

## Compras
- Registro/Historial: `receipts` por fecha desc.
- Precios: `prices` por `productId` + `stores` mejor precio.
- Tiendas: `stores` list + `/stores/{id}/products`.
- Lista inteligente: `inventory` + `prices` + reglas de sustitución.

## Despensa
- Inventario: `inventory` solo productos Clase A.
- Estratégicos: `products` con `class=A`.
- Alertas: `inventory` con recompra temprana o inmovilización.
- Platos base: `meals` + ingredientes con precio manual si no existen en boletas.

## Bitácora
- Lista: `bitacoraEntries` por `type` + `status=active`.
- Detalle: `bitacoraEntries/{id}`.

---

# 📇 Índices recomendados (Firestore)

## bitacoraEntries
- `householdId, type, status, updated_at` (ordenado desc).
- `householdId, impact, updated_at`.

## receipts
- `householdId, created_at` (desc).
- `householdId, status, created_at`.

## prices
- `productId, created_at` (desc).
- `productId, storeId, created_at`.

## commitments / events
- `householdId, flow_category, next_due_date`.
- `householdId, due_date` (rango 30–60 días).

## insights
- `householdId, impact, resolved`.

## inventory
- `householdId, productId`.
- `householdId, class`.

---

# ✅ Validaciones y reglas de entrada (v1)

## Ingresos / Compromisos / Eventos
- `amount` > 0.
- `flow_category` obligatorio (structural | provision | discretionary).
- Fechas futuras válidas para eventos.

## Boletas / Ítems
- Boleta debe tener fecha y al menos 1 ítem.
- Ítems con `quantity` > 0 y `unit_price` > 0.

## Productos estratégicos
- Solo Clase A puede tener `stock_min`/`stock_max`.
- `stock_min` < `stock_max`.

## Bitácora
- `type` y `status` obligatorios.
- `emotion_tag` opcional y acotado a lista permitida.

## Distribución % ingreso
- Suma de `meta_pct` debe ser 100% (tolerancia ±1%).

# 🧠 Disparadores de observaciones IA (canónicos)

## Regla madre
Una observación IA solo se crea si hay patrón + impacto. Nada de “datos curiosos”.

## 1. Flujo de dinero
- Variación ≥ 15–20% vs promedio 2–3 meses.
- Mes proyectado en riesgo antes del día 15.
- Máximo 1 observación por categoría / mes.
- Desviación relevante vs meta de distribución (Oxígeno/Vida/Blindaje).

## 2. Eventos de gasto
- Evento dentro de 30 días con impacto histórico.
- 2 o más eventos en el mismo mes.

## 3. Compras y precios
- Precio por unidad > 20% del histórico en productos estratégicos.
- Cambio de tienda más cara sin razón aparente.

## 4. Despensa / inventario
- Posible merma (compra grande sin consumo esperado).
- Recompra temprana.

## 5. Bitácora (cognitivo)
- Idea recurrente (≥ 2–3 veces).
- Idea evaluado varias veces sin pasar a proyecto.

## 6. Proyectos / Ideas
- Proyecto en riesgo (ahorro real < esperado por 2 períodos).
- Proyecto alineado (avance sostenido sin tensión en flujo).

## 7. Señales humanas
- Nota humana + datos que la confirman.

## Reglas de freno
- Máx 3–5 observaciones activas.
- Se resuelven o archivan.
- Nunca repetir el mismo insight sin cambios.
- Lenguaje descriptivo, no moral.

---

# ⚙️ Reglas suaves (ajuste automático)

- Presupuesto de referencia inicial: **2.000.000** (cuando aún no hay ingresos ingresados).
- Gasto promedio supermercado: **500.000–600.000** mensuales (referencia para KPIs de compra).
- Al registrar ingresos reales: recalcular umbrales cada mes usando el total de ingresos del mes.
- Mínimo de seguridad: no permitir que los umbrales bajen de **1.500.000** para evitar alertas demasiado sensibles en meses flojos.
- Umbral de alertas suaves: **≥3%** del presupuesto mensual vigente.



