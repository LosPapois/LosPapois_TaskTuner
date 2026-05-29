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

```mermaid
flowchart LR
    subgraph Input
        A["chunk A\ndist=0.30\nsin keywords"]
        B["chunk B\ndist=0.35\n3 keywords exactas"]
    end
    subgraph Adjusted
        AR["chunk A\nadjusted=0.30"]
        BR["chunk B\nadjusted=0.11\n0.35 - 3×0.08"]
    end
    subgraph Ranking
        R1["🥇 chunk B"]
        R2["🥈 chunk A"]
    end
    A --> AR
    B --> BR
    AR --> R2
    BR --> R1
```

`MAX_KEYWORD_BONUS = 0.30` evita que un chunk con muchas keywords triviales supere a uno vectorialmente muy relevante.

## Extracción de keywords

`extractKeywords(query)` filtra stopwords en español e inglés antes de calcular hits — palabras como *"el"*, *"de"*, *"the"* no cuentan como hits.
