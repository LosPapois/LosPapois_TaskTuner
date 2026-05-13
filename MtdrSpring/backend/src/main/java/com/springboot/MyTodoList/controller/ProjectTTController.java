package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.ProjectTT;
import com.springboot.MyTodoList.service.ProjectTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import java.net.URI;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ProjectTTController {

    @Autowired
    private ProjectTTService projectTTService;

    @GetMapping(value = "/projects")
    public List<ProjectTT> getAllProjects() {
        return projectTTService.findAll();
    }

    @GetMapping(value = "/projects/open")
    public List<ProjectTT> getOpenProjects() {
        return projectTTService.getOpenProjects();
    }

    @GetMapping(value = "/projects/search")
    public List<ProjectTT> searchProjects(@RequestParam String keyword) {
        return projectTTService.searchByName(keyword);
    }

    @GetMapping(value = "/projects/{id}")
    public ResponseEntity<ProjectTT> getProjectById(@PathVariable long id) {
        return projectTTService.getProjectById(id)
                .map(project -> new ResponseEntity<>(project, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @PostMapping(value = "/projects")
    public ResponseEntity<ProjectTT> addProject(@RequestBody ProjectTT project) {
        ProjectTT saved = projectTTService.addProject(project);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(saved.getPjId())
                .toUri();
        return ResponseEntity.created(location)
                .header("Access-Control-Expose-Headers", "Location")
                .body(saved);
    }

    @PutMapping(value = "/projects/{id}")
    public ResponseEntity<ProjectTT> updateProject(@RequestBody ProjectTT project, @PathVariable long id) {
        ProjectTT updated = projectTTService.updateProject(id, project);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }

    @PatchMapping(value = "/projects/{id}/close")
    public ResponseEntity<ProjectTT> closeProject(@PathVariable long id) {
        ProjectTT updated = projectTTService.closeProject(id);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }

    @DeleteMapping(value = "/projects/{id}")
    public ResponseEntity<Boolean> deleteProject(@PathVariable long id) {
        boolean flag = projectTTService.deleteProject(id);
        if (flag) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
        }
    }
}
