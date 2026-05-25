package com.springboot.MyTodoList.controller;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.util.HashMap;
import java.util.List;
import java.util.Objects;
import java.util.Map;
import java.util.stream.Stream;

import com.springboot.MyTodoList.dto.LoginRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assumptions.assumeTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
@DisplayName("API GET integration tests")
class ApiGetSmokeTest {

    private static final String TEST_PASSWORD = "12345678";

    @Autowired
    private TestRestTemplate restTemplate;

    @LocalServerPort
    private int port;

    private String bearerToken;
    private final Map<String, String> discoveredIds = new HashMap<>();

    private String baseUrl() {
        return "http://localhost:" + port;
    }

    @BeforeAll
    void createAuthenticatedTestUser() {
        // Use supplied credentials instead of creating a new user
        String existingMail = "a01571538@tec.mx";

        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setMail(existingMail);
        loginRequest.setPassword(TEST_PASSWORD);

        var loginResponse = restTemplate.postForEntity(baseUrl() + "/api/auth/login", loginRequest, Map.class);
        assertEquals(HttpStatus.OK, loginResponse.getStatusCode(),
                () -> "Expected login to succeed, but got " + loginResponse.getStatusCode());

        Object tokenValue = loginResponse.getBody() != null ? loginResponse.getBody().get("token") : null;
        assertNotNull(tokenValue, "Expected login response to include a token");
        bearerToken = tokenValue.toString();

        HttpHeaders headers = authHeaders();
        populateFirstId(headers, "/api/projects", "projectId");
        populateFirstId(headers, "/api/features", "featureId");
        populateFirstId(headers, "/api/sprints", "sprintId");
        populateFirstId(headers, "/api/tasks", "taskId");
        populateFirstId(headers, "/api/documents", "documentId");
        populateFirstId(headers, "/api/users", "userId");
        populateFirstId(headers, "/api/users-tt", "userTtId");
        populateFirstId(headers, "/api/subtasks", "subtaskId");
        populateFirstId(headers, "/api/todolist", "todoId");
    }

