---
id: setup
sidebar_position: 1
title: Configuración Local
---

# Configuración Local

## Requisitos

| Herramienta | Versión |
|---|---|
| Java JDK | 17+ |
| Maven | 3.9+ |
| Node.js | v23.9.0 |
| npm | 8.1.2 |
| Docker | 24+ |

## Pasos

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

:::info Un solo artefacto
Spring Boot sirve la SPA React como recursos estáticos — no hay servidor web separado. Un solo JAR, un solo contenedor, un solo servicio en Kubernetes.
:::
