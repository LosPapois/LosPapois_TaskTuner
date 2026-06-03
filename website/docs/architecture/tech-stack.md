---
id: tech-stack
sidebar_position: 1
title: Stack Tecnológico
---

# Stack Tecnológico

## Backend

| Tecnología | Versión | Uso |
|---|---|---|
| Java | 17 | Lenguaje principal |
| Spring Boot | 3.5.6 | Framework principal |
| Spring Data JPA | — | ORM / acceso a base de datos |
| Spring Security | — | Autenticación y autorización |
| Hibernate | 6.6.29 | Mapeo objeto-relacional |
| Apache PDFBox | 3.0.3 | Extracción de texto de PDFs |
| Apache POI | 5.3.0 | Extracción de texto de DOCX |
| Apache HttpClient5 | — | Llamadas HTTP a APIs externas |
| Telegram Bot API | 9.1.0 | Bot de Telegram |
| Groq API (Llama 3.3 70B) | — | LLM para asistente de IA y expansión de queries RAG |
| Cohere API (embed-multilingual-v3.0) | — | Embeddings vectoriales 1024-dim para RAG |
| Lombok | — | Reducción de boilerplate |
| SpringDoc OpenAPI | 2.8.6 | Documentación Swagger UI |
| spring-dotenv | 4.0.0 | Variables de entorno desde `.env` |

## Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | 17.0.2 | Framework UI |
| TypeScript | 4.6.4 | Tipado estático |
| React Router | 6.30.3 | Navegación SPA |
| Material UI | 5.8.0 | Componentes de interfaz |
| Tailwind CSS | 3.4.19 | Estilos utilitarios |
| Chart.js | 4.5.1 | Gráficas de estadísticas |
| react-chartjs-2 | 5.3.1 | Wrapper de Chart.js para React |
| Headless UI | 1.7.19 | Componentes accesibles sin estilos |

## Infraestructura

| Tecnología | Uso |
|---|---|
| Oracle Cloud (OCI) | Hosting principal |
| Oracle Kubernetes Engine (OKE) | Orquestación de contenedores |
| OCI Container Registry (OCIR) | Registro de imágenes Docker |
| Docker | Contenerización |
| GitHub Actions | CI/CD (pipelines: main, staging, dev) |

## Base de Datos

| Tecnología | Uso |
|---|---|
| Oracle Database 23ai | Base de datos principal + motor de búsqueda vectorial nativo |
| Oracle JDBC 23.7 | Driver de conexión (soporta `OracleType.VECTOR` con `float[]`) |
| Oracle UCP | Connection pooling |
| Oracle Wallet | Autenticación mTLS con Autonomous DB |
