package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.ProjectTT;
import com.springboot.MyTodoList.service.ProjectTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ProjectTTController {

    @Autowired
    private ProjectTTService projectTTService;

    @GetMapping("/projects")
    public List<ProjectTT> getAllProjects() {
        return projectTTService.findAll();
    }

    @GetMapping("/projects/open")
    public List<ProjectTT> getOpenProjects() {
        return projectTTService.getOpenProjects();
    }

    @GetMapping("/projects/search")
    public List<ProjectTT> searchProjects(@RequestParam String keyword) {
        return projectTTService.searchByName(keyword);
    }

    @GetMapping("/projects/{id}")
    public ResponseEntity<ProjectTT> getProjectById(@PathVariable long id) {
        return ControllerHelper.okOrNotFound(projectTTService.getProjectById(id));
    }

    @PostMapping("/projects")
    public ResponseEntity<ProjectTT> addProject(@RequestBody ProjectTT project) {
        ProjectTT saved = projectTTService.addProject(project);
        return ControllerHelper.created(saved, saved.getPjId());
    }

    @PutMapping("/projects/{id}")
    public ResponseEntity<ProjectTT> updateProject(@RequestBody ProjectTT project, @PathVariable long id) {
        return ControllerHelper.okOrNotFound(projectTTService.updateProject(id, project));
    }

    @PatchMapping("/projects/{id}/settings")
    public ResponseEntity<ProjectTT> updateProjectSettings(
            @PathVariable long id,
            @RequestBody Map<String, Object> body) {
        try {
            String namePj = (String) body.getOrDefault("namePj", null);
            boolean autoRollover    = Boolean.TRUE.equals(body.get("autoRollover"));
            boolean autoCloseSprints = Boolean.TRUE.equals(body.get("autoCloseSprints"));
            ProjectTT updated = projectTTService.updateProjectSettings(id, namePj, autoRollover, autoCloseSprints);
            return ControllerHelper.okOrNotFound(updated);
        } catch (Exception e) {
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PatchMapping("/projects/{id}/close")
    public ResponseEntity<ProjectTT> closeProject(@PathVariable long id) {
        return ControllerHelper.okOrNotFound(projectTTService.closeProject(id));
    }

    @DeleteMapping("/projects/{id}")
    public ResponseEntity<Boolean> deleteProject(@PathVariable long id) {
        return ControllerHelper.deleted(projectTTService.deleteProject(id));
    }
}
