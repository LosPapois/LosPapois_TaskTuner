package com.springboot.MyTodoList.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Forwards known SPA routes to index.html so React Router can take over
 * on page refresh.
 *
 * Without this, refreshing the page at routes like /home, /profile, or
 * /projects/123/board makes Spring look for a static file with that name,
 * fail with NoResourceFoundException, and the GlobalExceptionHandler
 * silently converts it to a 500 "An internal server error occurred."
 *
 * The explicit list mirrors the routes declared in App.tsx so we never
 * accidentally intercept an /api/* request (those go to their controllers).
 * The "/projects/**" pattern covers nested routes like:
 *   /projects/{id}/team
 *   /projects/{id}/statistics
 *   /projects/{id}/board
 *   /projects/{id}/sprints/{sid}
 */
@Controller
public class SpaController {

    @GetMapping(value = {
        "/login",
        "/signup",
        "/home",
        "/profile",
        "/tasks",
        "/archive",
        "/projects",
        "/projects/**"
    })
    public String forwardToSpa() {
        // 'forward:' keeps the URL in the browser as-is while delegating
        // the response body to index.html — exactly the SPA refresh UX we want.
        return "forward:/index.html";
    }
}
