# 📐 WIREFRAMES TEXTUALES — SISTEMA CBC FAMILY

> **Documento de referencia para implementación**
> Última actualización: 2026-01-21

---

## 🎯 FILOSOFÍA DE DISEÑO (NO ROMPER)

### Principios Fundamentales

| ✅ HACER | ❌ NO HACER |
|----------|-------------|
| Mostrar estados emocionales | Mostrar tablas de datos |
| Usar color como lenguaje | Usar números como protagonistas |
| Mascotas como comunicadores | Mascotas como decoración |
| Respuesta en 3 segundos | Explicar con texto largo |
| El sistema recuerda | El usuario memoriza |
| Patrones aprendidos | Planificación manual |

### Sistema de Colores (Semáforo Emocional)

- 🟢 **Verde**: Todo bien, tranquilo, estable
- 🟡 **Amarillo**: Atención, revisar, se acerca algo
- 🔴 **Rojo**: Acción requerida, caro, fuera de rango

### Rol de Mascotas

| Mascota | Personalidad | Cuándo aparece |
|---------|--------------|----------------|
| 🐶 **Perro** | Valida, calma, acompaña | Dashboard, estado general |
| 🐱 **Gato** | Analiza, observa, detecta | Boletas, productos, detalles |

---

## 1️⃣ DASHBOARD PRINCIPAL — "Estado del Hogar"

### 🎯 Propósito
Responder en **3 segundos**:
> "¿Cómo estamos como familia hoy?"

### 🧱 Estructura (de arriba hacia abajo)

#### A. Header
- Título: **Estado del Hogar**
- Fecha contextual (ej. "Semana actual" o "Este mes")
- Sin selector de mes

#### B. Indicador Central (PROTAGONISTA)
```
┌─────────────────────────────────────┐
│                                     │
│        [COLOR DOMINANTE]            │
│                                     │
│            ✔ / ⚠ / ❗               │
│                                     │
│      "El hogar está tranquilo"      │
│                                     │
│             🐶                      │
│        (postura según estado)       │
│                                     │
└─────────────────────────────────────┘
```
- Tarjeta grande o círculo
- Color dominante: verde / amarillo / rojo
- Ícono central: ✔ (bien) / ⚠ (atención) / ❗ (acción)
- Texto corto debajo (1 línea)
- Mascota 🐶 integrada con postura según estado

#### C. Bloque: "Próximo en el Horizonte"
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 🟡 💡    │ │ 🟢 🌐    │ │ 🔴 💳    │
│ Luz      │ │ Internet │ │ Tarjeta  │
│ Se acerca│ │ Todo ok  │ │ Revisar  │
└──────────┘ └──────────┘ └──────────┘
```
- Máximo 3 tarjetas pequeñas
- Sin fechas exactas grandes
- El sistema recuerda, el usuario reacciona

#### D. Bloque: "Zona de Gasto"
```
┌─────────────────────────────────────┐
│ [████████████░░░░░]                 │
│ "Dentro de lo normal"               │
└─────────────────────────────────────┘
```
- Barra visual gruesa
- Color según desviación
- Texto humano, sin montos por defecto
- Monto aparece solo si se toca

#### E. Atajos Visuales (Footer)
```
      🛒              📦              🏪
    Compras        Productos       Tiendas
      [•]                            [•]
