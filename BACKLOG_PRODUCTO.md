# 📝 Backlog de Producto - Belna Finanzas

Este archivo contiene ideas, mejoras y ajustes técnicos que han surgido durante el desarrollo y que retomaremos en etapas posteriores para no perder el foco del MVP actual.

---

## 🧠 IA & Inteligencia de Datos

- [ ] **Búsqueda Semántica / Contexto en `/precio`**: 
    - Implementar búsqueda por categorías o sinónimos (ej: que al buscar "bebida" encuentre "Coca-Cola" o "Pepsi").
    - Usar embeddings o un mapeo manual de categorías para mejorar el NLP sin depender de nombres exactos.
- [ ] **Migración Inteligente de Notion (Plan Director)**:
    - Procesar exportaciones CSV para clasificar productos en:
        - **A (Estratégicos)**: Alta frecuencia/variabilidad. Foco de `/precio`.
        - **B (Operativos)**: Registro habitual, precio estable.
        - **C (Ignorables)**: Compras ocasionales de bajo impacto.
    - Alimentar la base de datos de `stores` con hábitos históricos extraídos de Notion.
- [ ] **Etiquetado Automático de Productos**:
    - Actualizar el prompt de Gemini para que asigne una categoría (Limpieza, Despensa, Carnicería, Fruit & Veg) directamente al extraer.
- [ ] **Refinamiento de RUT/Tienda**:
    - Usar una base de datos local de RUTs conocidos de Chile para asegurar la tienda cuando el logo no es claro.

## 🤖 Telegram & UX

- [ ] **Identificación Real de Usuario**:
    - Actualmente, al confirmar una boleta por botón, el sistema usa `telegram_user` como autor. Cambiar para que use el `user_id` real vinculado de Firestore.
- [ ] **Confirmación Cruzada**:
    - Validar que solo los miembros de la misma `household_id` puedan ver/interactuar con los botones de una boleta subida.
- [ ] **Feedback de Aprendizaje**:
    - Si el comando `/precio` falla por fuzzy match, permitir al usuario "asociar" ese término a un producto real para futuras consultas.

## 📊 Dashboard & Web

- [ ] **Visualización de Precios (Precios Históricos)**:
    - Crear la interfaz gráfica que use los datos que ya calcula el comando `/precio` para mostrar curvas de inflación por producto en la web.
- [ ] **Edición de Ítems Post-Confirmación**:
    - Permitir que si la IA leyó mal una cantidad, se pueda corregir rápidamente desde la web (ahora solo se puede rechazar o confirmar).

## ⚙️ Técnicos / Infra

- [ ] **Optimización de Callbacks**:
    - Mantener los `callback_data` cortos (límite 64 bytes) si agregamos más funcionalidades como paginación en el detalle.
- [ ] **Cache de Búsqueda**:
    - Cachear los productos de la familia en memoria local para que `/precio` responda en milisegundos sin consultar Firestore cada vez.

---
*Ultima actualización: 21-01-2026*
