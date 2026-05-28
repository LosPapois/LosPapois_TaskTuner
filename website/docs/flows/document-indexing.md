---
id: document-indexing
sidebar_position: 4
title: Indexación de Documentos
---

# Flujo de Indexación de Documentos

```
Usuario sube PDF/DOCX/TXT al bot (clip 📎)
        │
        ▼
DocumentProcessingService.processDocument(fileId, fileName, chatId)
    ├── Descarga archivo de Telegram API
    ├── Extrae texto: PDFBox (PDF) / Apache POI (DOCX) / plain (TXT)
    ├── Guarda CLOB en DOCUMENT_TT (Oracle)
    └── VectorService.deleteChunksForDoc(docId)  ← limpia re-uploads
        VectorService.indexDocument(docId, pjId, text)
            │
            ├─ chunkSemantic(text)
            │   ├── Split por párrafos (\n\n) → unidades semánticas
            │   ├── Merge párrafos cortos hasta 800 chars
            │   └── Fallback overlap (80 chars) para párrafos gigantes
            │
            └─ por cada chunk:
                embed(chunk) → Cohere search_document → float[1024]
                INSERT INTO rag_chunks (doc_id, pj_id, content, embedding)
                VALUES (?, ?, ?, ?)  ← OracleType.VECTOR con float[]
        │
        ▼
"✅ Document indexed! X chunks stored."
```

## Formatos soportados

| Formato | Extractor |
|---|---|
| PDF | Apache PDFBox 3.0.3 |
| DOCX | Apache POI 5.3.0 |
| TXT | Java plain text |

## Re-upload

Al subir un documento que ya existe, `deleteChunksForDoc(docId)` elimina los chunks anteriores antes de indexar — evita duplicados en la búsqueda vectorial.