```
- 3 iconos grandes
- Punto de color si hay algo relevante
- Sin números acumulados

---

## 2️⃣ PANTALLA — INGRESO DE BOLETAS

### 🎯 Propósito
> "Registrar un gasto sin pensar"

### 🧱 Estructura

#### A. Acción Principal
```
┌─────────────────────────────────────┐
│                                     │
│          📸 Subir boleta            │
│                                     │
│    ────────── o ──────────          │
│                                     │
│         ✍️ Gasto rápido             │
│                                     │
└─────────────────────────────────────┘
```

#### B. Resultado Post-IA
```
┌─────────────────────────────────────┐
│  [COLOR ESTADO]                     │
│                                     │
│  🏪 Supermercado Kosten             │
│  💰 $4.800                          │
│                                     │
│  ┌─────────┐  ┌─────────────┐       │
│  │✅ Confirmar│ │👁 Ver detalle│       │
│  └─────────┘  └─────────────┘       │
│                                     │
│         🐱 "Boleta registrada"      │
│                                     │
└─────────────────────────────────────┘
```
- Mascota 🐱 aparece:
  - 😼 si todo bien
  - 👀 si detectó algo raro

---

## 3️⃣ PANTALLA — PRODUCTOS ESTRATÉGICOS

### 🎯 Propósito
> "¿Qué conviene comprar y cuándo?"

### 🧱 Estructura

#### A. Header
- "Productos importantes"
- Filtros simples: Esenciales / Despensa / Limpieza

#### B. Lista por Tarjetas
```
┌──────────┐ ┌──────────┐ ┌──────────┐
│ 🟢 🍚    │ │ 🟡 🥛    │ │ 🔴 🧈    │
│ Arroz    │ │ Leche    │ │ Mantequilla│
│ Estable  │ │ Subiendo │ │ Caro     │
└──────────┘ └──────────┘ └──────────┘
```
- Sin precios visibles por defecto
- Color = estado

#### C. Al Tocar Producto
```
┌─────────────────────────────────────┐
│  🧈 Mantequilla                     │
│                                     │
│  Precio: $2.500/un                  │
│  Mejor en: Jumbo                    │
│  vs. Líder: +$300                   │
│                                     │
│  🐱 "Este suele estar más barato    │
│      en Jumbo"                      │
│                                     │
└─────────────────────────────────────┘
```

---

## 4️⃣ PANTALLA — TIENDAS

### 🎯 Propósito
> "Recordar el perfil mental de cada tienda"

### 🧱 Estructura

#### A. Lista de Tiendas
```
┌─────────────────────────────────────┐
│ 🟢 🏪 Jumbo                         │
│ "Barata para compras grandes"       │
├─────────────────────────────────────┤
│ 🟡 🏪 Almacén Don Pepe              │
│ "Cerca, pero más cara"              │
├─────────────────────────────────────┤
│ 🟢 🏪 Líder                         │
│ "Buena para despensa"               │
└─────────────────────────────────────┘
```
- Nada de totales grandes
- Ícono + color base + nombre + frase descriptiva

#### B. Enseñanza de Tiendas (si aplica)
```
┌─────────────────────────────────────┐
│  Nueva tienda detectada:            │
│  "COMERCIAL LOS ANDES SPA"          │
│                                     │
│  ¿Cómo le llamamos?                 │
│  [________________]                 │
│                                     │
│  [Guardar]                          │
└─────────────────────────────────────┘
```

---

## 5️⃣ PANTALLA — ASISTENTE (IA)

### 🎯 Propósito
> "Pensar en voz alta sin entrar a pantallas técnicas"

### 🧱 Estructura

#### A. Chat Limpio
```
┌─────────────────────────────────────┐
│                                     │
│  🐶 "Todo está dentro de lo normal" │
│                                     │
│              "¿Cómo vamos este mes?"│
│                                     │
│  🐱 "Este mes gastaste un poco más  │
│      en Despensa, pero nada grave"  │
│                                     │
│              "¿Conviene comprar     │
│               arroz ahora?"         │
│                                     │
│  🐱 "Sí, está estable. En Jumbo     │
│      lo vi a $1.200/kg"             │
│                                     │
│  [____________________________] 📤  │
│                                     │
└─────────────────────────────────────┘
```

#### B. Consultas Naturales Sugeridas
- "¿Cómo vamos este mes?"
- "¿Qué viene pronto?"
- "¿Conviene comprar arroz ahora?"
- "¿Dónde compré la última vez?"

---

## 🔐 PRINCIPIOS DE IMPLEMENTACIÓN (SAGRADOS)

### ❌ PROHIBIDO
- Crear pantallas de planificación mensual
- Copiar meses
- Checklists de cuentas
- Tablas de Excel en UI
- Números como protagonistas
- Mascotas decorativas

### ✅ OBLIGATORIO
- Todo se aprende por patrones
- Todo se muestra como estado
- La IA recuerda, el usuario no
- Color = emoción
- Mascota = comunicación
- 3 segundos máximo para entender

---

## 🧭 RESUMEN EJECUTIVO

> Este sistema NO replica Excel ni Notion.
> Es un sistema vivo que aprende patrones,
> anticipa pagos y muestra estados emocionales claros.

| Pantalla | Pregunta que responde | Mascota |
|----------|----------------------|---------|
| Dashboard | "¿Cómo estamos?" | 🐶 |
| Boletas | "¿Se registró bien?" | 🐱 |
| Productos | "¿Qué conviene?" | 🐱 |
| Tiendas | "¿Cómo es cada lugar?" | Opcional |
| Asistente | "Quiero pensar en voz alta" | 🐶 + 🐱 |

---

# 🧩 BACKLOG TÉCNICO POR PANTALLA

> Contratos de API y tareas de frontend específicas

---

## 1️⃣ DASHBOARD — Especificación Técnica

### 🎯 Función técnica
Consolidar **estado global**, **anticipación de pagos** y **zona de gasto**, sin cálculos manuales del usuario.

### 🔌 Backend / API

**Endpoint:**
```
GET /api/dashboard/summary
```

**Response:**
```json
{
  "household_status": "green | yellow | red",
  "status_message": "El hogar está tranquilo",
  "upcoming_items": [
    {
      "id": "string",
      "type": "utility | credit | subscription | other",
      "label": "Luz",
      "status": "green | yellow | red"
    }
  ],
  "spending_zone": {
    "status": "green | yellow | red",
    "label": "Dentro de lo normal"
  }
}
```

📌 **Notas técnicas:**
- NO calcula por mes explícito
- Usa ventanas móviles (últimos 30-45 días)
- No retorna montos exactos por defecto

### 🖥 Frontend - Tareas

| Tarea | Descripción |
|-------|-------------|
| `DASH-01` | Renderizar indicador central según `household_status` |
| `DASH-02` | Cambiar color + icono automáticamente |
| `DASH-03` | Mostrar mascota 🐶 según estado (3 posturas) |
| `DASH-04` | Renderizar bloque "Próximo en el horizonte" (máx. 3 ítems) |
| `DASH-05` | Renderizar barra "Zona de gasto" con color dinámico |
| `DASH-06` | Atajos visuales con puntos de notificación |

❌ No editable
❌ No selects de mes
✔️ Solo lectura + reacción

---

## 2️⃣ INGRESO DE BOLETAS — Especificación Técnica

### 🎯 Función técnica
Registrar gastos con **mínima fricción**, dejando la inteligencia al backend.

### 🔌 Backend / API

**Endpoint upload:**
```
POST /api/receipts/upload
Content-Type: multipart/form-data
```

**Input:**
- `image`: archivo imagen
- `source`: "telegram" | "web"

**Response:**
```json
{
  "receipt_id": "uuid",
  "store_name": "Supermercado Kosten",
  "total": 4800,
  "status": "ok | review",
  "items_count": 3
}
```

**Endpoint confirmación:**
```
POST /api/receipts/{id}/confirm
```

**Input:**
```json
{
  "store_name": "string (opcional, si corrige)",
  "total": "number (opcional, si corrige)"
}
```

### 🖥 Frontend - Tareas

| Tarea | Descripción |
|-------|-------------|
| `REC-01` | Botón grande para subir foto (drag & drop + click) |
| `REC-02` | Mostrar estado de procesamiento (loading) |
| `REC-03` | Tarjeta resultado: tienda, total, color según `status` |
| `REC-04` | Botón "Confirmar" |
| `REC-05` | Botón "Ver detalle" (lazy load items) |
| `REC-06` | Mascota 🐱 aparece post-procesamiento |
| `REC-07` | Input de gasto rápido (alternativa texto) |

---

## 3️⃣ PRODUCTOS ESTRATÉGICOS — Especificación Técnica

### 🎯 Función técnica
Mostrar **inteligencia de precios**, no inventario ni contabilidad.

### 🔌 Backend / API

**Endpoint lista:**
```
GET /api/products/strategic?category=esenciales|despensa|limpieza
```

**Response:**
```json
[
  {
    "product_id": "uuid",
    "name": "Arroz",
    "icon": "🍚",
    "status": "green | yellow | red",
    "summary": "Estable"
  }
]
```

**Endpoint detalle:**
```
GET /api/products/{id}/insight
```

**Response:**
```json
{
  "product_id": "uuid",
  "name": "Arroz",
  "unit_price": 1200,
  "unit": "kg",
  "best_store": "Jumbo",
  "comparison": "+$150 en Líder",
  "trend": "stable | rising | falling",
  "cat_message": "Este suele estar más barato en Jumbo"
}
```

### 🖥 Frontend - Tareas

| Tarea | Descripción |
|-------|-------------|
| `PROD-01` | Renderizar grid de tarjetas por producto |
| `PROD-02` | Filtros por categoría (tabs o chips) |
| `PROD-03` | Color + icono según `status` |
| `PROD-04` | Ocultar precios por defecto |
| `PROD-05` | On tap → fetch insight y mostrar modal/panel |
| `PROD-06` | Mascota 🐱 con frase contextual |

---

## 4️⃣ TIENDAS — Especificación Técnica

### 🎯 Función técnica
Representar **memoria contextual del sistema**, no análisis financiero.

### 🔌 Backend / API

**Endpoint lista:**
```
GET /api/stores
```

**Response:**
```json
[
  {
    "store_id": "uuid",
    "name": "Almacén Don Pepe",
    "profile": "Barata para compras grandes",
    "status": "green | yellow | red",
    "aliases": ["COMERCIAL LOS ANDES SPA"]
  }
]
```

**Endpoint enseñanza:**
```
POST /api/stores/teach
```

**Input:**
```json
{
  "raw_name": "COMERCIAL LOS ANDES SPA",
  "friendly_name": "Almacén Don Pepe"
}
```

### 🖥 Frontend - Tareas

| Tarea | Descripción |
|-------|-------------|
| `STORE-01` | Renderizar lista de tiendas como tarjetas |
| `STORE-02` | Mostrar frase descriptiva (perfil) |
| `STORE-03` | Color base según `status` |
| `STORE-04` | Sin totales ni gráficos |
| `STORE-05` | Modal de enseñanza si hay tienda pendiente |

---

## 5️⃣ ASISTENTE (IA) — Especificación Técnica

### 🎯 Función técnica
Canal conversacional para **consulta, validación y anticipación**.

### 🔌 Backend / API

**Endpoint query:**
```
POST /api/assistant/query
```

**Input:**
```json
{
  "message": "¿Cómo vamos este mes?",
  "context": {
    "current_screen": "dashboard | receipts | products | stores"
  }
}
```

**Response:**
```json
{
  "reply": "Este mes gastaste un poco más en Despensa, pero nada grave.",
  "tone": "calm | alert | insight",
  "mascot": "dog | cat",
  "suggestions": [
    "¿Qué viene pronto?",
    "¿Conviene comprar arroz?"
  ]
}
```

### 🖥 Frontend - Tareas

| Tarea | Descripción |
|-------|-------------|
| `ASSIST-01` | Chat UI con burbujas grandes |
| `ASSIST-02` | Input de texto + botón enviar |
| `ASSIST-03` | Seleccionar mascota según `mascot` response |
| `ASSIST-04` | Mostrar sugerencias como chips clickeables |
| `ASSIST-05` | Scroll corto, pocas burbujas por pantalla |
| `ASSIST-06` | No mostrar data cruda ni listas largas |

---

## 🔐 REGLAS GLOBALES TÉCNICAS

### ❌ PROHIBIDO en API
- Endpoints de CRUD manual de presupuestos
- Endpoints de planificación mensual editable
- Retornar listas largas sin paginación
- Exponer montos sin contexto de estado

### ✅ OBLIGATORIO en API
- Todo endpoint retorna `status` (green/yellow/red)
- Mensajes humanizados incluidos en response
- Mascota sugerida cuando aplica
- Ventanas temporales móviles, no meses fijos

---

## 📋 RESUMEN DE ENDPOINTS

| Pantalla | Método | Endpoint | Prioridad |
|----------|--------|----------|-----------|
| Dashboard | GET | `/api/dashboard/summary` | P0 |
| Boletas | POST | `/api/receipts/upload` | P0 |
| Boletas | POST | `/api/receipts/{id}/confirm` | P0 |
| Productos | GET | `/api/products/strategic` | P1 |
| Productos | GET | `/api/products/{id}/insight` | P1 |
| Tiendas | GET | `/api/stores` | P1 |
| Tiendas | POST | `/api/stores/teach` | P1 |
| Asistente | POST | `/api/assistant/query` | P2 |

---

# 🧠 BLOQUE LÓGICO — SISTEMA DE ESTADOS (VERDE / AMARILLO / ROJO)

> **Regla madre del sistema:**
> El estado no refleja números, refleja desviaciones respecto a lo normal.

No comparamos contra "presupuesto fijo", sino contra **patrones aprendidos**.

---

## 0️⃣ Conceptos Base (Fundamentales)

### 🧩 Ventanas Temporales

El sistema trabaja con **ventanas móviles**, no meses calendario.

| Ventana | Duración | Uso |
|---------|----------|-----|
| Corta | **7 días** | Alertas inmediatas |
| Media | **30 días** | Estado actual |
| Larga | **90 días** | Aprendizaje de patrones |

📌 Esto evita el "reinicio mental" de cada mes.

### 🧠 Baseline (Línea Base)

Para cualquier cosa (gasto, producto, cuenta), el baseline es:

> **El promedio + variabilidad histórica reciente**

**Técnicamente:**
- Media móvil
- Desviación estándar simple
- O percentiles (p50 / p75)

No necesitamos fórmulas complejas ahora, solo **consistencia**.

---

## 1️⃣ ESTADO DEL HOGAR (Dashboard Principal)

### 🎯 Qué Resume
Un **estado único**, priorizado, que responde:
> "¿Cómo estamos como hogar?"

### 🧮 Inputs
- Zona de gasto
- Pagos próximos
- Eventos críticos (atrasos, picos)
- Alertas de productos esenciales

### 🟢 VERDE — Hogar Tranquilo

**Se cumple TODO:**
- Gasto total dentro de rango normal (≤ baseline + 10%)
- No hay pagos críticos próximos
- No hay eventos rojos activos

**Mensaje:** `"El hogar está tranquilo"`
**Mascota 🐶:** Relajada

### 🟡 AMARILLO — Atención

**Se cumple AL MENOS UNO:**
- Gasto entre +10% y +25% del baseline
- Pago recurrente entrando en ventana crítica
- Producto estratégico subiendo de precio

**Mensaje:** `"Hay cosas que conviene mirar"`
**Mascota 🐶:** Atenta

### 🔴 ROJO — Acción Requerida

**Se cumple AL MENOS UNO:**
- Gasto > +25% del baseline
- Pago vencido o muy próximo sin registro
- Evento crítico detectado (pico abrupto)

**Mensaje:** `"Este periodo requiere atención"`
**Mascota 🐶:** Alerta

📌 **Regla de precedencia:**
Si hay un rojo, **todo el hogar es rojo**, aunque lo demás esté verde.

---

## 2️⃣ ZONA DE GASTO (Presupuesto Implícito)

### 🎯 Qué Representa
No "presupuesto", sino:
> **Qué tan lejos estamos de nuestro patrón normal**

### 🟢 VERDE
- Gasto acumulado ≤ baseline + 10%
- **Etiqueta:** `"Dentro de lo normal"`

### 🟡 AMARILLO
- Gasto entre +10% y +25%
- **Etiqueta:** `"Un poco más alto de lo usual"`

### 🔴 ROJO
- Gasto > +25%
- **Etiqueta:** `"Nos estamos saliendo"`

📌 No mostrar montos salvo interacción directa.

---

## 3️⃣ PRÓXIMO EN EL HORIZONTE (Pagos y Cuentas)

### 🎯 Qué Detecta
Gastos **recurrentes inferidos**, no configurados manualmente.

### 🧠 Cómo se Detecta un Gasto Recurrente

Un gasto es recurrente si:
- Aparece ≥ 3 veces
- Con periodicidad similar (±20%)
- Mismo comercio / categoría

**Ejemplo:** Luz cada 28–35 días

### Estados por Ítem

#### 🟢 VERDE
- Pago registrado dentro de ventana esperada
- **Etiqueta:** `"Todo ok"`

#### 🟡 AMARILLO
- Se acerca la fecha esperada
- Aún no hay registro
- **Etiqueta:** `"Se acerca"`

#### 🔴 ROJO
- Ventana superada
- No hay pago registrado
- **Etiqueta:** `"Revisar"`

📌 Aquí **NO se juzga**, solo se alerta.

---

## 4️⃣ PRODUCTOS ESTRATÉGICOS

### 🎯 Qué Mide
Precio unitario **relativo a su propio historial**, no al mercado externo.

### 🧮 Baseline por Producto
- Precios unitarios últimos 90 días
- Por producto + unidad base
- Opcionalmente por tienda

### 🟢 VERDE
- Precio ≤ p50 histórico
- **Etiqueta:** `"Estable"`
- **Mascota 🐱:** Confiada

### 🟡 AMARILLO
- Precio entre p50 y p75
- O tendencia al alza
- **Etiqueta:** `"Subiendo"`
- **Mascota 🐱:** Observando

### 🔴 ROJO
- Precio > p75
- O pico abrupto
- **Etiqueta:** `"Caro"`
- **Mascota 🐱:** Alerta

---

## 5️⃣ TIENDAS

### 🎯 Qué Representa
Perfil general del local, no juicio moral.

### 🧮 Cálculo
- Comparación relativa entre tiendas
- Basada en productos estratégicos
- Ventana larga (90 días)

### 🟢 VERDE
**Etiqueta:** `"Suele ser conveniente"`

### 🟡 AMARILLO
**Etiqueta:** `"Precio intermedio"`

### 🔴 ROJO
**Etiqueta:** `"Suele ser más caro"`

📌 Esto es **orientativo**, no sentencia.

---

## 6️⃣ ASISTENTE (IA)

### 🎯 Rol
Traducir estados en lenguaje humano.

### Tono según Estado

| Estado | Tono | Ejemplo |
|--------|------|---------|
| 🟢 | `calm` | "Todo está dentro de lo normal." |
| 🟡 | `alert` | "Este producto está más caro que lo usual." |
| 🔴 | `urgent` | "Hay un pago que conviene revisar." |

📌 Nunca culpar, siempre informar.

---

## 7️⃣ REGLAS GLOBALES (IMPORTANTÍSIMAS)

### ✅ SIEMPRE
- Priorizar **tendencias**, no eventos únicos
- Usar ventanas móviles
- Aprender de patrones
- Humanizar mensajes

### ❌ NUNCA
- Pedir al usuario que "defina un presupuesto mensual"
- Reiniciar el sistema por cambio de mes
- Mostrar alertas sin contexto
- Usar rojo por una sola boleta aislada
- Juzgar moralmente al usuario

---

## 📊 TABLA RESUMEN DE UMBRALES

| Componente | 🟢 Verde | 🟡 Amarillo | 🔴 Rojo |
|------------|----------|-------------|---------|
| Zona de Gasto | ≤ baseline +10% | +10% a +25% | > +25% |
| Pagos | Registrado | Se acerca | Vencido |
| Productos | ≤ p50 | p50 a p75 | > p75 |
| Tiendas | Conveniente | Intermedio | Caro |
| Hogar | Todo verde | Al menos 1 amarillo | Al menos 1 rojo |

---

## 🧭 CIERRE — SISTEMA VIVO

Con este bloque lógico:
- El sistema **aprende solo**
- El usuario **no recuerda**
- No hay Excel
- No hay copias mensuales
- No hay fricción

> **Esto es un sistema vivo, no un tracker.**

---

# 🧠 CÓDIGO — CAPA DE DOMINIO (LÓGICA PURA)

> Este código es la **implementación directa** del sistema de estados.
> Es lógica pura, testeable, sin UI.

---

## 0️⃣ Convenciones Base

```python
from enum import Enum
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import List, Optional
```

---

## 1️⃣ Estados Base (Contrato Global)

```python
class Status(Enum):
    GREEN = "green"
    YELLOW = "yellow"
    RED = "red"
