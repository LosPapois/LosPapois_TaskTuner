---
id: components
sidebar_position: 2
title: Componentes
---

# Componentes

## Arquitectura General

```mermaid
flowchart TB
    subgraph CLIENTE
        Browser["🌐 Browser\nReact SPA"]
        Telegram["📱 Telegram\nBot"]
    end

    subgraph SPRING["Spring Boot :8080"]
        direction TB
        subgraph REST["REST Controllers"]
            Auth[AuthController]
            TaskC[TaskTTController]
            SprintC[SprintTTController]
            ProjC[ProjectTTController]
            FeatC[FeatureTTController]
            DocC[DocumentTTController]
            UserC[UserTTController]
            KpiC[KpisController]
        end

        subgraph BOT["Bot"]
            BotCtrl[ToDoItemBotController]
            BotAct[BotActions]
            Groq[GroqService\nLlama 3.3 70B]
            Vector[VectorService\nRAG]
            DocProc[DocumentProcessingService]
        end

        subgraph SVC["Services"]
            US[UserTTService]
            TS[TaskTTService]
            SS[SprintTTService]
            PS[ProjectTTService]
            FS[FeatureTTService]
            DS[DocumentTTService]
        end

        subgraph SEC["Security"]
            JWT[ApiSecurityFilter JWT]
            WebSec[WebSecurityConfiguration]
        end
    end

    subgraph EXTERNAL["APIs Externas"]
        GroqAPI["Groq API\nLlama 3.3 70B"]
        CohereAPI["Cohere API\nembed-multilingual-v3.0"]
    end

    subgraph DB["Oracle Database 23ai"]
        Relational["Tablas relacionales\nUSER_TT, PROJECT_TT, TASK_TT..."]
        Vector2["RAG_CHUNKS\nVECTOR(1024, FLOAT32)\nHNSW Index"]
    end

    Browser -->|HTTP/REST| REST
    Telegram -->|Long Polling| BotCtrl
    BotCtrl --> BotAct
    BotAct --> Groq
    BotAct --> Vector
    BotAct --> DocProc
    Groq -->|HTTP| GroqAPI
    Vector -->|HTTP| CohereAPI
    Vector -->|JDBC OracleType.VECTOR| Vector2
    REST --> SVC
    SVC -->|JPA| Relational
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
