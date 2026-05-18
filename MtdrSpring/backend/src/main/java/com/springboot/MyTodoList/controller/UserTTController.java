package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.UserTT;
import com.springboot.MyTodoList.service.UserTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
public class UserTTController {

    @Autowired
    private UserTTService userTTService;

    @GetMapping("/users-tt")
    public ResponseEntity<List<UserTT>> getAllUsers() {
        return new ResponseEntity<>(userTTService.findAll(), HttpStatus.OK);
    }

    @GetMapping("/users-tt/{id}")
    public ResponseEntity<UserTT> getUserById(@PathVariable long id) {
        return ControllerHelper.okOrNotFound(userTTService.getUserById(id));
    }

    @GetMapping("/users-tt/telegram/{idTelegram}")
    public ResponseEntity<UserTT> getUserByTelegram(@PathVariable String idTelegram) {
        return ControllerHelper.okOrNotFound(userTTService.getUserByTelegram(idTelegram));
    }

    @GetMapping("/users-tt/role/{role}")
    public ResponseEntity<List<UserTT>> getUsersByRole(@PathVariable String role) {
        return new ResponseEntity<>(userTTService.getUsersByRole(role), HttpStatus.OK);
    }

    @PostMapping("/users-tt")
    public ResponseEntity<UserTT> addUser(@RequestBody UserTT user) {
        UserTT saved = userTTService.addUser(user);
        return ControllerHelper.created(saved, saved.getUserId());
    }

    @PutMapping("/users-tt/{id}")
    public ResponseEntity<UserTT> updateUser(@RequestBody UserTT user, @PathVariable long id) {
        return ControllerHelper.okOrNotFound(userTTService.updateUser(id, user));
    }

    @DeleteMapping("/users-tt/{id}")
    public ResponseEntity<Boolean> deleteUser(@PathVariable long id) {
        return ControllerHelper.deleted(userTTService.deleteUser(id));
    }
}
