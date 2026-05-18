# TaskTuner — Documentación del Proyecto

---

## 1. Aplicación

**TaskTuner** es una aplicación de gestión de proyectos de software diseñada para equipos ágiles. Combina una interfaz web moderna con un bot de Telegram inteligente que permite a los desarrolladores gestionar tareas, sprints y features directamente desde su dispositivo móvil, sin necesidad de abrir el navegador.

El sistema incorpora un asistente de IA con capacidades de **RAG (Retrieval-Augmented Generation)** que permite consultar documentos del proyecto (PDFs, DOCX, TXT) y responder preguntas cruzando la información del documento con el estado real del proyecto en la base de datos.

**Repositorio:** `LosPapois/LosPapois_TaskTuner`  
**Rama principal:** `main`  
**Equipo:** Los Papois

---

## 2. Tecnologías Usadas

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Java | 17 | Lenguaje principal |
| Spring Boot | 3.5.6 | Framework principal |
| Spring Data JPA | — | ORM / acceso a base de datos |
| Spring Security | — | Autenticación y autorización |
| Hibernate | 6.6.29 | Mapeo objeto-relacional |
| Apache Lucene | 9.10.0 | Índice BM25 para RAG |
| Apache PDFBox | 3.0.3 | Extracción de texto de PDFs |
| Apache POI | 5.3.0 | Extracción de texto de DOCX |
| Apache HttpClient5 | — | Llamadas HTTP a APIs externas |
| Telegram Bot API | 9.1.0 | Bot de Telegram |
| Groq API (Llama 3.3 70B) | — | LLM para asistente de IA |
| Lombok | — | Reducción de boilerplate |
| SpringDoc OpenAPI | 2.8.6 | Documentación Swagger UI |
| spring-dotenv | 4.0.0 | Variables de entorno desde `.env` |

### Frontend
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

### Infraestructura
| Tecnología | Uso |
|---|---|
| Oracle Cloud (OCI) | Hosting principal |
| Oracle Kubernetes Engine (OKE) | Orquestación de contenedores |
| OCI Container Registry (OCIR) | Registro de imágenes Docker |
| Docker | Contenerización |
| GitHub Actions | CI/CD (pipelines: main, staging, dev) |

### Base de Datos
| Tecnología | Uso |
|---|---|
| Oracle Database 23ai | Base de datos principal |
| Oracle JDBC 23.7 | Driver de conexión |
| Oracle UCP | Connection pooling |
| Oracle Wallet | Autenticación mTLS con Autonomous DB |

---

## 3. Ambiente de Desarrollo

### Requisitos
| Herramienta | Versión |
|---|---|
| Java JDK | 17+ |
| Maven | 3.9+ |
| Node.js | v23.9.0 |
| npm | 8.1.2 |
| Docker | 24+ |

### Configuración Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/LosPapois/LosPapois_TaskTuner.git

# 2. Configurar variables de entorno en application.properties
spring.datasource.url=jdbc:oracle:thin:@tasktuner_medium?TNS_ADMIN=<ruta_wallet>
telegram.bot.token=<token>
telegram.bot.name=<nombre_bot>
groq.enabled=true
groq.api.key=<api_key>

