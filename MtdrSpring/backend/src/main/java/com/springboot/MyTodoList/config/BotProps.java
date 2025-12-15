package com.springboot.MyTodoList.config;

//import org.springframework.stereotype.Component;
import org.springframework.boot.context.properties.ConfigurationProperties;
//import org.springframework.context.annotation.PropertySource;

@ConfigurationProperties(prefix = "telegram.bot")
public class BotProps {
    private String name;
    private String token;

    public String getToken(){
		return token;
	}

    public String getName(){
		return name;
	}

    public void setToken(String tkn){
		token = tkn;
	}

    public void setName(String n){
		name = n;
	}
}