```

---

## 2️⃣ Modelos Mínimos de Dominio

### Transaction
```python
@dataclass
class Transaction:
    amount: float
    date: datetime
    category: str
    store_id: Optional[str] = None
    product_id: Optional[str] = None
```

### RecurringItem
```python
@dataclass
class RecurringItem:
    label: str
    last_paid_date: datetime
    expected_interval_days: int
```

### ProductPrice
```python
@dataclass
class ProductPrice:
    product_id: str
    unit_price: float
    date: datetime
```

---

## 3️⃣ Utilidades Estadísticas Simples

> Nota: mantenemos esto simple a propósito (robusto > sofisticado)

### Mean
```python
def mean(values: List[float]) -> float:
    return sum(values) / len(values) if values else 0.0
```

### Percentile
```python
def percentile(values: List[float], p: float) -> float:
    if not values:
        return 0.0
    values_sorted = sorted(values)
    k = int(len(values_sorted) * p)
    return values_sorted[min(k, len(values_sorted) - 1)]
```

---

## 4️⃣ Zona de Gasto (Presupuesto Implícito)

```python
def compute_spending_zone(
    transactions: List[Transaction],
    window_days: int = 30
) -> Status:
    now = datetime.utcnow()
    window_start = now - timedelta(days=window_days)

    recent = [t.amount for t in transactions if t.date >= window_start]

    baseline = mean(recent)
    total = sum(recent)

    if baseline == 0:
        return Status.GREEN

    deviation = (total - baseline) / baseline

    if deviation > 0.25:
        return Status.RED
    elif deviation > 0.10:
        return Status.YELLOW
    else:
        return Status.GREEN
