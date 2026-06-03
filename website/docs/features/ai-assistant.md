---
id: ai-assistant
sidebar_position: 4
title: Asistente de IA
---

# Asistente de IA (Bot Telegram)

## Capacidades

| Capacidad | Descripción |
|---|---|
| Preguntas sobre el proyecto | Estado del sprint, tareas pendientes, progreso |
| Creación con lenguaje natural | `"agrega una tarea de fix de login, alta prioridad, 3 story points"` |
| Importación masiva | Pega texto y la IA extrae las tareas automáticamente |
| Sugerencia de siguiente tarea | Recomienda qué trabajar según prioridad y complejidad |
| RAG con documentos | Sube PDFs, DOCX o TXT — el bot los indexa y responde preguntas cruzando documento + estado del proyecto |

## RAG con documentos

1. Sube un PDF, DOCX o TXT directamente al chat (clip 📎)
2. Bot responde: `✅ Document indexed! X chunks stored.`
3. Pregunta con `/ask "Con base en el documento, ¿qué features faltan?"`
4. El bot cruza los chunks del documento con el estado real de Oracle

Los documentos persisten en Oracle y sobreviven reinicios del servidor.

## Seguridad del asistente

**Sanitización multi-capa:** 7 patrones regex filtran el input del usuario antes de enviarlo al LLM. El input nunca toca el system prompt directamente — primero pasa por `sanitizeAiInput()`.

## Comandos del bot

| Comando | Acción |
|---|---|
| `/start` | Menú principal |
| `/addtask` | Crear tarea (flujo multi-paso) |
| `/ask <pregunta>` | Preguntar al asistente IA |
| `/uploaddoc` | Subir documento (o enviar archivo directamente) |
| `/edittask` | Editar tarea existente |
| `/mytasks` | Ver mis tareas pendientes |
