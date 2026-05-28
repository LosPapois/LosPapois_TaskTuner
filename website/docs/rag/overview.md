---
id: overview
sidebar_position: 1
title: Visión General
---

# RAG — Decisiones de Diseño

## BM25/Lucene vs. Oracle 23ai VECTOR

| Criterio | BM25 (Lucene, anterior) | Vector RAG (Oracle 23ai, actual) |
|---|---|---|
| Búsqueda semántica | No — solo coincidencia léxica | Sí — entiende sinónimos, paráfrasis |
| Multilingüe | Requiere tokenizadores separados | Nativo con `embed-multilingual-v3.0` |
| Persistencia | Índice local en disco, se pierde en restart | Oracle — sobrevive deploys y reinicios |
| Escalabilidad | Un índice Lucene por JVM | Oracle maneja terabytes, índice HNSW |
| Infraestructura adicional | Ninguna (en proceso) | Cohere API (free tier: 10K embeddings/mes) |
| Complejidad operacional | Bajo | Medio (wallet, VECTOR DDL, float[] binding) |

**Decisión:** Lucene es suficiente para prototipo, pero Oracle 23ai ya estaba provisionado con soporte VECTOR nativo. La migración elimina la dependencia en disco y mejora calidad de búsqueda para queries en lenguaje natural.

## Componentes del pipeline

1. [Chunking semántico](/docs/rag/chunking)
2. [Búsqueda vectorial y score threshold](/docs/rag/vector-search)
3. [Query expansion](/docs/rag/query-expansion)
4. [Hybrid re-ranking](/docs/rag/reranking)
5. [DDL y JDBC binding en Oracle](/docs/rag/oracle-ddl)
