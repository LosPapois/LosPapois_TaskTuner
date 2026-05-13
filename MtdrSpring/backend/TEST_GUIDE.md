# Test guide — updated to reflect current test schema

This file documents the current JUnit test layout, what each test file covers, and quick commands to run tests locally.

Top-level guidance
- Unit tests target service business logic (Mockito + JUnit 5).
- Controller tests use Spring's WebMvc test slice with mocked service beans.
- KPI tests validate mapping logic (repository rows → service DTOs) using mocked repositories.

Current test files
- `src/test/java/com/springboot/MyTodoList/service/TaskTTServiceTest.java`
  - Unit coverage for task lifecycle: create, update, delete, and `safeAssignTask()` (membership validation).

- `src/test/java/com/springboot/MyTodoList/service/BotTaskAdditionIntegrationTest.java`
  - Consolidated bot-action suite (`BotActionsTest`) that covers the Telegram entry points, state transitions, task creation, task completion/reopen, edit pickers, AI prompts, import prompts, and fallback actions.

- `src/test/java/com/springboot/MyTodoList/service/SprintTaskTTServiceTest.java`
  - Tests for sprint-task junction behavior: addTaskToSprint, updateTaskState, removeTaskFromSprint.

- `src/test/java/com/springboot/MyTodoList/service/KpisServiceTest.java`
  - Verifies mapping of raw repository rows into KPI response structures (velocity, completitud, etc.).

- `src/test/java/com/springboot/MyTodoList/controller/TaskTTControllerTest.java`
  - Web-slice tests for task listing endpoints: `/api/tasks`, `/api/projects/{pjId}/tasks`.

- `src/test/java/com/springboot/MyTodoList/controller/KpisControllerTest.java`
  - Web-slice tests for KPI endpoints: `/api/projects/{pjId}/kpis/*`, `/api/features/{featureId}/kpis/*`.

Notes
- The codebase exposes KPI endpoints for velocity, retrabajo, carga-equipo and completitud. There is no dedicated "cycle time" endpoint present by name; use the available KPI endpoints for dashboard needs.
- Tests are written to avoid starting the full application (use mocks / WebMvc slice), so they run quickly in CI.

Quick commands

Run all tests (from repository root):
```bash
cd MtdrSpring/backend
mvn test
```

Run a focused test class:
```bash
mvn -Dtest=com.springboot.MyTodoList.service.TaskTTServiceTest test
```

Run a single test method:
```bash
mvn -Dtest=com.springboot.MyTodoList.service.TaskTTServiceTest#addTask_saves_the_new_task test
```

Run controller/web-slice tests only:
```bash
mvn -Dtest=com.springboot.MyTodoList.controller.*Test test
```

Notes about test setup
- Tests use Mockito and Spring test utilities — no external DB or Telegram API is required.
- A small number of tests include `@SuppressWarnings("null")` in test scope to satisfy static null-safety checks; this does not affect runtime behavior.

Recent run (local)
- Focused service + controller test run: 25 tests passed, 0 failed.

Recommended next steps
1. Add controller tests for create/update/delete endpoints to exercise request/response contracts end-to-end.
2. Add one integration profile using H2 to exercise repository queries against a real DB for KPI SQL verification.
3. Add a CI workflow (GitHub Actions or other) that runs `mvn test` and publishes a JaCoCo coverage report.

Want me to proceed?
- I can add a minimal H2 integration test and profile, or
- create a GitHub Actions CI snippet that runs tests and publishes coverage.

File: [TEST_GUIDE.md](TEST_GUIDE.md)
