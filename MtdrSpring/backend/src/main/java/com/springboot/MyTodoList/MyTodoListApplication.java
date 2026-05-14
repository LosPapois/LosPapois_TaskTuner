package com.springboot.MyTodoList;

import com.springboot.MyTodoList.config.BotProps;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(BotProps.class)
public class MyTodoListApplication {

	public static void main(String[] args) {
		SpringApplication.run(MyTodoListApplication.class, args);
	}

}
