---
id: oracle-ddl
sidebar_position: 6
title: Oracle DDL y JDBC
---

# DDL requerido en Oracle

```sql
CREATE TABLE rag_chunks (
    chunk_id  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_id    NUMBER REFERENCES document_tt(doc_id) ON DELETE CASCADE,
    pj_id     NUMBER,
    content   CLOB NOT NULL,
    embedding VECTOR(1024, FLOAT32)
);

CREATE VECTOR INDEX rag_chunks_idx ON rag_chunks(embedding)
ORGANIZATION INMEMORY NEIGHBOR GRAPH
DISTANCE COSINE WITH TARGET ACCURACY 95;
```

`VECTOR(1024, FLOAT32)` — 1024 dimensiones del modelo `embed-multilingual-v3.0` de Cohere. El índice HNSW (`INMEMORY NEIGHBOR GRAPH`) permite búsqueda aproximada de vecinos más cercanos en O(log n) en vez de O(n) (fuerza bruta).

## Binding de VECTOR en Oracle JDBC 23.7

```java
// ✅ Correcto: pasar float[] directamente
ps.setObject(4, embedding, OracleType.VECTOR);

// ❌ Incorrecto: ORA-17004 — String to VECTOR conversion not supported
ps.setObject(4, "[0.1, 0.2, ...]", OracleType.VECTOR);
```

Oracle JDBC 23.7 serializa `float[]` al formato binario interno de VECTOR. No tiene conversión desde String para `OracleType.VECTOR`, a diferencia de tipos como `DATE` o `NUMBER`.

## Cache de embeddings de queries

```java
queryEmbedCache.computeIfAbsent(query, k -> embedQuery(k));
```

`ConcurrentHashMap` en memoria. Si el usuario hace la misma pregunta dos veces (o la expansión genera una variante idéntica al original), Cohere no es llamado de nuevo. Sin TTL — el cache vive mientras viva la JVM. Aceptable porque las queries de proyectos son deterministas dentro de una sesión.
