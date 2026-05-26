package com.springboot.MyTodoList.model;

public enum SprintState {
    ACTIVE("active"),
    DONE("done");

    private final String value;

    SprintState(String value) { this.value = value; }

    public String value() { return value; }
}
