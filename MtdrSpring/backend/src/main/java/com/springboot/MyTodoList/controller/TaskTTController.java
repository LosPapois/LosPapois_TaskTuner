package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.TaskTT;
import com.springboot.MyTodoList.service.TaskTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import java.net.URI;

import java.util.List;

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
 *   DELETE /api/tasks/{id}                  — remove task, returns boolean body
 */
@RestController
@RequestMapping("/api")
public class TaskTTController {
    @Autowired
    private TaskTTService taskTTService;

    @GetMapping(value = "/tasks")
    public List<TaskTT> getAllTasks() {
        return taskTTService.findAll();
    }

    @GetMapping(value = "/projects/{pjId}/tasks")
    public List<TaskTT> getTasksByProject(@PathVariable long pjId) {
        return taskTTService.getTasksByProject(pjId);
    }

    @GetMapping(value = "/tasks/{id}")
    public ResponseEntity<TaskTT> getTaskById(@PathVariable long id) {
        return taskTTService.getTaskById(id)
                .map(task -> new ResponseEntity<>(task, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    /**
     * Creates a new task and returns HTTP 201 with a {@code Location} header
     * pointing to the newly created resource (/api/tasks/{id}).
     * The header is explicitly exposed via {@code Access-Control-Expose-Headers}
     * so the frontend can read it across origins.
     */
    @PostMapping(value = "/tasks")
    public ResponseEntity<TaskTT> addTask(@RequestBody TaskTT task) {
        TaskTT saved = taskTTService.addTask(task);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(saved.getTaskId())
                .toUri();
        return ResponseEntity.created(location)
                .header("Access-Control-Expose-Headers", "Location")
                .body(saved);
    }

    @PutMapping(value = "/tasks/{id}")
    public ResponseEntity<TaskTT> updateTask(@RequestBody TaskTT task, @PathVariable long id) {
        TaskTT updated = taskTTService.updateTask(id, task);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }

    /**
     * Deletes a task by ID.
     * Returns {@code true} with 200 OK on success, or {@code false} with
     * 404 NOT_FOUND when the task does not exist. The boolean body lets the
     * frontend distinguish a successful delete from a missing-resource delete
     * without parsing an error payload.
     */
    @DeleteMapping(value = "/tasks/{id}")
    public ResponseEntity<Boolean> deleteTask(@PathVariable("id") long id) {
        boolean flag = taskTTService.deleteTask(id);
        if (flag) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
        }
    }
}
