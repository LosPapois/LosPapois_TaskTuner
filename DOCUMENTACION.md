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
| Apache PDFBox | 3.0.3 | Extracción de texto de PDFs |
| Apache POI | 5.3.0 | Extracción de texto de DOCX |
| Apache HttpClient5 | — | Llamadas HTTP a APIs externas |
| Telegram Bot API | 9.1.0 | Bot de Telegram |
| Groq API (Llama 3.3 70B) | — | LLM para asistente de IA y expansión de queries RAG |
| Cohere API (embed-multilingual-v3.0) | — | Embeddings vectoriales 1024-dim para RAG |
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
| Oracle Database 23ai | Base de datos principal + motor de búsqueda vectorial nativo |
| Oracle JDBC 23.7 | Driver de conexión (soporta `OracleType.VECTOR` con `float[]`) |
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
| `DOCUMENT_CHUNK_TT` | Chunks de texto extraídos de documentos (legacy, pre-vector) |
| `RAG_CHUNKS` | Chunks semánticos con embeddings `VECTOR(1024, FLOAT32)` para búsqueda vectorial |

---

## 5. Componentes

### Arquitectura General

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

### Componentes del Bot

| Clase | Responsabilidad |
|---|---|
| `ToDoItemBotController` | Recibe updates de Telegram, despacha por chat, maneja documentos |
| `BotActions` | Lógica de conversación — 25 handlers (`fnStart`, `fnAddItem`, `fnAsk`, etc.) |
| `BotConversationState` | 45 estados de conversación (máquina de estados por chat) |
| `GroqService` | Cliente HTTP a Groq API (Llama 3.3 70B), sanitización anti-injection, expansión de queries |
| `VectorService` | RAG vectorial: chunking semántico, Cohere embeddings, Oracle VECTOR insert/search, re-ranking híbrido |
| `DocumentProcessingService` | Descarga archivos de Telegram, extrae texto (PDFBox/POI), delega indexado a VectorService |
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
/ask "En base al doc, dime los hitos del proyecto"
        │
        ▼
sanitizeAiInput() ── protección contra prompt injection
        │
        ▼
buildRagContext() → VectorService.retrieveChunks(query, pjId)
    │
    ├─ 1. QUERY EXPANSION (Groq)
    │       GroqService.ask(expansion_prompt, query)
    │       → ["variante semántica 1", "variante semántica 2"]
    │       + query original = 3 queries en total
    │
    ├─ 2. EMBEDDING (Cohere, con cache)
    │       POST https://api.cohere.com/v2/embed
    │       model: embed-multilingual-v3.0, input_type: search_query
    │       → float[1024] por cada query (cacheado en ConcurrentHashMap)
    │
    ├─ 3. VECTOR SEARCH por cada embedding (Oracle 23ai)
    │       SELECT content, VECTOR_DISTANCE(embedding, ?, COSINE) AS dist
    │       FROM rag_chunks WHERE pj_id = ?
    │       ORDER BY dist FETCH FIRST 21 ROWS ONLY  ← CANDIDATE_K = TOP_K * 3
    │       WHERE dist < 0.70                       ← WIDE_THRESHOLD
    │       → pool de candidatos, deduplicado por contenido (mejor score por chunk)
    │
    └─ 4. HYBRID RE-RANKING (Java)
            extractKeywords(query) → filtra stopwords ES+EN
            por cada chunk: adjusted = vector_dist - keyword_bonus
            keyword_bonus = hits * 0.08, máx 0.30
            sort por adjusted_score, top 7
        │
        ▼
buildUnifiedAiPrompt()
    └── buildContextString()
        └── sprints + tareas + features actuales desde Oracle
        │
        ▼
systemPrompt = prompt_base + contexto_oracle + "=== RELEVANT DOCUMENT EXCERPTS ===" + top-7 chunks
        │
        ▼
GroqService.ask(systemPrompt, pregunta_usuario)
    └── POST https://api.groq.com → Llama 3.3 70B
        │
        ▼
Respuesta JSON parseada → tipo: answer/task/feature/suggest/off_topic
        │
        ▼
BotHelper.sendMessageToTelegram()
```

### Flujo de indexación de documentos

```
Usuario sube PDF/DOCX/TXT al bot (clip 📎)
        │
        ▼
