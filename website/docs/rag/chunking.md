---
id: chunking
sidebar_position: 2
title: Chunking Semántico
---

# Chunking — Semántico vs. Fijo

## Problema con chunking fijo

**Anterior:** cortar cada 500 caracteres con 50 de overlap.

**Problema:** un chunk podía empezar a mitad de oración o partir una lista numerada en dos chunks sin contexto.

## Solución actual

Split por párrafos (`\n\n`) + merge hasta 800 chars + fallback con overlap para párrafos gigantes.

```mermaid
flowchart TD
    Text([Texto del documento]) --> Split["Split por párrafos\n\\n\\n"]
    Split --> Merge{"párrafo < 800 chars\ny hay siguiente?"}
    Merge -->|Sí| MergeOp["Merge con siguiente párrafo"]
    MergeOp --> Merge
    Merge -->|No| CheckSize{"párrafo > 800 chars?"}
    CheckSize -->|Sí| Overlap["Fallback: split con\noverlap 80 chars"]
    CheckSize -->|No| Chunk["✅ Chunk semántico\n≤ 800 chars"]
    Overlap --> Chunk
```

Cada chunk semántico es una unidad coherente — mejora tanto la calidad del embedding como la legibilidad en el prompt del LLM.