# 3. Compilar y levantar
cd MtdrSpring/backend
mvn spring-boot:run
```

El frontend se compila automáticamente con Maven mediante `frontend-maven-plugin` y se sirve como recursos estáticos desde Spring Boot en el mismo puerto `8080`.

### CI/CD (GitHub Actions)
```
Push a main     → main-pipeline.yml    → Build → Docker → Deploy OKE (producción)
Push a staging  → staging-pipeline.yml → Build → Docker → Deploy OKE (staging)
Push a dev      → dev-pipeline.yml     → Build → Docker → Deploy OKE (desarrollo)
```

### Deployment en OCI
```yaml
# Kubernetes: 2 réplicas con LoadBalancer
Service: puerto 80 → 8080
Replicas: 2
Secrets: DB wallet + env vars (bot token, API keys)
```

---

## 4. Base de Datos

**Motor:** Oracle Database 23ai (Autonomous Database)  
**Conexión:** mTLS con Oracle Wallet  
**DDL Auto:** `spring.jpa.hibernate.ddl-auto=update`

### Diagrama de Tablas

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

### Tablas Principales

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
| `DOCUMENT_CHUNK_TT` | Chunks de texto extraídos de documentos (source of truth del índice RAG) |

---

## 5. Componentes

### Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENTE                              │
│   Browser (React SPA)    Telegram (Bot)                  │
└────────────┬──────────────────┬────────────────────────-┘
             │ HTTP/REST        │ Long Polling
             ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│              SPRING BOOT (puerto 8080)                   │
│                                                          │
│  REST Controllers          Bot Controller                │
│  ├── AuthController        ToDoItemBotController         │
│  ├── TaskTTController           │                        │
│  ├── SprintTTController    BotActions (lógica)           │
│  ├── ProjectTTController        │                        │
│  ├── FeatureTTController   ┌────┴─────────────────┐     │
│  ├── DocumentTTController  │ Services del Bot      │     │
│  ├── UserTTController      │ ├── GroqService (LLM) │     │
│  ├── KpisController        │ ├── LuceneService     │     │
│  └── SPAErrorController    │ ├── DocProcessingSvc  │     │
│                            │ └── RagIndexRebuild   │     │
│  Services                  └──────────────────────┘     │
│  ├── UserTTService                                       │
│  ├── TaskTTService                                       │
│  ├── SprintTTService                                     │
│  ├── ProjectTTService                                    │
│  ├── FeatureTTService                                    │
│  └── DocumentTTService                                   │
│                                                          │
│  Security                                                │
│  ├── ApiSecurityFilter (JWT)                             │
│  └── WebSecurityConfiguration                           │
└──────────────────┬──────────────────────────────────────┘
                   │ JPA / JDBC
                   ▼
┌─────────────────────────────────────────────────────────┐
│           ORACLE DATABASE 23ai                           │
└─────────────────────────────────────────────────────────┘
                   +
┌─────────────────────────────────────────────────────────┐
│           LUCENE INDEX (disco local)                     │
│           Reconstruido desde Oracle al arrancar          │
└─────────────────────────────────────────────────────────┘
```

### Componentes del Bot

| Clase | Responsabilidad |
|---|---|
| `ToDoItemBotController` | Recibe updates de Telegram, despacha por chat, maneja documentos |
| `BotActions` | Lógica de conversación — 25 handlers (`fnStart`, `fnAddItem`, `fnAsk`, etc.) |
| `BotConversationState` | 45 estados de conversación (máquina de estados por chat) |
| `GroqService` | Cliente HTTP a Groq API (Llama 3.3 70B), sanitización anti-injection |
| `LuceneService` | Indexado y búsqueda BM25 por proyecto |
| `DocumentProcessingService` | Descarga archivos de Telegram, extrae texto, chunking, indexa |
| `RagIndexRebuildService` | Reconstruye índice Lucene desde Oracle al arrancar |
| `ClaudeService` | Cliente Claude API (opcional, activable con `claude.enabled=true`) |

### Componentes del Frontend

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

---

## 6. Secuencia Lógica de la Aplicación (Navegación)

### Flujo Web

```
[Inicio]
    │
    ▼
/login ──── (credenciales) ──── /home
                                    │
                     ┌──────────────┼─────────────────┐
                     ▼              ▼                  ▼
                /projects        /tasks            /archive
                     │
          ┌──────────┴──────────────┐
          ▼                         ▼
    /projects/:id/team    /projects/:id/statistics
          │
          ▼
    /projects/:id/sprints/:sprintId
```

### Flujo del Bot de Telegram

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

### Flujo RAG (cuando usuario hace /ask)

```
/ask ¿Qué features faltan por implementar?
        │
        ▼
sanitizeAiInput() ── protección contra prompt injection
        │
        ▼
buildRagContext()
    └── LuceneService.search(pjId, query, top=4)
        └── BM25 search en índice del proyecto
        └── retorna top-4 chunks del documento
        │
        ▼
buildUnifiedAiPrompt()
    └── buildContextString()
        └── sprints + tareas + features actuales desde Oracle
        │
        ▼
systemPrompt = prompt_base + contexto_oracle + chunks_RAG
        │
        ▼
GroqService.ask(systemPrompt, pregunta_usuario)
    └── POST https://api.groq.com → Llama 3.3 70B
        │
        ▼
Respuesta JSON parseada → BotHelper.sendMessageToTelegram()
```

---

## 7. Características de la Aplicación

### Gestión de Proyectos
- Creación y administración de proyectos con fechas y configuración
- Asignación de miembros al proyecto con roles (manager / developer)
- Auto-rollover de tareas no completadas al siguiente sprint
- Auto-cierre de sprints al llegar a la fecha de fin

