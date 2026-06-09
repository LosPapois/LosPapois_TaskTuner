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
    Split --> Merge{"párrafo &lt; 800 chars\ny hay siguiente?"}
    Merge -->|Sí| MergeOp["Merge con siguiente párrafo"]
    MergeOp --> Merge
    Merge -->|No| CheckSize{"párrafo &gt; 800 chars?"}
    CheckSize -->|Sí| Overlap["Fallback: split con\noverlap 80 chars"]
    CheckSize -->|No| Chunk["✅ Chunk semántico\n≤ 800 chars"]
    Overlap --> Chunk

    classDef trigger fill:#DBEAFE,stroke:#2563EB,color:#1E3A5F
    classDef process fill:#F3F4F6,stroke:#6B7280,color:#111827
    classDef decision fill:#FEF9C3,stroke:#CA8A04,color:#713F12
    classDef done fill:#DCFCE7,stroke:#16A34A,color:#14532D

    class Text trigger
    class Split,MergeOp,Overlap process
    class Merge,CheckSize decision
    class Chunk done
```

Cada chunk semántico es una unidad coherente — mejora tanto la calidad del embedding como la legibilidad en el prompt del LLM.
