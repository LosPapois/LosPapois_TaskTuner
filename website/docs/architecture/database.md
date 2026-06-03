---
id: database
sidebar_position: 3
title: Base de Datos
---

# Base de Datos

**Motor:** Oracle Database 23ai (Autonomous Database)  
**Conexión:** mTLS con Oracle Wallet  
**DDL Auto:** `spring.jpa.hibernate.ddl-auto=update`

## Diagrama de Tablas

```mermaid
erDiagram
    PROJECT_TT {
        number pj_id PK
        string name_pj
        date date_start_pj
        date date_end_set_pj
        date date_end_real_pj
        boolean auto_rollover
        boolean auto_close_sprint
    }
    SPRINT_TT {
        number spr_id PK
        string name_sprint
        date date_start_spr
        date date_end_spr
        number task_goal
        string state_sprint
        number pj_id FK
    }
    FEATURE_TT {
        number feature_id PK
        string name_feature
        string description
        string priority_feature
        number spr_id FK
    }
    TASK_TT {
        number task_id PK
        string name_task
        string info_task
        number story_points
        string priority
        date date_start_task
        date date_end_task
        number user_id FK
        number feature_id FK
        number pj_id FK
    }
    SPRINT_TASK_TT {
        number spr_id PK_FK
        number task_id PK_FK
        string state_task
    }
    USER_TT {
        number user_id PK
        string name_user
        string mail
        string password
        string id_telegram
        string role
    }
    PROJECT_USER_TT {
        number pj_id PK_FK
        number user_id PK_FK
    }
    DOCUMENT_TT {
        number doc_id PK
        string name_pj_doc
        string url_obj_store
        date date_upload
        string embed_status
        number pj_id FK
    }
    DOCUMENT_CHUNK_TT {
        number chunk_id PK
        number doc_id FK
        number pj_id
        number chunk_index
        clob chunk_text
        string doc_name
    }
    RAG_CHUNKS {
        number chunk_id PK
        number doc_id FK
        number pj_id
        clob content
        vector embedding
    }

    PROJECT_TT ||--o{ SPRINT_TT : "tiene"
    PROJECT_TT ||--o{ PROJECT_USER_TT : "tiene"
    PROJECT_TT ||--o{ DOCUMENT_TT : "tiene"
    SPRINT_TT ||--o{ FEATURE_TT : "tiene"
    SPRINT_TT ||--o{ SPRINT_TASK_TT : "tiene"
    FEATURE_TT ||--o{ TASK_TT : "agrupa"
    TASK_TT ||--o{ SPRINT_TASK_TT : "pertenece"
    USER_TT ||--o{ TASK_TT : "asignado"
    USER_TT ||--o{ PROJECT_USER_TT : "miembro"
    DOCUMENT_TT ||--o{ DOCUMENT_CHUNK_TT : "chunks"
    DOCUMENT_TT ||--o{ RAG_CHUNKS : "embeddings"
```

## Tablas Principales

| Tabla | Descripción |
|---|---|
| `USER_TT` | Usuarios del sistema con rol y vinculación a Telegram |
| `PROJECT_TT` | Proyectos con fechas y configuración de auto-gestión |
| `SPRINT_TT` | Sprints con estado y meta de story points |
| `TASK_TT` | Tareas con estimaciones, prioridad y fechas reales |
| `FEATURE_TT` | Agrupaciones de tareas por funcionalidad |
| `SPRINT_TASK_TT` | Relación muchos a muchos entre sprints y tareas |
| `PROJECT_USER_TT` | Membresía de usuarios en proyectos |
| `DOCUMENT_TT` | Metadatos de documentos subidos para RAG |
| `DOCUMENT_CHUNK_TT` | Chunks de texto extraídos de documentos (legacy, pre-vector) |
| `RAG_CHUNKS` | Chunks semánticos con embeddings `VECTOR(1024, FLOAT32)` para búsqueda vectorial |
