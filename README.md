# TaskTuner

**TaskTuner** es una aplicación de gestión de proyectos de software para equipos ágiles. Combina una interfaz web en React con un bot de Telegram inteligente que permite gestionar tareas, sprints y features desde el móvil, sin abrir el navegador.

Incluye un asistente de IA con **RAG (Retrieval-Augmented Generation)** que consulta documentos del proyecto (PDF, DOCX, TXT) y responde cruzando esa información con el estado real del proyecto en la base de datos.

> **Equipo:** Los Papois · **Repositorio:** `LosPapois/LosPapois_TaskTuner` · **Rama principal:** `main`

---

## Características

- **Gestión de proyectos** — proyectos con miembros, roles (manager / developer), auto-rollover de tareas y auto-cierre de sprints.
- **Sprints** — creación con meta de story points, activación, cierre e historial.
- **Tareas** — alta multi-paso (descripción, story points, prioridad, fechas, feature, sprint), asignación a developers, edición y completado.
- **Features** — agrupación de tareas por sprint con prioridad.
- **Asistente de IA (bot Telegram)** — preguntas sobre el proyecto, creación con lenguaje natural, importación masiva de tareas, sugerencia de siguiente tarea y RAG sobre documentos subidos al chat.
- **Estadísticas y KPIs** — burndown, velocidad del equipo, distribución de story points por developer y estimado vs. real.
- **Seguridad** — JWT en la API REST, Spring Security con roles, CORS y sanitización anti-prompt-injection en el bot.

---

## Stack

| Capa | Tecnologías |
|---|---|
| **Backend** | Java 17, Spring Boot 3.5.6, Spring Data JPA, Spring Security, Hibernate 6.6, Telegram Bot API 9.1, Groq (Llama 3.3 70B), Cohere (embeddings) |
| **Frontend** | React 17, TypeScript 4.6, React Router 6, Material UI 5, Tailwind CSS 3.4, Chart.js 4 |
| **Base de datos** | Oracle Database 23ai (búsqueda vectorial nativa), Oracle JDBC 23.7, UCP, Oracle Wallet (mTLS) |
| **Infraestructura** | Oracle Cloud (OCI), Kubernetes (OKE), OCIR, Docker, GitHub Actions (CI/CD) |

El frontend se compila con Maven (`frontend-maven-plugin`) y se sirve como recursos estáticos desde Spring Boot — un único artefacto JAR en el puerto `8080`.

---

## Requisitos

| Herramienta | Versión |
|---|---|
| Java JDK | 17+ |
| Maven | 3.9+ |
| Node.js | v23.9.0 |
| npm | 8.1.2 |
| Docker | 24+ |

---

## Arranque local

```bash
# 1. Clonar el repositorio
git clone https://github.com/LosPapois/LosPapois_TaskTuner.git

# 2. Configurar variables en MtdrSpring/backend/src/main/resources/application.properties
spring.datasource.url=jdbc:oracle:thin:@tasktuner_medium?TNS_ADMIN=<ruta_wallet>
telegram.bot.token=<token>
telegram.bot.name=<nombre_bot>
groq.enabled=true
groq.api.key=<api_key>

# 3. Compilar y levantar (frontend incluido)
cd MtdrSpring/backend
mvn spring-boot:run
```

App disponible en `http://localhost:8080`. Documentación Swagger UI en `/swagger-ui.html`.

---

## CI/CD

| Push a | Pipeline | Destino |
|---|---|---|
| `main` | `main-pipeline.yml` | OKE — producción |
| `staging` | `staging-pipeline.yml` | OKE — staging |
| `dev` | `dev-pipeline.yml` | OKE — desarrollo |

Cada pipeline: build → imagen Docker → deploy en OKE (2 réplicas con LoadBalancer).

---

## Documentación

La documentación completa — diagrama de base de datos, arquitectura de componentes, flujos (web, bot, RAG, indexación) y decisiones de diseño RAG — está en **[DOCUMENTACION.md](DOCUMENTACION.md)**.

---

## Licencia

Ver [LICENSE](LICENSE).
