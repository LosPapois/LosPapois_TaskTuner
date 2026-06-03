---
id: cicd
sidebar_position: 2
title: CI/CD y Deployment
---

# CI/CD y Deployment

## GitHub Actions — Pipelines

| Push a rama | Pipeline | Destino |
|---|---|---|
| `main` | `main-pipeline.yml` | Producción (OKE) |
| `staging` | `staging-pipeline.yml` | Staging (OKE) |
| `dev` | `dev-pipeline.yml` | Desarrollo (OKE) |

Cada pipeline ejecuta: **Build → Docker image → Push OCIR → Deploy OKE**

## Deployment en OCI

```yaml
# Kubernetes: 2 réplicas con LoadBalancer
Service: puerto 80 → 8080
Replicas: 2
Secrets: DB wallet + env vars (bot token, API keys)
```

## Infraestructura

| Componente | Servicio OCI |
|---|---|
| Orquestación | Oracle Kubernetes Engine (OKE) |
| Imágenes Docker | OCI Container Registry (OCIR) |
| Base de datos | Oracle Autonomous Database 23ai |
| Red | LoadBalancer con IP pública |
