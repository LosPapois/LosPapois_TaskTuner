package com.springboot.MyTodoList.service;

import java.util.List;
import java.util.Optional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.springboot.MyTodoList.model.ToDoItem;
import com.springboot.MyTodoList.repository.ToDoItemRepository;

@Service
public class ToDoItemService {

    @Autowired
    private ToDoItemRepository toDoItemRepository;

    public List<ToDoItem> findAll() {
        List<ToDoItem> todoItems = toDoItemRepository.findAll();
        return todoItems;
    }

    public Optional<ToDoItem> getItemById(int id) {
        return toDoItemRepository.findById(id);
    }

    public ToDoItem getToDoItemById(int id) {
        Optional<ToDoItem> todoData = toDoItemRepository.findById(id);
        if (todoData.isPresent()) {
            return todoData.get();
        } else {
            return null;
        }
    }

    public ToDoItem addToDoItem(ToDoItem toDoItem) {
        return toDoItemRepository.save(toDoItem);
    }

    public boolean deleteToDoItem(int id) {
        try {
            toDoItemRepository.deleteById(id);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public ToDoItem updateToDoItem(int id, ToDoItem td) {
        Optional<ToDoItem> toDoItemData = toDoItemRepository.findById(id);
        if (toDoItemData.isPresent()) {
            ToDoItem toDoItem = toDoItemData.get();
            toDoItem.setID(id);
            toDoItem.setCreation_ts(td.getCreation_ts());
            toDoItem.setDescription(td.getDescription());
            toDoItem.setDone(td.isDone());
            return toDoItemRepository.save(toDoItem);
        } else {
            return null;
        }
    }

}
