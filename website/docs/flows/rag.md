---
id: rag
sidebar_position: 3
title: Flujo RAG (/ask)
---

# Flujo RAG — Comando /ask

```
/ask "En base al doc, dime los hitos del proyecto"
        │
        ▼
sanitizeAiInput() ── protección contra prompt injection
        │
        ▼
buildRagContext() → VectorService.retrieveChunks(query, pjId)
    │
    ├─ 1. QUERY EXPANSION (Groq)
    │       GroqService.ask(expansion_prompt, query)
    │       → ["variante semántica 1", "variante semántica 2"]
    │       + query original = 3 queries en total
    │
    ├─ 2. EMBEDDING (Cohere, con cache)
    │       POST https://api.cohere.com/v2/embed
    │       model: embed-multilingual-v3.0, input_type: search_query
    │       → float[1024] por cada query (cacheado en ConcurrentHashMap)
    │
    ├─ 3. VECTOR SEARCH por cada embedding (Oracle 23ai)
    │       SELECT content, VECTOR_DISTANCE(embedding, ?, COSINE) AS dist
    │       FROM rag_chunks WHERE pj_id = ?
    │       ORDER BY dist FETCH FIRST 21 ROWS ONLY  ← CANDIDATE_K = TOP_K * 3
    │       WHERE dist < 0.70                       ← WIDE_THRESHOLD
    │       → pool de candidatos, deduplicado por contenido (mejor score por chunk)
    │
    └─ 4. HYBRID RE-RANKING (Java)
            extractKeywords(query) → filtra stopwords ES+EN
            por cada chunk: adjusted = vector_dist - keyword_bonus
            keyword_bonus = hits * 0.08, máx 0.30
            sort por adjusted_score, top 7
        │
        ▼
buildUnifiedAiPrompt()
    └── buildContextString()
        └── sprints + tareas + features actuales desde Oracle
        │
        ▼
systemPrompt = prompt_base + contexto_oracle + "=== RELEVANT DOCUMENT EXCERPTS ===" + top-7 chunks
        │
        ▼
GroqService.ask(systemPrompt, pregunta_usuario)
    └── POST https://api.groq.com → Llama 3.3 70B
        │
        ▼
Respuesta JSON parseada → tipo: answer/task/feature/suggest/off_topic
        │
        ▼
BotHelper.sendMessageToTelegram()
```

Ver [decisiones de diseño del pipeline RAG](/docs/rag/overview) para el razonamiento detrás de cada etapa.
