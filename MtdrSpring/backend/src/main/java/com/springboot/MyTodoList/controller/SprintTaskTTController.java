package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.SprintTaskTT;
import com.springboot.MyTodoList.service.SprintTaskTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class SprintTaskTTController {

    @Autowired
    private SprintTaskTTService sprintTaskTTService;

    @GetMapping("/sprint-tasks")
    public List<SprintTaskTT> getAllSprintTasks() {
        return sprintTaskTTService.findAll();
    }

    @GetMapping("/sprint-tasks/sprint/{sprId}")
    public List<SprintTaskTT> getTasksInSprint(@PathVariable long sprId) {
        return sprintTaskTTService.getTasksInSprint(sprId);
    }

    @GetMapping("/sprint-tasks/task/{taskId}")
    public List<SprintTaskTT> getSprintsForTask(@PathVariable long taskId) {
        return sprintTaskTTService.getSprintsForTask(taskId);
    }

    @GetMapping("/sprint-tasks/sprint/{sprId}/state/{stateTask}")
    public List<SprintTaskTT> getTasksByState(@PathVariable long sprId, @PathVariable String stateTask) {
        return sprintTaskTTService.getTasksByState(sprId, stateTask);
    }

    @GetMapping("/sprint-tasks/sprint/{sprId}/count")
    public ResponseEntity<Long> countTasksInSprint(@PathVariable long sprId) {
        return new ResponseEntity<>(sprintTaskTTService.countTasksInSprint(sprId), HttpStatus.OK);
    }

    @GetMapping("/sprint-tasks/sprint/{sprId}/count/{stateTask}")
    public ResponseEntity<Long> countByState(@PathVariable long sprId, @PathVariable String stateTask) {
        return new ResponseEntity<>(sprintTaskTTService.countByState(sprId, stateTask), HttpStatus.OK);
    }

    @GetMapping("/sprint-tasks/{sprId}/{taskId}")
    public ResponseEntity<SprintTaskTT> getEntry(@PathVariable long sprId, @PathVariable long taskId) {
        return ControllerHelper.okOrNotFound(sprintTaskTTService.getEntry(sprId, taskId));
    }

    @PostMapping("/sprint-tasks")
    public ResponseEntity<SprintTaskTT> addTaskToSprint(@RequestParam long sprId, @RequestParam long taskId) {
        return new ResponseEntity<>(sprintTaskTTService.addTaskToSprint(sprId, taskId), HttpStatus.OK);
    }

    @PatchMapping("/sprint-tasks/{sprId}/{taskId}/state/{newState}")
    public ResponseEntity<SprintTaskTT> updateTaskState(
            @PathVariable long sprId,
            @PathVariable long taskId,
            @PathVariable String newState) {
        return ControllerHelper.okOrNotFound(sprintTaskTTService.updateTaskState(sprId, taskId, newState));
    }

    @DeleteMapping("/sprint-tasks/{sprId}/{taskId}")
    public ResponseEntity<Boolean> removeTaskFromSprint(@PathVariable long sprId, @PathVariable long taskId) {
        return ControllerHelper.deleted(sprintTaskTTService.removeTaskFromSprint(sprId, taskId));
    }
}
