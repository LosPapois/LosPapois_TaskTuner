---
id: vector-search
sidebar_position: 3
title: Búsqueda Vectorial
---

# Búsqueda Vectorial y Score Threshold

## ¿Por qué el threshold en SQL y no en Java?

```sql
SELECT content, dist FROM (
    SELECT content, VECTOR_DISTANCE(embedding, ?, COSINE) AS dist
    FROM rag_chunks WHERE pj_id = ?
    ORDER BY dist FETCH FIRST 21 ROWS ONLY
) WHERE dist < 0.70
```

El threshold en el `WHERE` de la subquery permite al índice HNSW de Oracle **podar ramas durante la búsqueda** en vez de traer todos los resultados a Java para filtrar.

## Escala de distancia coseno

La distancia coseno devuelta por Oracle va de `0` (idéntico) a `1` (ortogonal) para vectores normalizados. Cohere `embed-multilingual-v3.0` produce vectores normalizados — el threshold de `0.70` descarta chunks con menos del 30% de similitud semántica.

## Parámetros

| Parámetro | Valor | Significado |
|---|---|---|
| `CANDIDATE_K` | `TOP_K * 3 = 21` | Candidatos antes de threshold |
| `WIDE_THRESHOLD` | `0.70` | Distancia coseno máxima aceptada |
| `TOP_K` | `7` | Chunks finales al LLM (después de re-ranking) |
