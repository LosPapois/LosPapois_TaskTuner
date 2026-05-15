package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.SubTaskTT;
import com.springboot.MyTodoList.service.SubTaskTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import java.net.URI;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SubTaskTTController {

    @Autowired
    private SubTaskTTService subTaskTTService;

    @GetMapping(value = "/subtasks")
    public List<SubTaskTT> getAllSubTasks() {
        return subTaskTTService.findAll();
    }

    @GetMapping(value = "/subtasks/{id}")
    public ResponseEntity<SubTaskTT> getSubTaskById(@PathVariable long id) {
        return subTaskTTService.getSubTaskById(id)
                .map(subTask -> new ResponseEntity<>(subTask, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping(value = "/tasks/{taskId}/subtasks")
    public List<SubTaskTT> getSubTasksByTask(@PathVariable long taskId) {
        return subTaskTTService.getSubTasksByTask(taskId);
    }

    @GetMapping(value = "/tasks/{taskId}/progress")
    public ResponseEntity<Map<String, Object>> getTaskProgress(@PathVariable long taskId) {
        Map<String, Object> progress = subTaskTTService.getTaskProgress(taskId);
        return new ResponseEntity<>(progress, HttpStatus.OK);
    }

    @PostMapping(value = "/subtasks")
    public ResponseEntity<SubTaskTT> addSubTask(@RequestBody SubTaskTT subTask) {
        SubTaskTT saved = subTaskTTService.addSubTask(subTask);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(saved.getSubId())
                .toUri();
        return ResponseEntity.created(location)
                .header("Access-Control-Expose-Headers", "Location")
                .body(saved);
    }

    @PostMapping(value = "/tasks/{taskId}/subtasks/quick")
    public ResponseEntity<SubTaskTT> addQuickSubTask(@PathVariable long taskId, @RequestParam String name) {
        SubTaskTT saved = subTaskTTService.addQuickSubTask(taskId, name);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(saved.getSubId())
                .toUri();
        return ResponseEntity.created(location)
                .header("Access-Control-Expose-Headers", "Location")
                .body(saved);
    }

    @PutMapping(value = "/subtasks/{id}")
    public ResponseEntity<SubTaskTT> updateSubTask(@RequestBody SubTaskTT subTask, @PathVariable long id) {
        SubTaskTT updated = subTaskTTService.updateSubTask(id, subTask);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }

    @DeleteMapping(value = "/subtasks/{id}")
    public ResponseEntity<Boolean> deleteSubTask(@PathVariable("id") long id) {
        boolean flag = subTaskTTService.deleteSubTask(id);
        if (flag) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
        }
    }
}