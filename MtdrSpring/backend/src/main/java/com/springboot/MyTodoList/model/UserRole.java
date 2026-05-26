package com.springboot.MyTodoList.model;

public enum UserRole {
    DEVELOPER("developer"),
    MANAGER("manager");

    private final String value;

    UserRole(String value) { this.value = value; }

    public String value() { return value; }
}
