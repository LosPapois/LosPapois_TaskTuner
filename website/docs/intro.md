---
id: intro
sidebar_position: 1
title: Introducción
---

# TaskTuner

**TaskTuner** es una aplicación de gestión de proyectos de software diseñada para equipos ágiles. Combina una interfaz web moderna con un bot de Telegram inteligente que permite a los desarrolladores gestionar tareas, sprints y features directamente desde el móvil, sin abrir el navegador.

El sistema incorpora un asistente de IA con capacidades de **RAG (Retrieval-Augmented Generation)** que permite consultar documentos del proyecto (PDFs, DOCX, TXT) y responder preguntas cruzando el documento con el estado real del proyecto en la base de datos.

| | |
|---|---|
| **Repositorio** | `LosPapois/LosPapois_TaskTuner` |
| **Rama principal** | `main` |
| **Equipo** | Los Papois |

## Componentes principales

| Componente | Descripción |
|---|---|
| **Web app** | SPA React + TypeScript servida desde Spring Boot |
| **Backend** | Spring Boot 3, REST API, seguridad JWT |
| **Bot Telegram** | Máquina de estados con 25 handlers y asistente IA |
| **Base de datos** | Oracle Database 23ai con búsqueda vectorial nativa |
| **RAG pipeline** | Cohere embeddings + Oracle VECTOR + Groq LLM |

## Navegación rápida

- [Stack tecnológico](/docs/architecture/tech-stack)
- [Arquitectura de componentes](/docs/architecture/components)
- [Configuración local](/docs/dev/setup)
- [Flujo del bot](/docs/flows/bot)
- [Decisiones de diseño RAG](/docs/rag/overview)
- [API Reference](/docs/api)
