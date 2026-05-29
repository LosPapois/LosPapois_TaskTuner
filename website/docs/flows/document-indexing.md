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

    classDef trigger fill:#DBEAFE,stroke:#2563EB,color:#1E3A5F
    classDef process fill:#F3F4F6,stroke:#6B7280,color:#111827
    classDef extractor fill:#FFEDD5,stroke:#EA580C,color:#7C2D12
    classDef oracle fill:#F3E8FF,stroke:#9333EA,color:#3B0764
    classDef cohere fill:#FEF9C3,stroke:#CA8A04,color:#713F12
    classDef done fill:#DCFCE7,stroke:#16A34A,color:#14532D
    classDef decision fill:#FEE2E2,stroke:#DC2626,color:#7F1D1D

    class Upload trigger
    class Process,Download,Delete process
    class Extract decision
    class PDFBox,POI,Plain extractor
    class SaveClob,Insert oracle
    class Chunk,EmbedLoop cohere
    class Done done
```

## Formatos soportados

| Formato | Extractor |
|---|---|
| PDF | Apache PDFBox 3.0.3 |
| DOCX | Apache POI 5.3.0 |
| TXT | Java plain text |

## Re-upload

Al subir documento ya existente, `deleteChunksForDoc(docId)` elimina chunks anteriores antes de indexar — evita duplicados en búsqueda vectorial.
