package com.springboot.MyTodoList.model;

public enum TaskState {
    ACTIVE("active"),
    DONE("done"),
    DELAYED("delayed");

    private final String value;

    TaskState(String value) { this.value = value; }

    public String value() { return value; }
}