    private HttpHeaders authHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(bearerToken);
        headers.set("Accept", "application/json");
        return headers;
    }

    private void populateFirstId(HttpHeaders headers, String listPath, String idKey) {
        try {
            var response = restTemplate.exchange(
                    baseUrl() + listPath,
                    HttpMethod.GET,
                    new HttpEntity<>(headers),
                    List.class);
            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null || response.getBody().isEmpty()) {
                return;
            }

            Object first = response.getBody().get(0);
            if (!(first instanceof Map<?, ?> firstMap)) {
                return;
            }

            Object idValue = firstMap.get("id");
            if (idValue == null) {
                idValue = firstMap.get("projectId");
            }
            if (idValue == null) {
                idValue = firstMap.get("userId");
            }
            if (idValue == null) {
                idValue = firstMap.get("taskId");
            }
            if (idValue == null) {
                idValue = firstMap.get("sprintId");
            }
            if (idValue == null) {
                idValue = firstMap.get("featureId");
            }
            if (idValue == null) {
                idValue = firstMap.get("documentId");
            }
            if (idValue == null) {
                idValue = firstMap.get("subtaskId");
            }
            if (idValue != null) {
                discoveredIds.put(idKey, Objects.toString(idValue));
            }
        } catch (Exception ignored) {
            // If a list endpoint cannot be queried, the corresponding id-based paths will be skipped.
        }
    }

    private String resolvePathOrSkip(String path) {
        String resolved = path;

        if (resolved.contains("/project-memberships/project/1/user/1")) {
            String projectId = requireDiscoveredId("projectId", path);
            String userId = requireDiscoveredId("userId", path);
            resolved = resolved.replace("/project-memberships/project/1/user/1", "/project-memberships/project/" + projectId + "/user/" + userId);
        }

        if (resolved.contains("/projects/1/sprints/1")) {
            String projectId = requireDiscoveredId("projectId", path);
            String sprintId = requireDiscoveredId("sprintId", path);
            resolved = resolved.replace("/projects/1/sprints/1", "/projects/" + projectId + "/sprints/" + sprintId);
        }

        resolved = replaceIfPresent(resolved, "/projects/1", "projectId", path);
        resolved = replaceIfPresent(resolved, "/documents/project/1", "projectId", path);
        resolved = replaceIfPresent(resolved, "/documents/1", "documentId", path);
        resolved = replaceIfPresent(resolved, "/tasks/1/subtasks", "taskId", path);
        resolved = replaceIfPresent(resolved, "/tasks/1/progress", "taskId", path);
        resolved = replaceIfPresent(resolved, "/tasks/1", "taskId", path);
        resolved = replaceIfPresent(resolved, "/sprints/project/1", "projectId", path);
        resolved = replaceIfPresent(resolved, "/sprints/1/metrics", "sprintId", path);
        resolved = replaceIfPresent(resolved, "/sprints/1", "sprintId", path);
        resolved = replaceIfPresent(resolved, "/features/sprint/1", "sprintId", path);
        resolved = replaceIfPresent(resolved, "/features/1/story-points", "featureId", path);
        resolved = replaceIfPresent(resolved, "/features/1/kpis/completitud", "featureId", path);
        resolved = replaceIfPresent(resolved, "/features/1/kpis/velocity", "featureId", path);
        resolved = replaceIfPresent(resolved, "/features/1/kpis/carga-equipo", "featureId", path);
        resolved = replaceIfPresent(resolved, "/features/1", "featureId", path);
        resolved = replaceIfPresent(resolved, "/users/1", "userId", path);
        resolved = replaceIfPresent(resolved, "/users-tt/1", "userTtId", path);
        resolved = replaceIfPresent(resolved, "/project-memberships/project/1", "projectId", path);
        resolved = replaceIfPresent(resolved, "/project-memberships/user/1", "userId", path);
        resolved = replaceIfPresent(resolved, "/subtasks/1", "subtaskId", path);
        resolved = replaceIfPresent(resolved, "/todolist/1", "todoId", path);
        resolved = replaceIfPresent(resolved, "/projects/user/1", "userId", path);
        resolved = replaceIfPresent(resolved, "/projects/1/tasks", "projectId", path);
        resolved = replaceIfPresent(resolved, "/projects/1/board", "projectId", path);
        resolved = replaceIfPresent(resolved, "/projects/1/kpis/project-velocity", "projectId", path);
        resolved = replaceIfPresent(resolved, "/projects/1/kpis/velocity", "projectId", path);
        resolved = replaceIfPresent(resolved, "/projects/1/kpis/retrabajo", "projectId", path);
        resolved = replaceIfPresent(resolved, "/projects/1/kpis/carga-equipo", "projectId", path);
        resolved = replaceIfPresent(resolved, "/projects/1/kpis/completitud", "projectId", path);
        resolved = replaceIfPresent(resolved, "/projects/1/sprints/1/kpis/velocity", "projectId", path);
        resolved = replaceIfPresent(resolved, "/projects/1/sprints/1/kpis/retrabajo", "projectId", path);
        resolved = replaceIfPresent(resolved, "/projects/1/sprints/1/kpis/carga-equipo", "projectId", path);
        resolved = replaceIfPresent(resolved, "/projects/1/sprints/1/kpis/completitud", "projectId", path);

        return resolved;
    }

    private String replaceIfPresent(String path, String token, String idKey, String originalPath) {
        if (!path.contains(token)) {
            return path;
        }
        String id = requireDiscoveredId(idKey, originalPath);
        return path.replace(token, token.replace("1", id));
    }

    private String requireDiscoveredId(String idKey, String originalPath) {
        String id = discoveredIds.get(idKey);
        assumeTrue(id != null, () -> "No " + idKey + " available to test " + originalPath);
        return id;
    }

    static Stream<Arguments> getEndpoints() {
        return Stream.of(
                Arguments.of("/api/projects"),
                Arguments.of("/api/projects/open"),
                Arguments.of("/api/projects/user/1"),
                Arguments.of("/api/projects/search?keyword=test"),
                Arguments.of("/api/projects/1"),
                Arguments.of("/api/documents"),
                Arguments.of("/api/documents/pending-embedding"),
                Arguments.of("/api/documents/project/1"),
                Arguments.of("/api/documents/project/1/loaded"),
                Arguments.of("/api/documents/1"),
                Arguments.of("/api/tasks"),
                Arguments.of("/api/projects/1/tasks"),
                Arguments.of("/api/projects/1/board"),
                Arguments.of("/api/tasks/1"),
                Arguments.of("/api/sprints"),
                Arguments.of("/api/sprints/project/1"),
                Arguments.of("/api/sprints/project/1/kpi"),
                Arguments.of("/api/sprints/project/1/active"),
                Arguments.of("/api/sprints/1/metrics"),
                Arguments.of("/api/sprints/1"),
                Arguments.of("/api/features"),
                Arguments.of("/api/features/1"),
                Arguments.of("/api/features/sprint/1"),
                Arguments.of("/api/features/1/story-points"),
                Arguments.of("/api/users"),
                Arguments.of("/api/users/1"),
                Arguments.of("/api/users-tt"),
                Arguments.of("/api/users-tt/1"),
                Arguments.of("/api/users-tt/role/developer"),
                Arguments.of("/api/project-memberships"),
                Arguments.of("/api/project-memberships/project/1"),
                Arguments.of("/api/project-memberships/user/1"),
                Arguments.of("/api/project-memberships/project/1/user/1"),
                Arguments.of("/api/subtasks"),
                Arguments.of("/api/subtasks/1"),
                Arguments.of("/api/tasks/1/subtasks"),
                Arguments.of("/api/tasks/1/progress"),
                Arguments.of("/api/todolist"),
                Arguments.of("/api/todolist/1"),
                Arguments.of("/api/projects/1/kpis/project-velocity"),
                Arguments.of("/api/projects/1/kpis/velocity"),
                Arguments.of("/api/projects/1/kpis/retrabajo"),
                Arguments.of("/api/projects/1/kpis/carga-equipo"),
                Arguments.of("/api/projects/1/kpis/completitud"),
                Arguments.of("/api/projects/1/sprints/1/kpis/velocity"),
                Arguments.of("/api/projects/1/sprints/1/kpis/retrabajo"),
                Arguments.of("/api/projects/1/sprints/1/kpis/carga-equipo"),
                Arguments.of("/api/projects/1/sprints/1/kpis/completitud"),
                Arguments.of("/api/features/1/kpis/completitud"),
                Arguments.of("/api/features/1/kpis/velocity"),
                Arguments.of("/api/features/1/kpis/carga-equipo")
        );
    }

    @ParameterizedTest(name = "GET {0} responds")
    @MethodSource("getEndpoints")
    void get_endpoints_return_real_server_response(String path) {
        HttpHeaders headers = authHeaders();
        String resolvedPath = resolvePathOrSkip(path);

        var response = restTemplate.exchange(
            baseUrl() + resolvedPath,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class);
        HttpStatusCode statusCode = response.getStatusCode();
        assertEquals(true, statusCode.is2xxSuccessful(),
            () -> "Expected 2xx for GET " + resolvedPath + ", but got " + statusCode);
    }
}