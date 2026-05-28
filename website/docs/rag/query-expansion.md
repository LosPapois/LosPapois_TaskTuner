---
id: query-expansion
sidebar_position: 4
title: Query Expansion
---

# Query Expansion — Por qué una sola llamada LLM

Una pregunta en lenguaje natural tiene múltiples formulaciones válidas. El embedding de *"hitos del cierre"* es vectorialmente distante de *"milestones de entrega del proyecto"* aunque signifiquen lo mismo.

## Estrategia

La expansión de queries genera **2 variantes semánticas adicionales** con Groq, amplía el espacio de búsqueda y mejora el recall sin aumentar el threshold (lo que traería ruido).

```
Query original:   "hitos del cierre"
Variante 1:       "milestones de entrega del proyecto"
Variante 2:       "fechas de cierre y entrega final"

→ 3 embeddings → 3 búsquedas vectoriales → pool deduplicado
```

## Costo

1 llamada Groq extra por query `/ask`. Justificado porque:
- Rate limit Groq: 1,000 req/min
- Uso normal del bot: &lt;&lt; 10 queries/min
