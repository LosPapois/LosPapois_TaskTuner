---
id: api
sidebar_position: 1
title: API Reference
---

# API Reference

La API REST de TaskTuner está documentada con SpringDoc OpenAPI.

## Obtener la especificación actualizada

Con el backend corriendo en local:

```bash
# Spec JSON (para importar a Postman, Insomnia, o regenerar esta página)
curl http://localhost:8080/v3/api-docs -o website/api-specs/openapi.json

# Swagger UI interactivo
open http://localhost:8080/swagger-ui/index.html
```

## Actualizar la referencia en Docusaurus

```bash
# 1. Con el backend corriendo, descarga la spec
curl http://localhost:8080/v3/api-docs -o website/api-specs/openapi.json

# 2. Regenera los docs
cd website
npm run docusaurus clean-api-docs api
npm run docusaurus gen-api-docs api

# 3. Levanta el site
npm start
```

## Autenticación

Todos los endpoints (excepto `/api/auth/login` y `/api/auth/signup`) requieren JWT:

```
Authorization: Bearer <token>
```

El token se obtiene en `POST /api/auth/login`.