```

---

## 5️⃣ Próximo en el Horizonte (Pagos Recurrentes)

```python
def compute_recurring_status(
    item: RecurringItem,
    tolerance_ratio: float = 0.20
) -> Status:
    now = datetime.utcnow()
    expected_next = item.last_paid_date + timedelta(days=item.expected_interval_days)

    tolerance = item.expected_interval_days * tolerance_ratio

    if now <= expected_next:
        return Status.GREEN

    elif now <= expected_next + timedelta(days=tolerance):
        return Status.YELLOW

    else:
        return Status.RED
```

---

## 6️⃣ Productos Estratégicos (Precio Relativo)

```python
def compute_product_status(
    prices: List[ProductPrice]
) -> Status:
    if len(prices) < 3:
        return Status.GREEN  # no alertar con pocos datos

    values = [p.unit_price for p in prices]

    p50 = percentile(values, 0.50)
    p75 = percentile(values, 0.75)
    latest = prices[-1].unit_price

    if latest > p75:
        return Status.RED
    elif latest > p50:
        return Status.YELLOW
    else:
        return Status.GREEN
```

---

## 7️⃣ Estado del Hogar (Orquestador)

### Signals Model
```python
@dataclass
class HouseholdSignals:
    spending: Status
    recurring: List[Status]
    products: List[Status]
