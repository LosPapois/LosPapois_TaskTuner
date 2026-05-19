package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.TaskTT;
import com.springboot.MyTodoList.service.TaskTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST controller for TaskTT (project tasks) CRUD operations.
 *
 * Base path: /api
 *
 * Endpoints:
 *   GET    /api/tasks                       — all tasks (admin/debug use)
 *   GET    /api/projects/{pjId}/tasks       — tasks scoped to a project
 *   GET    /api/tasks/{id}                  — single task by PK
 *   POST   /api/tasks                       — create task, returns 201 + Location
 *   PUT    /api/tasks/{id}                  — full replacement update
 *   DELETE /api/tasks/{id}                  — remove task
 */
@RestController
@RequestMapping("/api")
public class TaskTTController {

    @Autowired
    private TaskTTService taskTTService;

    @GetMapping("/tasks")
    public List<TaskTT> getAllTasks() {
        return taskTTService.findAll();
    }

    @GetMapping("/projects/{pjId}/tasks")
    public List<TaskTT> getTasksByProject(@PathVariable long pjId) {
        return taskTTService.getTasksByProject(pjId);
    }

    @GetMapping("/projects/{pjId}/board")
    public ResponseEntity<Map<String, List<TaskTT>>> getProjectBoard(@PathVariable long pjId) {
        return new ResponseEntity<>(taskTTService.getProjectBoard(pjId), HttpStatus.OK);
    }

    @GetMapping("/tasks/{id}")
    public ResponseEntity<TaskTT> getTaskById(@PathVariable long id) {
        return ControllerHelper.okOrNotFound(taskTTService.getTaskById(id));
    }

    @PostMapping("/tasks")
    public ResponseEntity<TaskTT> addTask(@RequestBody TaskTT task) {
        TaskTT saved = taskTTService.addTask(task);
        return ControllerHelper.created(saved, saved.getTaskId());
    }

    @PutMapping("/tasks/{id}")
    public ResponseEntity<TaskTT> updateTask(@RequestBody TaskTT task, @PathVariable long id) {
        return ControllerHelper.okOrNotFound(taskTTService.updateTask(id, task));
    }

    @DeleteMapping("/tasks/{id}")
    public ResponseEntity<Boolean> deleteTask(@PathVariable long id) {
        return ControllerHelper.deleted(taskTTService.deleteTask(id));
    }
}