### Gestión de Sprints
- Creación de sprints con nombre, fechas y meta de story points
- Activación y cierre de sprints
- Historial de sprints activos y completados

### Gestión de Tareas
- Creación multi-paso con nombre, descripción, story points, prioridad, fechas, feature y sprint
- Asignación a developers
- Marcar como completada / reabrir
- Edición de todos los campos
- Vista de tareas pendientes y completadas por sprint

### Gestión de Features
- Agrupación de tareas en features por sprint
- Creación y edición de features con prioridad
- Vista de features por sprint

### Asistente de IA (Bot Telegram)
- **Preguntas sobre el proyecto:** estado del sprint, tareas pendientes, progreso
- **Creación con lenguaje natural:** "agrega una tarea de fix de login, alta prioridad, 3 story points"
- **Importación masiva:** pega texto y la IA extrae las tareas automáticamente
- **Sugerencia de siguiente tarea:** recomienda qué trabajar según prioridad y complejidad
- **RAG con documentos:**
  - Sube PDFs, DOCX o TXT directamente al chat
  - El bot extrae el texto, lo divide en chunks y lo indexa con BM25
  - Las preguntas con `/ask` cruzan el documento con el estado real del proyecto
  - Los documentos persisten en Oracle y sobreviven reinicios del servidor
- **Protección anti-injection:** 7 patrones regex que sanitizan el input del usuario antes de enviarlo al LLM

### Estadísticas y KPIs
- Burndown chart por sprint
- Velocidad del equipo (story points completados por sprint)
- Distribución de story points por developer
- Comparativa de fecha estimada vs. fecha real de entrega
- Filtrado por sprint activo y completados

### Seguridad
- Autenticación basada en JWT para la API REST
- Autenticación del bot via Telegram ID (vinculación de cuenta)
- Spring Security con roles (manager / developer)
- Protección CORS
- Sanitización de inputs del bot contra prompt injection

### Infraestructura
- Contenedorizado con Docker
- Desplegado en Oracle Kubernetes Engine (OKE) con 2 réplicas
- CI/CD automatizado con GitHub Actions (pipelines separados para dev/staging/main)
- Frontend servido como recursos estáticos desde Spring Boot (un solo artefacto JAR)

---

## 8. Puntos para Exponer en Clase

### Demo sugerida (orden de presentación)

1. **Mostrar la app web** — login → home → proyecto → sprint → tareas
2. **Mostrar el bot de Telegram** — login automático → menú principal
3. **Crear tarea con lenguaje natural** — `/ask` "agrega tarea de fix de autenticación, alta prioridad"
4. **Demostrar RAG:**
   - Subir `requerimientos.txt` directamente al chat (clip 📎)
   - Bot responde: `✅ Document indexed!`
   - Preguntar: `/ask Con base en el documento de requerimientos, ¿qué features aún no han sido implementadas?`
5. **Mostrar estadísticas** — burndown chart, velocidad del equipo
6. **Mostrar arquitectura** — diagrama de componentes

### Puntos técnicos clave

| Punto | Por qué es relevante |
|---|---|
| Un JAR sirve frontend + backend | Sin servidor web separado — despliegue simplificado |
| Por-chat ExecutorService | Procesa mensajes del mismo chat en orden — sin race conditions |
| RAG con BM25 vs. vectores | Sin API de embeddings — BM25 funciona bien para terminología específica de proyecto |
| Oracle como source of truth del RAG | Lucene es cache reconstruible — datos no se pierden en restart |
| Sanitización multi-capa | Input del usuario nunca toca el system prompt directamente |
| `ApplicationReadyEvent` para rebuild | Garantiza que JPA está listo antes de leer chunks de Oracle |

### Decisiones de arquitectura a mencionar

- **¿Por qué Spring Boot + React en un solo JAR?** Simplifica el deployment en Kubernetes — un solo contenedor, un solo servicio.
- **¿Por qué BM25 y no embeddings vectoriales?** No requiere API key adicional. Para términos específicos de proyectos (nombres de features, tareas) BM25 compite con embeddings.
- **¿Por qué Telegram?** Permite usar el asistente desde el móvil sin instalar una app. Telegram maneja la autenticación del usuario.
- **¿Por qué Oracle Autonomous DB?** El equipo ya tenía créditos de OCI. Oracle 23ai tiene soporte nativo de vectores para RAG futuro.
