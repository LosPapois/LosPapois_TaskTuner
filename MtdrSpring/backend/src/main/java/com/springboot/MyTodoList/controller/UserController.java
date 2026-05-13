package com.springboot.MyTodoList.controller;
import com.springboot.MyTodoList.model.User;
import com.springboot.MyTodoList.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import java.net.URI;

import java.util.List;

@RestController
@RequestMapping("/api")
public class UserController {
    @Autowired
    private UserService userService;

    //@CrossOrigin
    @GetMapping(value = "/users")
    public List<User> getAllUsers(){
        return userService.findAll();
    }

    //@CrossOrigin
    @GetMapping(value = "/users/{id}")
    public ResponseEntity<User> getUserById(@PathVariable int id) {
        return userService.getUserById(id)
                .map(user -> new ResponseEntity<>(user, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    //@CrossOrigin
    @PostMapping(value = "/adduser")
    public ResponseEntity<User> addUser(@RequestBody User newUser) {
        User dbUser = userService.addUser(newUser);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(dbUser.getID())
                .toUri();
        return ResponseEntity.created(location)
                .header("Access-Control-Expose-Headers", "Location")
                .body(dbUser);
    }

    //@CrossOrigin
    @PutMapping(value = "/updateUser/{id}")
    public ResponseEntity<User> updateUser(@RequestBody User user, @PathVariable int id) {
        User dbUser = userService.updateUser(id, user);
        if (dbUser == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return new ResponseEntity<>(dbUser, HttpStatus.OK);
    }

    //@CrossOrigin
    @DeleteMapping(value = "/deleteUser/{id}")
    public ResponseEntity<Boolean> deleteUser(@PathVariable("id") int id) {
        boolean flag = userService.deleteUser(id);
        if (flag) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
        }
    }


    @GetMapping(value = "/unitTestAdd")
    public User test(){
        return userService.test();
    }


}
