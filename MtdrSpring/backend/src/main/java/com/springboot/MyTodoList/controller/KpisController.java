package com.springboot.MyTodoList.controller;

import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import com.springboot.MyTodoList.service.KpisService;

/*
 *  KPI endpoints — all responses are Map<String,Object> rows so the SQL
 *  column aliases drive the field names (see KpisRepository for the queries).
 *
 *  Nivel proyecto (todos los sprints):
 *    GET /api/projects/{pjId}/kpis/project-velocity  — single aggregate row
 *    GET /api/projects/{pjId}/kpis/velocity          — one row per sprint
 *    GET /api/projects/{pjId}/kpis/retrabajo         — carry-over rate per sprint
 *    GET /api/projects/{pjId}/kpis/carga-equipo      — workload per team member
 *    GET /api/projects/{pjId}/kpis/completitud       — weighted completion per sprint
 *
 *  Nivel sprint (un sprint específico):
 *    GET /api/projects/{pjId}/sprints/{sprId}/kpis/velocity
 *    GET /api/projects/{pjId}/sprints/{sprId}/kpis/retrabajo
 *    GET /api/projects/{pjId}/sprints/{sprId}/kpis/carga-equipo
 *    GET /api/projects/{pjId}/sprints/{sprId}/kpis/completitud
 *
 *  Nivel feature:
 *    GET /api/features/{featureId}/kpis/completitud
 *    GET /api/features/{featureId}/kpis/velocity
 *    GET /api/features/{featureId}/kpis/carga-equipo
 */
@RestController
@RequestMapping("/api")
public class KpisController {

    @Autowired
    private KpisService kpisService;

    // ─── Nivel proyecto ───────────────────────────────────────────────────────

    /**
     * Returns a single aggregate velocity row for the entire project:
     * {@code { finished_sprints, avg_velocity }}.
     * This is a scalar summary used by the KPI cards; it differs from
     * {@link #getVelocityByProject} which returns one row per sprint.
     */
    @GetMapping("/projects/{pjId}/kpis/project-velocity")
    public ResponseEntity<Map<String, Object>> getProjectVelocityMetric(@PathVariable long pjId) {
        return ResponseEntity.ok(kpisService.getProjectVelocityMetric(pjId));
    }

    /**
     * Returns one velocity row per sprint for chart rendering.
     * Use {@link #getProjectVelocityMetric} instead when only the project-wide
     * average is needed.
     */
    @GetMapping("/projects/{pjId}/kpis/velocity")
    public ResponseEntity<List<Map<String, Object>>> getVelocityByProject(@PathVariable long pjId) {
        return ResponseEntity.ok(kpisService.getVelocityByProject(pjId));
    }

    @GetMapping("/projects/{pjId}/kpis/retrabajo")
    public ResponseEntity<List<Map<String, Object>>> getRetrabajoByProject(@PathVariable long pjId) {
        return ResponseEntity.ok(kpisService.getRetrabajoByProject(pjId));
    }

    @GetMapping("/projects/{pjId}/kpis/carga-equipo")
    public ResponseEntity<List<Map<String, Object>>> getCargaEquipoByProject(@PathVariable long pjId) {
        return ResponseEntity.ok(kpisService.getCargaEquipoByProject(pjId));
    }

    @GetMapping("/projects/{pjId}/kpis/completitud")
    public ResponseEntity<List<Map<String, Object>>> getCompletitudByProject(@PathVariable long pjId) {
        return ResponseEntity.ok(kpisService.getCompletitudByProject(pjId));
    }

    // ─── Nivel sprint ─────────────────────────────────────────────────────────

    @GetMapping("/projects/{pjId}/sprints/{sprId}/kpis/velocity")
    public ResponseEntity<List<Map<String, Object>>> getVelocityBySprint(
            @PathVariable long pjId, @PathVariable long sprId) {
        return ResponseEntity.ok(kpisService.getVelocityBySprint(pjId, sprId));
    }

    @GetMapping("/projects/{pjId}/sprints/{sprId}/kpis/retrabajo")
    public ResponseEntity<List<Map<String, Object>>> getRetrabajoBySprint(
            @PathVariable long pjId, @PathVariable long sprId) {
        return ResponseEntity.ok(kpisService.getRetrabajoBySprint(pjId, sprId));
    }

    @GetMapping("/projects/{pjId}/sprints/{sprId}/kpis/carga-equipo")
    public ResponseEntity<List<Map<String, Object>>> getCargaEquipoBySprint(
            @PathVariable long pjId, @PathVariable long sprId) {
        return ResponseEntity.ok(kpisService.getCargaEquipoBySprint(pjId, sprId));
    }

    @GetMapping("/projects/{pjId}/sprints/{sprId}/kpis/completitud")
    public ResponseEntity<List<Map<String, Object>>> getCompletitudBySprint(
            @PathVariable long pjId, @PathVariable long sprId) {
        return ResponseEntity.ok(kpisService.getCompletitudBySprint(pjId, sprId));
    }

    // ─── Nivel feature ────────────────────────────────────────────────────────

    @GetMapping("/features/{featureId}/kpis/completitud")
    public ResponseEntity<List<Map<String, Object>>> getCompletitudByFeature(@PathVariable long featureId) {
        return ResponseEntity.ok(kpisService.getCompletitudByFeature(featureId));
    }

    @GetMapping("/features/{featureId}/kpis/velocity")
    public ResponseEntity<List<Map<String, Object>>> getVelocityByFeature(@PathVariable long featureId) {
        return ResponseEntity.ok(kpisService.getVelocityByFeature(featureId));
    }

    @GetMapping("/features/{featureId}/kpis/carga-equipo")
    public ResponseEntity<List<Map<String, Object>>> getCargaByFeature(@PathVariable long featureId) {
        return ResponseEntity.ok(kpisService.getCargaByFeature(featureId));
    }
}