```

### Compute Function
```python
def compute_household_status(signals: HouseholdSignals) -> Status:
    if (
        signals.spending == Status.RED or
        Status.RED in signals.recurring or
        Status.RED in signals.products
    ):
        return Status.RED

    if (
        signals.spending == Status.YELLOW or
        Status.YELLOW in signals.recurring or
        Status.YELLOW in signals.products
    ):
        return Status.YELLOW

    return Status.GREEN
```

---

## 8️⃣ Mensajes Humanos (Sin UI)

```python
def household_message(status: Status) -> str:
    if status == Status.GREEN:
        return "El hogar está tranquilo."
    if status == Status.YELLOW:
        return "Hay cosas que conviene mirar."
    return "Este periodo requiere atención."
```

---

## 9️⃣ Ejemplo de Uso (Test Lógico)

```python
signals = HouseholdSignals(
    spending=Status.YELLOW,
    recurring=[Status.GREEN, Status.YELLOW],
    products=[Status.GREEN]
)

overall = compute_household_status(signals)

print(overall.value)              # "yellow"
print(household_message(overall)) # "Hay cosas que conviene mirar."
```

---

## 🧭 Qué Es Esto (y Qué No)

### ✔️ ES
- Lógica pura
- Determinística
- Testeable
- Independiente de UI
- Reutilizable en web / telegram / app

### ❌ NO ES
- Frontend
- Colores
- Mascotas
- Gráficos
- Decisiones visuales

---

## 📌 Qué Puede Hacer Antigravity Ahora

Con este código puede:
- Convertir en servicios (`domain/services`)
- Crear jobs programados
- Escribir tests de escenarios reales
- Simular meses completos sin UI
- Ajustar thresholds con datos reales

---

## 🏁 Cierre — El Sistema Ya Piensa

Con esto:
- El sistema **ya piensa**
- La UI solo **traduce**
- No hay Excel
- No hay copias mensuales
- No hay deuda técnica conceptual

---

---

# 🎨 CRITERIOS PARA APLICAR UI (CHECKLIST OFICIAL)

> **Regla madre:**
> La UI se aplica cuando el sistema ya se comporta correctamente sin ella.

---

## 1️⃣ Criterio 1 — Dominio Estable (OBLIGATORIO)

Antes de UI, debe cumplirse TODO esto:

### ✅ La lógica devuelve siempre un estado válido
- `green / yellow / red`
- nunca `null`
- nunca ambiguo

### ✅ Cambios de estado coherentes
- una boleta grande mueve el estado
- una boleta pequeña no lo hace
- los estados no "parpadean"

### ✅ No hay lógica en el frontend
- ningún cálculo de estados en React / Vue
- el frontend solo renderiza lo que recibe

📌 **Si algún cálculo está en UI → NO aplicar diseño.**

---

## 2️⃣ Criterio 2 — Contratos de Datos Cerrados (OBLIGATORIO)

Antes de UI:

### ✅ Cada pantalla tiene su endpoint definitivo
- `/dashboard/summary`
- `/products/strategic`
- `/stores`
- etc.

### ✅ Los JSON no cambian a diario
- campos estables
- nombres claros
- sin "agregar esto rápido"

📌 **Si los contratos cambian, la UI se rompe.**

---

## 3️⃣ Criterio 3 — Flujos Completos Sin Diseño (MUY IMPORTANTE)

Debe poder hacerse esto con UI fea:
- subir boleta
- confirmar boleta
- ver estado del hogar cambiar
- consultar producto
- ver "próximo en el horizonte"

👉 Aunque sea con botones grises y texto plano.

📌 **Si el flujo no funciona feo, no funcionará bonito.**

---

## 4️⃣ Criterio 4 — Estados Probados con Datos Reales

Antes de UI:

### ✅ Probar al menos:
- un mes "tranquilo"
- un mes "ajustado"
- un evento raro (gasto grande)

### ✅ Verificar:
- cuándo pasa a amarillo
- cuándo pasa a rojo
- cuándo vuelve a verde

📌 **Si no confías en el color, no lo pintes.**

---

## 5️⃣ Criterio 5 — Lenguaje Humano Definido (CLAVE)

Antes de UI:

### ✅ Mensajes cortos definidos
**Ejemplo:**
- "El hogar está tranquilo."
- "Hay cosas que conviene mirar."
- "Este periodo requiere atención."

### ✅ No textos improvisados
- nada tipo "Status: RED"
- nada técnico visible

📌 **La UI muestra frases, no lógica.**

---

## 6️⃣ Criterio 6 — Decisiones Irreversibles Tomadas

Antes de UI, deben estar **cerradas** estas decisiones:
- ✔️ No planificación mensual editable
- ✔️ No presupuestos fijos
- ✔️ Estados por patrón aprendido
- ✔️ IA como memoria, no usuario

📌 Si esto aún se discute, **esperar UI**.

---

## 7️⃣ Criterio 7 — Backend "Aburrido" (Señal Positiva)

Esta es una señal sutil pero muy real:
> Cuando el backend se vuelve aburrido, es momento de UI.

**Signos:**
- no aparecen reglas nuevas cada día
- los commits son pequeños
- solo ajustes de thresholds
- nadie dice "ah, también podríamos..."

📌 La estabilidad es la señal.

---

## 8️⃣ Criterio 8 — Checklist Final (Rápido)

Puedes usar esto como **semáforo**:

| Criterio | ¿Cumplido? |
| --- | --- |
| Dominio estable | ⬜ |
| Contratos cerrados | ⬜ |
| Flujos completos | ⬜ |
| Estados probados | ⬜ |
| Lenguaje definido | ⬜ |
| Decisiones cerradas | ⬜ |
| Backend estable | ⬜ |

👉 **Cuando todos están en verde → UI.**

---

## 9️⃣ Qué Significa "Aplicar UI" (Importante)

Aplicar UI **NO significa**:
- rehacer frontend
- romper componentes
- volver a pensar lógica

**Significa:**
- aplicar estilos
- colores
- mascotas
- animaciones
- layout final

👉 Es una **capa**, no una reescritura.

---

## 🏁 Decisión Final del Director

✔️ No adelantar UI
✔️ UI entra cuando el sistema ya "dice la verdad"
✔️ La UI amplifica, no corrige

---

---

# 🎨 UI DEL DASHBOARD — ESPECIFICACIÓN FINAL

## 🎯 Objetivo Único del Dashboard

Que cualquier adulto del hogar, en **3 segundos**, entienda:
1. Cómo estamos
2. Si hay algo que mirar
3. Sin leer números ni listas

---

## 🧱 Estructura de la Pantalla (de arriba hacia abajo)

### 1️⃣ HEADER (Simple, no protagonista)

- Título: **Estado del Hogar**
- Subtítulo contextual: "Esta semana" / "Periodo actual"
- ❌ Sin selector de mes
- ❌ Sin acciones

---

### 2️⃣ BLOQUE CENTRAL — ESTADO DEL HOGAR (PROTAGONISTA)

**Componente:** `HouseholdStatusCard`

**Datos (backend):**
```json
{
  "household_status": "green | yellow | red",
  "status_message": "string"
}
```

**UI:**
- Tarjeta grande (60–70% del primer viewport)
- Color dominante según estado
- Símbolo central grande: ✔ (verde) / ⚠ (amarillo) / ❗ (rojo)
- Texto humano (1 línea, grande):
  - "El hogar está tranquilo"
  - "Hay cosas que conviene mirar"
  - "Este periodo requiere atención"

**Mascota 🐶:**
- Integrada al bloque
- Postura según estado
- Sin animación agresiva (solo presencia)

**Reglas:**
- ❌ No montos
- ❌ No gráficos
- ❌ No botones

Este bloque **resume todo el sistema**.

---

### 3️⃣ BLOQUE — PRÓXIMO EN EL HORIZONTE

**Componente:** `UpcomingItems`

**Datos (backend):**
```json
{
  "upcoming_items": [
    { "label": "Luz", "status": "yellow" },
    { "label": "Internet", "status": "green" }
  ]
}
```

**UI:**
- Máx. 3 tarjetas pequeñas
- Cada tarjeta:
  - Ícono (💡, 🌐, 💳, etc.)
  - Color por estado
  - Texto corto ("Se acerca", "Todo ok", "Revisar")

**Reglas:**
- ❌ No fechas exactas
- ❌ No montos
- ✔️ Ordenadas por prioridad (rojo arriba)

---

### 4️⃣ BLOQUE — ZONA DE GASTO

**Componente:** `SpendingZone`

**Datos (backend):**
```json
{
  "spending_zone": {
    "status": "green | yellow | red",
    "label": "Dentro de lo normal"
  }
}
```

**UI:**
- Barra visual gruesa (horizontal)
- Color según estado
- Texto humano ("Dentro de lo normal", etc.)

**Interacción:**
- Tap opcional → muestra monto (modal simple)
- Por defecto, **sin números**

---

### 5️⃣ ATAJOS VISUALES (FOOTER)

**Componente:** `QuickActions`

**UI:**
- 3 íconos grandes:
  - 🛒 Compras
  - 📦 Productos
  - 🏪 Tiendas
- Indicador pequeño de color si hay algo relevante

**Reglas:**
- ❌ No badges numéricos
- ✔️ Navegación directa

---

## 🎨 REGLAS DE DISEÑO (NO ROMPER)

### Color
- Verde / Amarillo / Rojo **solo** para estados
- Nada decorativo

### Texto
- Frases humanas
- Nunca texto técnico (no "status: red")

### Animaciones
- Ninguna por defecto
- Transiciones suaves al cambiar estado

### Accesibilidad
- Contraste suficiente
- Iconos siempre acompañan color

---

## 🔐 LÍMITES EXPLÍCITOS (MUY IMPORTANTE)

❌ No agregar:
- gráficos adicionales
- tablas
- breakdowns
- listas largas
- edición de nada

Este dashboard **NO es un panel de control**, es un **termómetro**.

---

## 🧪 Criterio de Aceptación

El Dashboard está listo cuando:
- cambia correctamente de verde → amarillo → rojo
- refleja cambios reales al subir boletas
- se entiende sin leer números
- no invita a "tocar cosas"
- se siente calmado, no controlador

---

## 🏁 Qué NO Hacer Ahora

- No integrar todavía código de Stitch
- No mascotas animadas
- No temas de color avanzados
---

# 🎨 TOKENS VISUALES — DASHBOARD CBC FAMILY

> Estos tokens **no contienen lógica**, solo traducción visual de estados.
> Se pueden usar en Web, Mobile o Telegram WebApp.

---

## 1️⃣ TOKENS DE ESTADO (BASE)

```ts
type Status = "green" | "yellow" | "red";
```

### Colores Semánticos (No Decorativos)

```css
:root {
  --status-green-bg: #E8F5E9;
  --status-green-main: #2E7D32;

  --status-yellow-bg: #FFF8E1;
  --status-yellow-main: #F9A825;

  --status-red-bg: #FDECEA;
  --status-red-main: #C62828;
}
```

📌 **Regla:**
- `*-bg` → fondos grandes
- `*-main` → íconos, textos clave

---

## 2️⃣ TIPOGRAFÍA (Simple y Estable)

No elegimos fuente aún (eso puede cambiar), solo **roles**.

```css
--text-title-size: 1.6rem;
--text-title-weight: 600;

