package com.springboot.MyTodoList.controller;
import com.springboot.MyTodoList.model.ToDoItem;
import com.springboot.MyTodoList.service.ToDoItemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import java.net.URI;

import java.util.List;

@RestController
@RequestMapping("/api")
public class ToDoItemController {
    @Autowired
    private ToDoItemService toDoItemService;
    //@CrossOrigin
    @GetMapping(value = "/todolist")
    public List<ToDoItem> getAllToDoItems(){
        return toDoItemService.findAll();
    }
    //@CrossOrigin
    @GetMapping(value = "/todolist/{id}")
    public ResponseEntity<ToDoItem> getToDoItemById(@PathVariable int id) {
        return toDoItemService.getItemById(id)
                .map(item -> new ResponseEntity<>(item, HttpStatus.OK))
                .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    //@CrossOrigin
    @PostMapping(value = "/todolist")
    public ResponseEntity<ToDoItem> addToDoItem(@RequestBody ToDoItem todoItem) {
        ToDoItem td = toDoItemService.addToDoItem(todoItem);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(td.getID())
                .toUri();
        return ResponseEntity.created(location)
                .header("Access-Control-Expose-Headers", "Location")
                .body(td);
    }

    //@CrossOrigin
    @PutMapping(value = "todolist/{id}")
    public ResponseEntity<ToDoItem> updateToDoItem(@RequestBody ToDoItem toDoItem, @PathVariable int id) {
        ToDoItem updated = toDoItemService.updateToDoItem(id, toDoItem);
        if (updated == null) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
        }
        return new ResponseEntity<>(updated, HttpStatus.OK);
    }

    //@CrossOrigin
    @DeleteMapping(value = "todolist/{id}")
    public ResponseEntity<Boolean> deleteToDoItem(@PathVariable("id") int id) {
        boolean flag = toDoItemService.deleteToDoItem(id);
        if (flag) {
            return new ResponseEntity<>(true, HttpStatus.OK);
        } else {
            return new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
        }
    }



}
