package com.springboot.MyTodoList;

import com.springboot.MyTodoList.config.BotProps;
import com.springboot.MyTodoList.config.DeepSeekConfig;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Import;

@SpringBootApplication
@EnableConfigurationProperties(BotProps.class)
@Import(DeepSeekConfig.class)
public class MyTodoListApplication {

	public static void main(String[] args) {
		SpringApplication.run(MyTodoListApplication.class, args);
	}

}
