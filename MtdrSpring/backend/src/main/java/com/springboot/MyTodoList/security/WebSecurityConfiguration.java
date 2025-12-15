package com.springboot.MyTodoList.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;



@Configuration
@EnableWebSecurity
public class WebSecurityConfiguration {
    
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .authorizeHttpRequests(auth -> auth
                .anyRequest().permitAll() // Permitir todo sin autenticación
            )
            .csrf(csrf -> csrf.disable()) // Desactivar CSRF si no usas formularios
            .httpBasic(httpBasic -> httpBasic.disable()) // Desactivar autenticación básica
            .formLogin(formLogin -> formLogin.disable()); // Desactivar login por formulario

        return http.build();
    }

}