--text-body-size: 1rem;
--text-body-weight: 400;

--text-small-size: 0.85rem;
```

📌 El Dashboard **no usa textos pequeños como protagonistas**.

---

## 3️⃣ COMPONENTE 1 — HouseholdStatusCard

### Estructura Visual (Tokens)

```css
.household-card {
  border-radius: 20px;
  padding: 24px;
  min-height: 220px;
}
```

### Aplicación de Estado

```css
.household-card.green {
  background-color: var(--status-green-bg);
  color: var(--status-green-main);
}
.household-card.yellow {
  background-color: var(--status-yellow-bg);
  color: var(--status-yellow-main);
}
.household-card.red {
  background-color: var(--status-red-bg);
  color: var(--status-red-main);
}
```
📌 **Consistencia:**
- Nada de gradientes todavía.
- Fondo plano = claridad cognitiva.

### Ícono Central
```css
.household-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}
```
- ✔ → green
- ⚠ → yellow
- ❗ → red

---

## 4️⃣ COMPONENTE 2 — Próximo en el Horizonte

### Tarjetas Pequeñas
```css
.upcoming-item {
  border-radius: 14px;
  padding: 12px;
  display: flex;
  gap: 10px;
  align-items: center;
}
```

**Estados:**
- `.green` → background `#F1F8F4`
- `.yellow` → background `#FFFDE7`
- `.red` → background `#FBE9E7`

