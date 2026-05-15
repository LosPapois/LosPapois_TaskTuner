# Test guide — BotActions test suite

This file documents the JUnit test suite, which focuses on the Telegram bot's core behaviors.

Current test coverage
- `src/test/java/com/springboot/MyTodoList/service/BotTaskAdditionIntegrationTest.java`
  - Contains the consolidated `BotActionsTest` suite that verifies the Telegram entry points, state transitions, task creation, task completion/reopen, edit pickers, AI prompts, import flows, and fallback actions.
  - Tests use Mockito to mock services (TaskService, UserService, etc.) and the Telegram client, allowing unit-test-style verification without a live bot or external APIs.
  - Includes test helpers to reset bot static state between tests and factory methods for creating `BotActions` instances with custom request text.

Quick commands

Run the BotActions test suite (from MtdrSpring/backend):
```bash
mvn -Dtest=BotActionsTest test
```

Run a single bot test method:
```bash
mvn -Dtest=BotActionsTest#testStartCommand test
```

Run all tests with verbose output:
```bash
mvn test
```

Notes about test setup
- Tests use Mockito and JUnit 5 — no external DB, Telegram API, or live bot is required.
- The test suite resets bot static state between test cases to ensure isolation and predictable test behavior.
- Tests verify end-to-end bot conversation flows: user sends command → bot state updates → bot sends response.

Recent run (local)
- BotActionsTest: 14 tests passed, 0 failed.

Test execution in CI
- The GitHub Actions workflow [.github/workflows/run-bot-tests.yml](.github/workflows/run-bot-tests.yml) runs the BotActionsTest suite on push and pull requests targeting the `JUnitTests` branch.
- The workflow uses `CI=false ./mvnw -Dtest=BotActionsTest test` to ensure consistent behavior across local and CI environments.

File: [TEST_GUIDE.md](TEST_GUIDE.md)
