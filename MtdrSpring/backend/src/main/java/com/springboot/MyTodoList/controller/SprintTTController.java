package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.SprintMetricsResult;
import com.springboot.MyTodoList.model.SprintTT;
import com.springboot.MyTodoList.service.SprintTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
        try {
            return sprintTTService.getActiveSprintForProject(pjId);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping(value = "/sprints/{id}/metrics")
    public ResponseEntity<SprintMetricsResult> getSprintMetrics(@PathVariable long id) {
        try {
            SprintMetricsResult result = sprintTTService.getSprintMetrics(id);
            return new ResponseEntity<>(result, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @GetMapping(value = "/sprints/{id}")
    public ResponseEntity<SprintTT> getSprintById(@PathVariable long id) {
        try {
            return sprintTTService.getSprintById(id);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping(value = "/sprints")
    public ResponseEntity<SprintTT> addSprint(@RequestBody SprintTT sprint) {
        try {
            SprintTT saved = sprintTTService.addSprint(sprint);
            return new ResponseEntity<>(saved, HttpStatus.OK);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    @PutMapping(value = "/sprints/{id}")
    public ResponseEntity<SprintTT> updateSprint(@RequestBody SprintTT sprint, @PathVariable long id) {
        try {
            SprintTT updated = sprintTTService.updateSprint(id, sprint);
            if (updated == null) {
                return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
            }
            return new ResponseEntity<>(updated, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(null, HttpStatus.NOT_FOUND);
        }
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
        Boolean flag = false;
        try {
            flag = sprintTTService.deleteSprint(id);
            return new ResponseEntity<>(flag, HttpStatus.OK);
        } catch (Exception e) {
            return new ResponseEntity<>(flag, HttpStatus.NOT_FOUND);
        }
    }
}
