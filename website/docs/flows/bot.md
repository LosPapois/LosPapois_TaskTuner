---
id: bot
sidebar_position: 2
title: Flujo del Bot
---

# Flujo del Bot de Telegram

```mermaid
flowchart TD
    Msg([Usuario envía mensaje]) --> Ctrl[ToDoItemBotController.consume]
    Ctrl --> HasDoc{¿hasDocument?}
    HasDoc -->|Sí| Sentinel["fileId → /uploaddoc sentinel"]
    HasDoc -->|No| Exec["por-chat ExecutorService\n1 hilo por chat"]
    Sentinel --> Exec
    Exec --> Process[processUpdate → crea BotActions]
    Process --> Chain["Cadena 25 handlers\nfnStart → fnHide → fnLogin → ... → fnElse"]
    Chain --> Auth{¿isUserAuthenticated?}
    Auth -->|No| LoginScreen[Muestra pantalla de login]
    Auth -->|Sí| Dispatch{Tipo de input}
    Dispatch -->|Comando de texto| Cmd["/start, /addtask, /ask, /uploaddoc..."]
    Dispatch -->|Estado activo| State["Máquina de estados\nWAITING_NEW_ITEM_NAME\n→ WAITING_NEW_ITEM_SP\n→ ..."]

    classDef trigger fill:#DBEAFE,stroke:#2563EB,color:#1E3A5F
    classDef process fill:#DCFCE7,stroke:#16A34A,color:#14532D
    classDef decision fill:#FEF9C3,stroke:#CA8A04,color:#713F12
    classDef state fill:#EDE9FE,stroke:#7C3AED,color:#3B0764
    classDef error fill:#FEE2E2,stroke:#DC2626,color:#7F1D1D

    class Msg,Ctrl trigger
    class Exec,Process,Chain,Sentinel process
    class HasDoc,Auth,Dispatch decision
    class Cmd,State state
    class LoginScreen error
```

## Concurrencia por chat

Cada chat tiene su propio `ExecutorService` de 1 hilo. Garantiza que los mensajes del mismo usuario se procesen en orden sin race conditions, sin locks explícitos.

## Máquina de estados

`BotConversationState` define ~45 estados en un `ConcurrentHashMap<Long, BotConversationState>` indexado por `chatId`:

```mermaid
flowchart LR
    N1[WAITING_NEW_ITEM_NAME]
    N2[WAITING_NEW_ITEM_DESCRIPTION]
    N3[WAITING_NEW_ITEM_SP]
    N4[WAITING_NEW_ITEM_PRIORITY]
    N5[WAITING_NEW_ITEM_FEATURE]
    N6[WAITING_NEW_ITEM_SPRINT]
    Done([tarea creada ✅])

    N1 --> N2 --> N3 --> N4 --> N5 --> N6 --> Done

    classDef step fill:#EDE9FE,stroke:#7C3AED,color:#3B0764
    classDef done fill:#DCFCE7,stroke:#16A34A,color:#14532D

    class N1,N2,N3,N4,N5,N6 step
    class Done done
```