DocumentProcessingService.processDocument(fileId, fileName, chatId)
    ├── Descarga archivo de Telegram API
    ├── Extrae texto: PDFBox (PDF) / Apache POI (DOCX) / plain (TXT)
    ├── Guarda CLOB en DOCUMENT_TT (Oracle)
    └── VectorService.deleteChunksForDoc(docId)  ← limpia re-uploads
        VectorService.indexDocument(docId, pjId, text)
            │
            ├─ chunkSemantic(text)
            │   ├── Split por párrafos (\n\n) → unidades semánticas
            │   ├── Merge párrafos cortos hasta 800 chars
            │   └── Fallback overlap (80 chars) para párrafos gigantes
            │
            └─ por cada chunk:
                embed(chunk) → Cohere search_document → float[1024]
                INSERT INTO rag_chunks (doc_id, pj_id, content, embedding)
                VALUES (?, ?, ?, ?)  ← OracleType.VECTOR con float[]
        │
        ▼
"✅ Document indexed! X chunks stored."
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

## 8. Arquitectura RAG — Decisiones de Diseño

### ¿Por qué migrar de BM25/Lucene a Oracle 23ai VECTOR?

| Criterio | BM25 (Lucene, anterior) | Vector RAG (Oracle 23ai, actual) |
|---|---|---|
| Búsqueda semántica | No — solo coincidencia léxica | Sí — entiende sinónimos, paráfrasis |
| Multilingüe | Requiere tokenizadores separados | Nativo con `embed-multilingual-v3.0` |
| Persistencia | Índice local en disco, se pierde en restart | Oracle — sobrevive deploys y reinicios |
| Escalabilidad | Un índice Lucene por JVM | Oracle maneja terabytes, índice HNSW |
| Infraestructura adicional | Ninguna (en proceso) | Cohere API (free tier: 10K embeddings/mes) |
| Complejidad operacional | Bajo | Medio (wallet, VECTOR DDL, float[] binding) |

**Decisión:** Lucene es suficiente para prototipo, pero Oracle 23ai ya estaba provisionado con soporte VECTOR nativo. La migración elimina la dependencia en disco y mejora calidad de búsqueda para queries en lenguaje natural.

---

### Arquitectura del pipeline RAG

#### Chunking — Semántico vs. Fijo

**Anterior:** cortar cada 500 caracteres con 50 de overlap.

**Problema:** un chunk podía empezar a mitad de oración o partir una lista numerada en dos chunks sin contexto.

**Actual:** split por párrafos (`\n\n`) + merge hasta 800 chars + fallback con overlap para párrafos gigantes.

```
Texto original:
"Hito 1: Validación del software\n\nHito 2: Documentación\n\nHito 3: Entrega final"

Chunking fijo (500 chars):    Chunking semántico:
["Hito 1: Validación del      ["Hito 1: Validación del software",
  software\n\nHito 2: Docu     "Hito 2: Documentación",
  mentación\n\nHito 3: En..."] "Hito 3: Entrega final"]
```

Cada chunk semántico es una unidad coherente — mejora tanto la calidad del embedding como la legibilidad en el prompt del LLM.

---

#### Score Threshold — Por qué en SQL y no en Java

```sql
SELECT content, dist FROM (
    SELECT content, VECTOR_DISTANCE(embedding, ?, COSINE) AS dist
    FROM rag_chunks WHERE pj_id = ?
    ORDER BY dist FETCH FIRST 21 ROWS ONLY
) WHERE dist < 0.70
```

El threshold en el `WHERE` de la subquery permite al índice HNSW de Oracle podar ramas durante la búsqueda en vez de traer todos los resultados a Java para filtrar. La distancia coseno devuelta por Oracle va de 0 (idéntico) a 1 (ortogonal) para vectores normalizados — Cohere produce vectores normalizados.

---

#### Query Expansion — Por qué una sola llamada LLM

Una pregunta en lenguaje natural tiene múltiples formulaciones válidas. El embedding de "hitos del cierre" es vectorialmente distante de "milestones de entrega del proyecto" aunque signifiquen lo mismo. La expansión de queries genera 2 variantes semánticas adicionales, amplía el espacio de búsqueda y mejora el recall sin aumentar el threshold (lo que traería ruido).

Costo: 1 llamada Groq extra por query Ask. Justificado porque el rate limit de Groq es 1000 req/min y el bot recibe << 10 queries/min en uso normal.

---

#### Hybrid Re-ranking — Keyword Bonus

Vector search es bueno para semántica, malo para términos exactos (nombres propios, IDs, fechas exactas). El keyword bonus reduce artificialmente la distancia coseno de chunks que contienen las palabras clave exactas de la query.

