---
id: reranking
sidebar_position: 5
title: Hybrid Re-ranking
---

# Hybrid Re-ranking — Keyword Bonus

Vector search es bueno para semántica, malo para términos exactos (nombres propios, IDs, fechas exactas). El keyword bonus **reduce artificialmente la distancia coseno** de chunks que contienen las palabras clave exactas de la query.

## Fórmula

```
adjusted_score = vector_distance - keyword_bonus
keyword_bonus  = keyword_hits * 0.08
MAX_BONUS      = 0.30
```

## Ejemplo

```
chunk A: dist=0.30, no contiene keywords  → adjusted = 0.30
chunk B: dist=0.35, contiene 3 keywords   → adjusted = 0.35 - (3 × 0.08) = 0.11
chunk B sube al top aunque su vector sea "peor"
```

`MAX_KEYWORD_BONUS = 0.30` evita que un chunk con muchas keywords triviales supere a uno vectorialmente muy relevante.

## Extracción de keywords

`extractKeywords(query)` filtra stopwords en español e inglés antes de calcular hits — palabras como _"el"_, _"de"_, _"the"_ no cuentan como hits.
