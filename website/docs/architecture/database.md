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

```
PROJECT_TT ──────────────────────────────────────────────────┐
  pj_id (PK)                                                 │
  name_pj, date_start_pj, date_end_set_pj                   │
  date_end_real_pj, auto_rollover, auto_close_sprint         │
       │                                                      │
       ├──── SPRINT_TT                                        │
       │       spr_id (PK)                                    │
       │       name_sprint, date_start_spr, date_end_spr     │
       │       task_goal, state_sprint (active/done)          │
       │       pj_id (FK)                                     │
       │           │                                          │
       │           ├──── FEATURE_TT                           │
       │           │       feature_id (PK)                    │
       │           │       name_feature, description          │
       │           │       priority_feature, spr_id (FK)      │
       │           │           │                              │
       │           │           └──── TASK_TT                  │
       │           │                   task_id (PK)           │
       │           │                   name_task, info_task   │
       │           │                   story_points, priority │
       │           │                   date_start/end_task    │
       │           │                   user_id (FK)           │
       │           │                   feature_id (FK)        │
       │           │                   pj_id (FK)             │
       │           │                       │
       │           └──── SPRINT_TASK_TT    │
       │                   spr_id (PK,FK)  │
       │                   task_id (PK,FK)─┘
       │                   state_task (active/done/delayed)
       │
       ├──── PROJECT_USER_TT
       │       pj_id (PK,FK)
       │       user_id (PK,FK)
       │
       ├──── DOCUMENT_TT
       │       doc_id (PK)
       │       name_pj_doc, url_obj_store
       │       date_upload, embed_status (loading/loaded)
       │       pj_id (FK)
       │           │
       │           └──── DOCUMENT_CHUNK_TT
       │                   chunk_id (PK)
       │                   doc_id (FK), pj_id
       │                   chunk_index, chunk_text (CLOB)
       │                   doc_name
       │
USER_TT
  user_id (PK)
  name_user, mail, password
  id_telegram, role (manager/developer)

TODO_ITEM (legacy)
SUBTASK_TT
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
