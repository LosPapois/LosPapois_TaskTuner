---
id: web
sidebar_position: 1
title: Flujo Web
---

# Flujo Web

```mermaid
flowchart TD
    Start([Inicio]) --> Login[/login]
    Login -->|credenciales válidas| Home[/home\nSelector de proyectos]
    Home --> Projects[/projects]
    Home --> Tasks[/tasks\nMis tareas]
    Home --> Archive[/archive]
    Projects --> Team["/projects/:id/team"]
    Projects --> Stats["/projects/:id/statistics"]
    Projects --> Sprint["/projects/:id/sprints/:sprintId"]
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