```
chunk A: dist=0.30, no contiene keywords  → adjusted = 0.30
chunk B: dist=0.35, contiene 3 keywords   → adjusted = 0.35 - (3 * 0.08) = 0.11
chunk B sube al top aunque su vector sea "peor"
```

`MAX_KEYWORD_BONUS = 0.30` evita que un chunk con muchas keywords triviales supere a uno vectorialmente muy relevante.

---

#### Cache de embeddings de queries

```java
queryEmbedCache.computeIfAbsent(query, k -> embedQuery(k));
```

`ConcurrentHashMap` en memoria. Si el usuario hace la misma pregunta dos veces (o la expansión genera una variante idéntica al original), Cohere no es llamado de nuevo. No hay TTL — el cache vive mientras viva la JVM. Aceptable para este caso de uso porque las queries de proyectos son deterministas dentro de una sesión.

---

#### DDL requerido en Oracle

```sql
CREATE TABLE rag_chunks (
    chunk_id  NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    doc_id    NUMBER REFERENCES document_tt(doc_id) ON DELETE CASCADE,
    pj_id     NUMBER,
    content   CLOB NOT NULL,
    embedding VECTOR(1024, FLOAT32)
);

CREATE VECTOR INDEX rag_chunks_idx ON rag_chunks(embedding)
ORGANIZATION INMEMORY NEIGHBOR GRAPH
DISTANCE COSINE WITH TARGET ACCURACY 95;
```

`VECTOR(1024, FLOAT32)` — 1024 dimensiones del modelo `embed-multilingual-v3.0` de Cohere. El índice HNSW (`INMEMORY NEIGHBOR GRAPH`) permite búsqueda aproximada de vecinos más cercanos en O(log n) en vez de O(n) (fuerza bruta).

---

#### Binding de VECTOR en Oracle JDBC 23.7

```java
// Correcto: pasar float[] directamente
ps.setObject(4, embedding, OracleType.VECTOR);

// Incorrecto: ORA-17004 — String to VECTOR conversion not supported
ps.setObject(4, "[0.1, 0.2, ...]", OracleType.VECTOR);
```

Oracle JDBC 23.7 serializa `float[]` al formato binario interno de VECTOR. No tiene conversión desde String definida para `OracleType.VECTOR`, a diferencia de tipos como `DATE` o `NUMBER`.

---

## 9. Puntos para Exponer en Clase

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
| Oracle 23ai como motor vectorial | Vector search nativo con índice HNSW — sin Elasticsearch ni Pinecone |
| Chunking semántico por párrafos | Preserva coherencia de unidades de texto — mejora calidad de embeddings |
| Hybrid search vector + keyword | Cobertura semántica + precisión léxica en un solo pipeline Java |
| Query expansion con Groq | Amplía recall para queries con vocabulario distinto al del documento |
| `OracleType.VECTOR` con `float[]` | JDBC 23.7 requiere array nativo — no acepta String JSON |
| Sanitización multi-capa | Input del usuario nunca toca el system prompt directamente |

### Decisiones de arquitectura a mencionar

- **¿Por qué Spring Boot + React en un solo JAR?** Simplifica el deployment en Kubernetes — un solo contenedor, un solo servicio.
- **¿Por qué Oracle 23ai para vectores y no Pinecone/Qdrant?** Oracle ya estaba provisionado. Oracle 23ai tiene `VECTOR` nativo, índice HNSW y `VECTOR_DISTANCE()` en SQL — cero infraestructura adicional.
- **¿Por qué Cohere y no OpenAI embeddings?** Cohere `embed-multilingual-v3.0` maneja español e inglés en el mismo modelo (documentos reales del equipo mezclan idiomas). Free tier de 10K embeddings/mes suficiente para el proyecto.
- **¿Por qué Groq para el LLM y no OpenAI/Anthropic?** Groq ofrece inferencia de Llama 3.3 70B gratis con rate limit generoso. Llama 3.3 70B sigue instrucciones JSON con alta consistencia — necesario para el sistema de intents tipados.
- **¿Por qué Telegram?** Permite usar el asistente desde el móvil sin instalar una app. Telegram maneja la autenticación del usuario.
- **¿Por qué chunking semántico y no fijo?** El chunking fijo parte oraciones y listas numeradas (hitos, requisitos). Los embeddings de fragmentos incompletos tienen peor representación vectorial — el modelo no puede capturar la semántica de "Hito 3:" si le falta el resto.
