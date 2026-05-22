package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.SubTaskTT;
import com.springboot.MyTodoList.service.SubTaskTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class SubTaskTTController {

    @Autowired
    private SubTaskTTService subTaskTTService;

    @GetMapping("/subtasks")
    public List<SubTaskTT> getAllSubTasks() {
        return subTaskTTService.findAll();
    }

    @GetMapping("/subtasks/{id}")
    public ResponseEntity<SubTaskTT> getSubTaskById(@PathVariable long id) {
        return ControllerHelper.okOrNotFound(subTaskTTService.getSubTaskById(id));
    }

    @GetMapping("/tasks/{taskId}/subtasks")
    public List<SubTaskTT> getSubTasksByTask(@PathVariable long taskId) {
        return subTaskTTService.getSubTasksByTask(taskId);
    }

    @GetMapping("/tasks/{taskId}/progress")
    public ResponseEntity<Map<String, Object>> getTaskProgress(@PathVariable long taskId) {
        return new ResponseEntity<>(subTaskTTService.getTaskProgress(taskId), HttpStatus.OK);
    }

    @PostMapping("/subtasks")
    public ResponseEntity<SubTaskTT> addSubTask(@RequestBody SubTaskTT subTask) {
        SubTaskTT saved = subTaskTTService.addSubTask(subTask);
        return ControllerHelper.created(saved, saved.getSubId());
    }

    @PostMapping("/tasks/{taskId}/subtasks/quick")
    public ResponseEntity<SubTaskTT> addQuickSubTask(@PathVariable long taskId, @RequestParam String name) {
        SubTaskTT saved = subTaskTTService.addQuickSubTask(taskId, name);
        return ControllerHelper.created(saved, saved.getSubId());
    }

    @PutMapping("/subtasks/{id}")
    public ResponseEntity<SubTaskTT> updateSubTask(@RequestBody SubTaskTT subTask, @PathVariable long id) {
        return ControllerHelper.okOrNotFound(subTaskTTService.updateSubTask(id, subTask));
    }

    @DeleteMapping("/subtasks/{id}")
    public ResponseEntity<Boolean> deleteSubTask(@PathVariable long id) {
        return ControllerHelper.deleted(subTaskTTService.deleteSubTask(id));
    }
}
