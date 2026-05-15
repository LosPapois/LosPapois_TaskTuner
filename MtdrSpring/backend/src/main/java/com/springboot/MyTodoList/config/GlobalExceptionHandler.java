package com.springboot.MyTodoList.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

import java.util.HashMap;
import java.util.Map;

/**
 * Global exception handler to map standard exceptions to proper HTTP responses.
 * This prevents controllers from needing repetitive try/catch blocks for every method.
 */
@ControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Handles cases where an expected element is not found.
     * Useful for throwing custom exceptions from Services without cluttering Controllers.
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleIllegalArgumentException(IllegalArgumentException ex) {
        Map<String, String> response = new HashMap<>();
        response.put("error", ex.getMessage());
        return new ResponseEntity<>(response, HttpStatus.BAD_REQUEST);
    }

    /**
     * Fallback for any other unhandled exceptions.
     * Prevents stack traces from leaking and normalizes the error structure.
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, String>> handleGeneralException(Exception ex) {
        Map<String, String> response = new HashMap<>();
        response.put("error", "An internal server error occurred.");
        // Log the exception securely here in a real production environment
        // e.g., logger.error("Unhandled exception: ", ex);
        return new ResponseEntity<>(response, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
