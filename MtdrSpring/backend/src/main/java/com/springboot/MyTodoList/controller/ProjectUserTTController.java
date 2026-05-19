package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.ProjectUserTT;
import com.springboot.MyTodoList.service.ProjectUserTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ProjectUserTTController {

    @Autowired
    private ProjectUserTTService projectUserTTService;

    @GetMapping("/project-memberships")
    public List<ProjectUserTT> getAllMemberships() {
        return projectUserTTService.findAll();
    }

    @GetMapping("/project-memberships/project/{pjId}")
    public List<ProjectUserTT> getMembersOfProject(@PathVariable long pjId) {
        return projectUserTTService.getMembersOfProject(pjId);
    }

    @GetMapping("/project-memberships/user/{userId}")
    public List<ProjectUserTT> getProjectsForUser(@PathVariable long userId) {
        return projectUserTTService.getProjectsForUser(userId);
    }

    @GetMapping("/project-memberships/project/{pjId}/user/{userId}")
    public ResponseEntity<Boolean> isMember(@PathVariable long pjId, @PathVariable long userId) {
        return new ResponseEntity<>(projectUserTTService.isMember(pjId, userId), HttpStatus.OK);
    }

    @PostMapping("/project-memberships")
    public ResponseEntity<ProjectUserTT> addMember(@RequestParam long pjId, @RequestParam long userId) {
        return new ResponseEntity<>(projectUserTTService.addMember(pjId, userId), HttpStatus.OK);
    }

    @DeleteMapping("/project-memberships/project/{pjId}/user/{userId}")
    public ResponseEntity<Boolean> removeMember(@PathVariable long pjId, @PathVariable long userId) {
        return ControllerHelper.deleted(projectUserTTService.removeMember(pjId, userId));
    }

    @DeleteMapping("/project-memberships/project/{pjId}/user/{userId}/with-tasks")
    public ResponseEntity<Boolean> removeMemberAndTasks(@PathVariable long pjId, @PathVariable long userId) {
        return ControllerHelper.deleted(projectUserTTService.removeMemberAndAssignedTasks(pjId, userId));
    }
}
