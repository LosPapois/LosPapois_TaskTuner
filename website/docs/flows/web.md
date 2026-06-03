---
id: web
sidebar_position: 1
title: Flujo Web
---

# Flujo Web

```mermaid
flowchart TD
    Start([Inicio]) --> Login["'/login'"]
    Login -->|credenciales válidas| Home["'/home'\nSelector de proyectos"]
    Home --> Projects["'/projects'"]
    Home --> Tasks["'/tasks'\nMis tareas"]
    Home --> Archive["'/archive'"]
    Projects --> Team["'/projects/:id/team'"]
    Projects --> Stats["'/projects/:id/statistics'"]
    Projects --> Sprint["'/projects/:id/sprints/:sprintId'"]

    classDef entry fill:#DBEAFE,stroke:#2563EB,color:#1E3A5F
    classDef hub fill:#DCFCE7,stroke:#16A34A,color:#14532D
    classDef page fill:#F3F4F6,stroke:#6B7280,color:#111827

    class Start,Login entry
    class Home hub
    class Projects,Tasks,Archive,Team,Stats,Sprint page
```

## Rutas

| Ruta | Descripción |
|---|---|
| `/login` | Autenticación |
| `/signup` | Registro |
| `/home` | Selector de proyectos |
| `/tasks` | Tareas del usuario activo |
| `/projects` | Lista de proyectos |
| `/projects/:id/team` | Gestión de equipo |
| `/projects/:id/statistics` | KPIs y gráficas |
| `/projects/:id/sprints/:sprintId` | Detalle de sprint |
| `/archive` | Proyectos archivados |
| `/profile` | Perfil de usuario |
