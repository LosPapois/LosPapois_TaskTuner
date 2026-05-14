package com.springboot.MyTodoList.controller;

import com.springboot.MyTodoList.model.UserTT;
import com.springboot.MyTodoList.service.UserTTService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import java.net.URI;

import java.util.List;

@RestController
@RequestMapping("/api")
public class UserTTController {

    @Autowired
    private UserTTService userTTService;

    @GetMapping(value = "/users-tt/{id}")
    public ResponseEntity<UserTT> getUserById(@PathVariable long id) {
        return userTTService.getUserById(id)
                .map(user -> new ResponseEntity<>(user, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping(value = "/users-tt")
    public ResponseEntity<List<UserTT>> getAllUsers() {
        List<UserTT> users = userTTService.findAll();
        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    @GetMapping(value = "/users-tt/telegram/{idTelegram}")
    public ResponseEntity<UserTT> getUserByTelegram(@PathVariable String idTelegram) {
        return userTTService.getUserByTelegram(idTelegram)
                .map(value -> new ResponseEntity<>(value, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    @GetMapping(value = "/users-tt/role/{role}")
    public ResponseEntity<List<UserTT>> getUsersByRole(@PathVariable String role) {
        List<UserTT> users = userTTService.getUsersByRole(role);
        return new ResponseEntity<>(users, HttpStatus.OK);
    }

    @PutMapping(value = "/users-tt/{id}")
    public ResponseEntity<UserTT> updateUser(@RequestBody UserTT user, @PathVariable long id) {
        UserTT updated = userTTService.updateUser(id, user);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }

    @DeleteMapping(value = "/users-tt/{id}")
    public ResponseEntity<Boolean> deleteUser(@PathVariable long id) {
        boolean flag = userTTService.deleteUser(id);
        if (flag) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
        }
    }

    @PostMapping(value = "/users-tt")
    public ResponseEntity<UserTT> addUser(@RequestBody UserTT user) {
        UserTT saved = userTTService.addUser(user);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(saved.getUserId())
                .toUri();
        return ResponseEntity.created(location)
                .header("Access-Control-Expose-Headers", "Location")
                .body(saved);
    }
}
