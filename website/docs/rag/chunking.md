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

```
Texto original:
"Hito 1: Validación del software\n\nHito 2: Documentación\n\nHito 3: Entrega final"

Chunking fijo (500 chars):          Chunking semántico:
["Hito 1: Validación del            ["Hito 1: Validación del software",
  software\n\nHito 2: Docu           "Hito 2: Documentación",
  mentación\n\nHito 3: En..."]       "Hito 3: Entrega final"]
```

Cada chunk semántico es una unidad coherente — mejora tanto la calidad del embedding como la legibilidad en el prompt del LLM.
