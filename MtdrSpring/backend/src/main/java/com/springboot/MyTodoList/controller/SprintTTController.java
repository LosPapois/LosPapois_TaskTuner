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

    @GetMapping("/sprints")
    public List<SprintTT> getAllSprints() {
        return sprintTTService.findAll();
    }

    @GetMapping("/sprints/project/{pjId}")
    public List<SprintTT> getSprintsByProject(@PathVariable long pjId) {
        return sprintTTService.getSprintsByProject(pjId);
    }

    @GetMapping("/sprints/project/{pjId}/kpi")
    public List<SprintTT> getKpiSprintsByProject(@PathVariable long pjId) {
        return sprintTTService.getActiveAndDoneSprintsByProject(pjId);
    }

    @GetMapping("/sprints/project/{pjId}/active")
    public ResponseEntity<SprintTT> getActiveSprintForProject(@PathVariable long pjId) {
        return ControllerHelper.okOrNotFound(sprintTTService.getActiveSprintForProject(pjId));
    }

    @GetMapping("/sprints/{id}/metrics")
    public ResponseEntity<SprintMetricsResult> getSprintMetrics(@PathVariable long id) {
        return new ResponseEntity<>(sprintTTService.getSprintMetrics(id), HttpStatus.OK);
    }

    @GetMapping("/sprints/{id}")
    public ResponseEntity<SprintTT> getSprintById(@PathVariable long id) {
        return ControllerHelper.okOrNotFound(sprintTTService.getSprintById(id));
    }

    @PostMapping("/sprints")
    public ResponseEntity<SprintTT> addSprint(@RequestBody SprintTT sprint) {
        SprintTT saved = sprintTTService.addSprint(sprint);
        return ControllerHelper.created(saved, saved.getSprId());
    }

    @PutMapping("/sprints/{id}")
    public ResponseEntity<SprintTT> updateSprint(@RequestBody SprintTT sprint, @PathVariable long id) {
        return ControllerHelper.okOrNotFound(sprintTTService.updateSprint(id, sprint));
    }

    /**
     * Manual sprint termination — called when manager presses "Finalize Sprint"
     * (project has autoCloseSprints=false). Closes the sprint and activates the
     * closest available next sprint. Returns the newly activated sprint, or 204
     * NO_CONTENT if none existed.
     */
    @PatchMapping("/sprints/{id}/end")
    public ResponseEntity<SprintTT> endSprint(@PathVariable long id) {
        try {
            SprintTT next = sprintTTService.closeSprintAndActivateNext(id);
            return next != null
                    ? new ResponseEntity<>(next, HttpStatus.OK)
                    : new ResponseEntity<>(HttpStatus.NO_CONTENT);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PatchMapping("/sprints/{id}/close")
    public ResponseEntity<SprintTT> closeSprint(
            @PathVariable long id,
            @RequestParam(required = false) Long nextSprintId) {
        try {
            SprintTT closed = sprintTTService.closeSprint(id, nextSprintId);
            return ControllerHelper.okOrNotFound(closed);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping("/sprints/{id}")
    public ResponseEntity<Boolean> deleteSprint(@PathVariable long id) {
        return ControllerHelper.deleted(sprintTTService.deleteSprint(id));
    }
}
