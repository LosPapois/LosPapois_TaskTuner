package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.SprintMetricsResult;
import com.springboot.MyTodoList.model.SprintTT;
import com.springboot.MyTodoList.service.SprintTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import java.net.URI;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SprintTTController {

    @Autowired
    private SprintTTService sprintTTService;

    @GetMapping(value = "/sprints")
    public List<SprintTT> getAllSprints() {
        return sprintTTService.findAll();
    }

    @GetMapping(value = "/sprints/project/{pjId}")
    public List<SprintTT> getSprintsByProject(@PathVariable long pjId) {
        return sprintTTService.getSprintsByProject(pjId);
    }

    @GetMapping(value = "/sprints/project/{pjId}/kpi")
    public List<SprintTT> getKpiSprintsByProject(@PathVariable long pjId) {
        return sprintTTService.getActiveAndDoneSprintsByProject(pjId);
    }

    @GetMapping(value = "/sprints/project/{pjId}/active")
    public ResponseEntity<SprintTT> getActiveSprintForProject(@PathVariable long pjId) {
        return sprintTTService.getActiveSprintForProject(pjId)
                .map(sprint -> new ResponseEntity<>(sprint, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping(value = "/sprints/{id}/metrics")
    public ResponseEntity<SprintMetricsResult> getSprintMetrics(@PathVariable long id) {
        SprintMetricsResult result = sprintTTService.getSprintMetrics(id);
        return new ResponseEntity<>(result, HttpStatus.OK);
    }

    @GetMapping(value = "/sprints/{id}")
    public ResponseEntity<SprintTT> getSprintById(@PathVariable long id) {
        return sprintTTService.getSprintById(id)
                .map(sprint -> new ResponseEntity<>(sprint, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PostMapping(value = "/sprints")
    public ResponseEntity<SprintTT> addSprint(@RequestBody SprintTT sprint) {
        SprintTT saved = sprintTTService.addSprint(sprint);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(saved.getSprId())
                .toUri();
        return ResponseEntity.created(location)
                .header("Access-Control-Expose-Headers", "Location")
                .body(saved);
    }

    @PutMapping(value = "/sprints/{id}")
    public ResponseEntity<SprintTT> updateSprint(@RequestBody SprintTT sprint, @PathVariable long id) {
        SprintTT updated = sprintTTService.updateSprint(id, sprint);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }

    /**
     * Manual sprint termination endpoint — called when the manager presses
     * "Terminar Sprint" on the sprint page (i.e. project has autoCloseSprints=false).
     *
     * Closes the sprint and activates the closest available next sprint.
     * Returns the newly activated sprint (or 204 NO_CONTENT if none existed).
     */
    @PatchMapping(value = "/sprints/{id}/end")
    public ResponseEntity<SprintTT> endSprint(@PathVariable long id) {
        try {
            SprintTT next = sprintTTService.closeSprintAndActivateNext(id);
            if (next == null) {
                // Sprint was closed but no next sprint found — still success
                return new ResponseEntity<>(HttpStatus.NO_CONTENT);
            }
            return new ResponseEntity<>(next, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PatchMapping(value = "/sprints/{id}/close")
    public ResponseEntity<SprintTT> closeSprint(
            @PathVariable long id,
            @RequestParam(required = false) Long nextSprintId) {
        try {
            SprintTT closed = sprintTTService.closeSprint(id, nextSprintId);
            if (closed == null) return new ResponseEntity<>(HttpStatus.NOT_FOUND);
            return new ResponseEntity<>(closed, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping(value = "/sprints/{id}")
    public ResponseEntity<Boolean> deleteSprint(@PathVariable long id) {
        boolean flag = sprintTTService.deleteSprint(id);
        if (flag) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
        }
    }
}
