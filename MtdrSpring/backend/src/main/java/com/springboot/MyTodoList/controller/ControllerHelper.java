package com.springboot.MyTodoList.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.net.URI;
import java.util.Optional;
import java.util.function.Function;

/**
 * Static helpers that eliminate the repeated ResponseEntity boilerplate across controllers.
 */
public final class ControllerHelper {

    private ControllerHelper() {}

    /** 201 Created with Location header and CORS exposure. */
    public static <T> ResponseEntity<T> created(T saved, Object id) {
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(id)
                .toUri();
        return ResponseEntity.created(location)
                .header("Access-Control-Expose-Headers", "Location")
                .body(saved);
    }

    /** 200 OK if present, 404 NOT_FOUND otherwise. */
    public static <T> ResponseEntity<T> okOrNotFound(Optional<T> opt) {
        return opt.map(v -> new ResponseEntity<>(v, HttpStatus.OK))
                  .orElseGet(() -> new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }

    /** 200 OK if non-null, 404 NOT_FOUND otherwise. */
    public static <T> ResponseEntity<T> okOrNotFound(T value) {
        return value != null
                ? new ResponseEntity<>(value, HttpStatus.OK)
                : new ResponseEntity<>(HttpStatus.NOT_FOUND);
    }

    /** 200 OK on delete success, 404 NOT_FOUND when entity didn't exist. */
    public static ResponseEntity<Boolean> deleted(boolean existed) {
        return existed
                ? new ResponseEntity<>(true, HttpStatus.OK)
                : new ResponseEntity<>(false, HttpStatus.NOT_FOUND);
    }
}
