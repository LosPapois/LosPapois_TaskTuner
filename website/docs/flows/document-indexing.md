---
id: document-indexing
sidebar_position: 4
title: Indexación de Documentos
---

# Flujo de Indexación de Documentos

```mermaid
flowchart TD
    Upload([Usuario sube PDF/DOCX/TXT 📎]) --> Process["DocumentProcessingService\n.processDocument(fileId, fileName, chatId)"]
    Process --> Download["Descarga archivo\nde Telegram API"]
    Download --> Extract{Tipo de archivo}
    Extract -->|PDF| PDFBox["Apache PDFBox 3.0.3"]
    Extract -->|DOCX| POI["Apache POI 5.3.0"]
    Extract -->|TXT| Plain["Java plain text"]
    PDFBox --> SaveClob["Guarda CLOB en DOCUMENT_TT\nOracle"]
    POI --> SaveClob
    Plain --> SaveClob
    SaveClob --> Delete["VectorService.deleteChunksForDoc\nlimpia re-uploads"]
    Delete --> Chunk["chunkSemantic(text)\nsplit por párrafos\nmerge hasta 800 chars\nfallback overlap 80 chars"]
    Chunk --> EmbedLoop["por cada chunk:\nCohere search_document → float[1024]"]
    EmbedLoop --> Insert["INSERT INTO rag_chunks\nOracleType.VECTOR con float[]"]
    Insert --> Done(["✅ Document indexed!\nX chunks stored."])
```

## Formatos soportados

| Formato | Extractor |
|---|---|
| PDF | Apache PDFBox 3.0.3 |
| DOCX | Apache POI 5.3.0 |
| TXT | Java plain text |

## Re-upload

Al subir documento ya existente, `deleteChunksForDoc(docId)` elimina chunks anteriores antes de indexar — evita duplicados en búsqueda vectorial.