📌 Texto máximo: **2 palabras** ("Se acerca", "Revisar").

---

## 5️⃣ COMPONENTE 3 — Zona de Gasto

### Barra Visual
```css
.spending-bar {
  height: 14px;
  border-radius: 10px;
  background-color: #E0E0E0;
  overflow: hidden;
}
```

**Fill:**
- `.green` → `var(--status-green-main)`
- `.yellow` → `var(--status-yellow-main)`
- `.red` → `var(--status-red-main)`

📌 El ancho se define por estado, **no por porcentaje exacto**.

---

## 6️⃣ MASCOTA 🐶 (Placeholder)

Todavía **NO se dibuja la mascota final**.

Usamos solo un contenedor:
```css
.mascot-slot {
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 64px;
  height: 64px;
}
```

---

## 7️⃣ REGLAS DE ORO (para Antigravity)

✔️ Todo color viene de estado
✔️ Ningún componente decide color solo
✔️ Ningún número visible por defecto
✔️ Nada se mueve sin cambiar estado
✔️ Si el backend no cambia → la UI no cambia

---

## 8️⃣ CRITERIO DE "UI DASHBOARD LISTA"

El Dashboard se considera **UI–ready** cuando:
- El color cambia correctamente con el estado
- El mensaje cambia correctamente
- El usuario entiende el estado sin leer números
- No hay lógica en el frontend
- El código acepta cambiar colores sin tocar lógica

---

