---
id: bot
sidebar_position: 2
title: Flujo del Bot
---

# Flujo del Bot de Telegram

```
Usuario envía mensaje
        │
        ▼
ToDoItemBotController.consume()
        │
        ▼
dispatchUpdate() ──── ¿hasDocument? ──── Sí ──── fileId → "/uploaddoc" sentinel
        │
        ▼
por-chat ExecutorService (1 hilo por chat)
        │
        ▼
processUpdate() → crea BotActions
        │
        ▼
Cadena de 25 handlers (fnStart → fnHide → fnLogin → ... → fnElse)
        │
    ¿isUserAuthenticated?
    NO → muestra pantalla de login
    SÍ → continúa al handler correspondiente
        │
    ┌───┴────────────────────────────────────────┐
    ▼                                             ▼
Comandos de texto                         Estado de conversación
/start, /addtask, /ask, /uploaddoc...     (máquina de estados por chat)
                                          WAITING_NEW_ITEM_NAME → WAITING_NEW_ITEM_SP → ...
```

## Concurrencia por chat

Cada chat tiene su propio `ExecutorService` de 1 hilo. Esto garantiza que los mensajes del mismo usuario se procesen en orden sin race conditions, sin necesidad de locks explícitos.

## Máquina de estados

`BotConversationState` define ~45 estados almacenados en un `ConcurrentHashMap<Long, BotConversationState>` indexado por `chatId`. Cada interacción multi-paso (ej: crear tarea) avanza el estado secuencialmente:

```
WAITING_NEW_ITEM_NAME
  → WAITING_NEW_ITEM_DESCRIPTION
  → WAITING_NEW_ITEM_SP
  → WAITING_NEW_ITEM_PRIORITY
  → WAITING_NEW_ITEM_FEATURE
  → WAITING_NEW_ITEM_SPRINT
  → [tarea creada]
```
