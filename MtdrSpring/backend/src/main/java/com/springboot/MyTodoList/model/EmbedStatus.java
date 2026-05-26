package com.springboot.MyTodoList.model;

public enum EmbedStatus {
    LOADING("loading"),
    LOADED("loaded");

    private final String value;

    EmbedStatus(String value) { this.value = value; }

    public String value() { return value; }
}
