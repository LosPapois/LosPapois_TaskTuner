---
id: components
sidebar_position: 2
title: Componentes
---

# Componentes

## Arquitectura General

```mermaid
flowchart TB
    subgraph CLIENTE["🖥️ Cliente"]
        Browser["🌐 Browser\nReact SPA"]
        Telegram["📱 Telegram\nBot"]
    end

    subgraph SPRING["⚙️ Spring Boot :8080"]
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

    subgraph EXTERNAL["🌐 APIs Externas"]
        GroqAPI["Groq API\nLlama 3.3 70B"]
        CohereAPI["Cohere API\nembed-multilingual-v3.0"]
    end

    subgraph DB["🗄️ Oracle Database 23ai"]
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

    classDef client fill:#DBEAFE,stroke:#2563EB,color:#1E3A5F
    classDef spring fill:#DCFCE7,stroke:#16A34A,color:#14532D
    classDef bot fill:#EDE9FE,stroke:#7C3AED,color:#3B0764
    classDef svc fill:#FEF9C3,stroke:#CA8A04,color:#713F12
    classDef sec fill:#FEE2E2,stroke:#DC2626,color:#7F1D1D
    classDef ext fill:#FFEDD5,stroke:#EA580C,color:#7C2D12
    classDef db fill:#F3E8FF,stroke:#9333EA,color:#3B0764

    class Browser,Telegram client
    class Auth,TaskC,SprintC,ProjC,FeatC,DocC,UserC,KpiC spring
    class BotCtrl,BotAct,Groq,Vector,DocProc bot
    class US,TS,SS,PS,FS,DS svc
    class JWT,WebSec sec
    class GroqAPI,CohereAPI ext
    class Relational,Vector2 db
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
