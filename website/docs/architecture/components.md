---
id: components
sidebar_position: 2
title: Componentes
---

# Componentes

## Arquitectura General

```
┌──────────────────────────────────────────────────────────────┐
│                        CLIENTE                                │
│    Browser (React SPA)          Telegram (Bot)                │
└─────────────┬────────────────────────┬────────────────────────┘
              │ HTTP/REST              │ Long Polling
              ▼                        ▼
┌──────────────────────────────────────────────────────────────┐
│                SPRING BOOT (puerto 8080)                      │
│                                                               │
│  REST Controllers             Bot Controller                  │
│  ├── AuthController           ToDoItemBotController           │
│  ├── TaskTTController              │                          │
│  ├── SprintTTController       BotActions (lógica)             │
│  ├── ProjectTTController           │                          │
│  ├── FeatureTTController      ┌────┴──────────────────────┐  │
│  ├── DocumentTTController     │ Services del Bot           │  │
│  ├── UserTTController         │ ├── GroqService (LLM)      │  │
│  ├── KpisController           │ ├── VectorService (RAG)    │  │
│  └── SPAErrorController       │ └── DocProcessingSvc       │  │
│                               └────────────┬──────────────┘  │
│  Services                                  │                  │
│  ├── UserTTService                         │ Cohere API       │
│  ├── TaskTTService                         │ (embeddings)     │
│  ├── SprintTTService                       │                  │
│  ├── ProjectTTService         ┌────────────▼──────────────┐  │
│  ├── FeatureTTService         │  Groq API (Llama 3.3 70B) │  │
│  └── DocumentTTService        │  · Respuestas LLM          │  │
│                               │  · Expansión de queries    │  │
│  Security                     └───────────────────────────┘  │
│  ├── ApiSecurityFilter (JWT)                                  │
│  └── WebSecurityConfiguration                                 │
└─────────────────────┬────────────────────────────────────────┘
                      │ JPA / JDBC (OracleType.VECTOR)
                      ▼
┌──────────────────────────────────────────────────────────────┐
│                 ORACLE DATABASE 23ai                          │
│                                                               │
│  Tablas relacionales (JPA)      Tabla vectorial (JDBC raw)   │
│  USER_TT, PROJECT_TT,           RAG_CHUNKS                   │
│  TASK_TT, SPRINT_TT, ...        VECTOR(1024, FLOAT32)        │
│                                 VECTOR INDEX (HNSW, COSINE)  │
└──────────────────────────────────────────────────────────────┘
```

## Componentes del Bot

| Clase | Responsabilidad |
|---|---|
| `ToDoItemBotController` | Recibe updates de Telegram, despacha por chat, maneja documentos |
| `BotActions` | Lógica de conversación — 25 handlers (`fnStart`, `fnAddItem`, `fnAsk`, etc.) |
| `BotConversationState` | 45 estados de conversación (máquina de estados por chat) |
| `GroqService` | Cliente HTTP a Groq API (Llama 3.3 70B), sanitización anti-injection, expansión de queries |
| `VectorService` | RAG vectorial: chunking semántico, Cohere embeddings, Oracle VECTOR insert/search, re-ranking híbrido |
| `DocumentProcessingService` | Descarga archivos de Telegram, extrae texto (PDFBox/POI), delega indexado a VectorService |
| `ClaudeService` | Cliente Claude API (opcional, activable con `claude.enabled=true`) |

## Componentes del Frontend

| Página / Ruta | Descripción |
|---|---|
| `/login`, `/signup` | Autenticación y registro |
| `/home` | Selector de proyectos |
| `/tasks` | Vista de tareas del usuario |
| `/projects` | Gestión de proyectos |
| `/projects/:id/team` | Gestión de equipo |
| `/projects/:id/statistics` | Estadísticas y KPIs con gráficas |
| `/projects/:id/sprints/:sprintId` | Detalle de sprint |
| `/archive` | Proyectos archivados |
| `/profile` | Perfil de usuario |
