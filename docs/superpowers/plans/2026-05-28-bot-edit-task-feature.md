# Bot: Change Task Feature from Edit Menu — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "🗂 Feature" option to the bot's task edit menu, and add a "❌ Sin feature" escape to the task creation feature selection.

**Architecture:** Two files change. `BotConversationState` gets one new state enum value. `BotActions` gets one new state dispatch, one new edit-menu button, one new `case` in the field handler, one new `showFeatureSelectionForTaskEdit()` helper, and one new `handleEditTaskNewFeature()` handler. The creation flow's `showFeatureSelectionForSprint()` gains a "sin feature" option and removes the blocking behavior when a sprint has no features.

**Tech Stack:** Java 17, Spring Boot, TelegramBots SDK (InlineKeyboardMarkup / InlineKeyboardButton), JUnit 5 + Mockito

---

### Task 1: Add `WAITING_EDIT_TASK_NEW_FEATURE` state to the enum

**Files:**
- Modify: `MtdrSpring/backend/src/main/java/com/springboot/MyTodoList/util/BotConversationState.java` (after line 20)
- Test: `MtdrSpring/backend/src/test/java/com/springboot/MyTodoList/service/BotTaskAdditionIntegrationTest.java`

- [ ] **Step 1: Write the failing test** — add inside `BotActionsTest` (after the existing feature-edit test, around line 333)

```java
@Test
@DisplayName("EDIT_FIELD:feature transitions to WAITING_EDIT_TASK_NEW_FEATURE")
void editField_feature_transitions_to_waiting_state() throws Exception {
    authenticate(user);
    actions("EDIT_PICK:55").fnEditPickTask();

    clearInvocations(telegramClient);
    actions("EDIT_FIELD:feature").fnPendingConversation();

    assertEquals(BotConversationState.WAITING_EDIT_TASK_NEW_FEATURE, conversationState());
}
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd MtdrSpring/backend && mvn test -Dtest="BotActionsTest#editField_feature_transitions_to_waiting_state" -q 2>&1 | tail -20
```

Expected: compile error — `WAITING_EDIT_TASK_NEW_FEATURE` does not exist.

- [ ] **Step 3: Add the new state to `BotConversationState.java`**

In the `// Task edit flow` section (after `WAITING_EDIT_TASK_NEW_SPRINT`, before `// Feature creation flow`):

```java
    WAITING_EDIT_TASK_NEW_SPRINT,
    WAITING_EDIT_TASK_NEW_FEATURE,   // ← add this line
    // Feature creation flow
```

- [ ] **Step 4: Run test again — should still fail** (handler not wired yet)

```bash
cd MtdrSpring/backend && mvn test -Dtest="BotActionsTest#editField_feature_transitions_to_waiting_state" -q 2>&1 | tail -20
```

Expected: FAIL — state stays `WAITING_EDIT_TASK_FIELD` (nothing handles `EDIT_FIELD:feature` yet).

- [ ] **Step 5: Commit the state addition** (additive, nothing breaks)

```bash
git add MtdrSpring/backend/src/main/java/com/springboot/MyTodoList/util/BotConversationState.java
git add MtdrSpring/backend/src/test/java/com/springboot/MyTodoList/service/BotTaskAdditionIntegrationTest.java
git commit -m "feat(bot): add WAITING_EDIT_TASK_NEW_FEATURE conversation state"
```

---

### Task 2: Fix creation flow — add "❌ Sin feature" to `showFeatureSelectionForSprint`

**Files:**
- Modify: `MtdrSpring/backend/src/main/java/com/springboot/MyTodoList/util/BotActions.java` lines 950–1007

- [ ] **Step 1: Write two failing tests** — add inside `BotActionsTest`

```java
@Test
@DisplayName("Task creation: FEATURE:none sets featureId to null")
void taskCreation_featureNone_sets_null_featureId() throws Exception {
    authenticate(user);

    actions("/addtask").fnAddItem();
    actions("Implement login").fnPendingConversation();
    actions("Build a login page").fnPendingConversation();
    actions("8").fnPendingConversation();
    actions("PRIO:high").fnPendingConversation();
    clearInvocations(telegramClient);
    actions("SPRINT:1").fnPendingConversation();
    assertEquals(BotConversationState.WAITING_NEW_ITEM_FEATURE, conversationState());

    clearInvocations(telegramClient);
    actions("FEATURE:none").fnPendingConversation();

    ArgumentCaptor<TaskTT> captor = ArgumentCaptor.forClass(TaskTT.class);
    verify(taskTTService).addTask(captor.capture());
    assertNull(captor.getValue().getFeatureId());
}

@Test
@DisplayName("Task creation: feature selection keyboard includes 'Sin feature' button")
void taskCreation_featureSelection_includes_sinFeature_button() throws Exception {
    authenticate(user);

    actions("/addtask").fnAddItem();
    actions("My task").fnPendingConversation();
    actions("Desc").fnPendingConversation();
    actions("3").fnPendingConversation();
    actions("PRIO:medium").fnPendingConversation();
    clearInvocations(telegramClient);
    actions("SPRINT:1").fnPendingConversation();

    boolean hasSinFeature = sentMessages().stream().anyMatch(msg -> {
        if (!(msg.getReplyMarkup() instanceof InlineKeyboardMarkup kb)) return false;
        return kb.getKeyboard().stream().flatMap(List::stream)
                .anyMatch(btn -> btn.getCallbackData().equals("FEATURE:none"));
    });
    assertTrue(hasSinFeature, "Feature selection keyboard must include FEATURE:none button");
}
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd MtdrSpring/backend && mvn test -Dtest="BotActionsTest#taskCreation_featureNone_sets_null_featureId+BotActionsTest#taskCreation_featureSelection_includes_sinFeature_button" -q 2>&1 | tail -20
```

Expected: both FAIL.

- [ ] **Step 3: Replace `showFeatureSelectionForSprint` (lines 950–976 in `BotActions.java`)**

Remove the `features.isEmpty()` early-return block and add "❌ Sin feature" button:

```java
private void showFeatureSelectionForSprint(long sprintId) {
    List<FeatureTT> features = featureTTService.getFeaturesBySprint(sprintId);

    var builder = InlineKeyboardMarkup.builder();
    for (FeatureTT f : features) {
        builder.keyboardRow(new InlineKeyboardRow(
                InlineKeyboardButton.builder()
                        .text("🗂 " + f.getNameFeature())
                        .callbackData("FEATURE:" + f.getFeatureId())
                        .build()));
    }
    builder.keyboardRow(new InlineKeyboardRow(
            InlineKeyboardButton.builder()
                    .text("❌ Sin feature")
                    .callbackData("FEATURE:none")
                    .build()));
    builder.keyboardRow(new InlineKeyboardRow(
            InlineKeyboardButton.builder().text("❌ Cancel").callbackData("CANCEL").build()));

    BotHelper.sendMessageToTelegramButtons(
            chatId, BotMessages.SELECT_FEATURE.getMessage(), telegramClient, builder.build());
}
```

- [ ] **Step 4: Update `handleNewItemFeature` to handle `FEATURE:none` (around line 996)**

Replace the `featureToken` parsing block (the `try { draft.setFeatureId(Long.parseLong(featureToken)); }` section):

```java
String featureToken = requestText.substring(8);
if ("none".equals(featureToken)) {
    draft.setFeatureId(null);
} else {
    try {
        draft.setFeatureId(Long.parseLong(featureToken));
    } catch (NumberFormatException e) {
        showFeatureSelectionForSprint(draft.getSprintId());
        exit = true;
        return;
    }
}
```

- [ ] **Step 5: Run the two new tests**

```bash
cd MtdrSpring/backend && mvn test -Dtest="BotActionsTest#taskCreation_featureNone_sets_null_featureId+BotActionsTest#taskCreation_featureSelection_includes_sinFeature_button" -q 2>&1 | tail -20
```

Expected: both PASS.

- [ ] **Step 6: Run full suite to check regressions**

```bash
cd MtdrSpring/backend && mvn test -q 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add MtdrSpring/backend/src/main/java/com/springboot/MyTodoList/util/BotActions.java
git add MtdrSpring/backend/src/test/java/com/springboot/MyTodoList/service/BotTaskAdditionIntegrationTest.java
git commit -m "feat(bot): add Sin feature option to task creation flow"
```

---

### Task 3: Wire edit-task feature — button, dispatch, case, helpers, and handler

**Files:**
- Modify: `MtdrSpring/backend/src/main/java/com/springboot/MyTodoList/util/BotActions.java`
  - `showEditFieldButtons` (~line 1457)
  - `handleEditTaskField` (~line 1423)
  - `fnPendingConversation` (~line 555)
  - Add `showFeatureSelectionForTaskEdit` after `showFeatureSelectionForSprint`
  - Add `handleEditTaskNewFeature` after `handleEditTaskNewSprint`

- [ ] **Step 1: Write three failing tests** — add inside `BotActionsTest`

```java
@Test
@DisplayName("Edit task feature: shows sprint features as keyboard options")
void editTaskFeature_shows_feature_selection_keyboard() throws Exception {
    authenticate(user);
    actions("EDIT_PICK:55").fnEditPickTask();
    clearInvocations(telegramClient);

    actions("EDIT_FIELD:feature").fnPendingConversation();

    assertEquals(BotConversationState.WAITING_EDIT_TASK_NEW_FEATURE, conversationState());
    boolean hasFeatureButton = sentMessages().stream().anyMatch(msg -> {
        if (!(msg.getReplyMarkup() instanceof InlineKeyboardMarkup kb)) return false;
        return kb.getKeyboard().stream().flatMap(List::stream)
                .anyMatch(btn -> btn.getCallbackData().equals("EDIT_TASK_FEAT:" + FEATURE_ID));
    });
    assertTrue(hasFeatureButton, "Feature selection must include EDIT_TASK_FEAT:{id} button");
}

@Test
@DisplayName("Edit task feature: EDIT_TASK_FEAT:none sets featureId to null")
void editTaskFeature_none_sets_featureId_null() throws Exception {
    authenticate(user);
    actions("EDIT_PICK:55").fnEditPickTask();
    actions("EDIT_FIELD:feature").fnPendingConversation();
    clearInvocations(telegramClient);

    actions("EDIT_TASK_FEAT:none").fnPendingConversation();

    ArgumentCaptor<TaskTT> captor = ArgumentCaptor.forClass(TaskTT.class);
    verify(taskTTService).updateTask(eq(TASK_ID), captor.capture());
    assertNull(captor.getValue().getFeatureId());
    assertNull(conversationState());
}

@Test
@DisplayName("Edit task feature: EDIT_TASK_FEAT:{id} updates featureId and confirms")
void editTaskFeature_id_updates_featureId() throws Exception {
    authenticate(user);
    actions("EDIT_PICK:55").fnEditPickTask();
    actions("EDIT_FIELD:feature").fnPendingConversation();
    clearInvocations(telegramClient);

    actions("EDIT_TASK_FEAT:" + FEATURE_ID).fnPendingConversation();

    ArgumentCaptor<TaskTT> captor = ArgumentCaptor.forClass(TaskTT.class);
    verify(taskTTService).updateTask(eq(TASK_ID), captor.capture());
    assertEquals(FEATURE_ID, captor.getValue().getFeatureId());
    assertNull(conversationState());
    assertTrue(sentMessages().stream().anyMatch(msg -> msg.getText().contains("Feature updated")));
}
```

- [ ] **Step 2: Run to verify all three fail**

```bash
cd MtdrSpring/backend && mvn test -Dtest="BotActionsTest#editTaskFeature_shows_feature_selection_keyboard+BotActionsTest#editTaskFeature_none_sets_featureId_null+BotActionsTest#editTaskFeature_id_updates_featureId" -q 2>&1 | tail -20
```

Expected: all FAIL (the transition test from Task 1 now also fails since handler isn't wired).

- [ ] **Step 3: Add "🗂 Feature" button to `showEditFieldButtons` (~line 1467)**

The current Sprint row and Cancel row:
```java
.keyboardRow(new InlineKeyboardRow(
        InlineKeyboardButton.builder().text("🔄 Sprint").callbackData("EDIT_FIELD:sprint").build()))
.keyboardRow(new InlineKeyboardRow(
        InlineKeyboardButton.builder().text("❌ Cancel").callbackData("CANCEL").build()))
```

Replace with:
```java
.keyboardRow(new InlineKeyboardRow(
        InlineKeyboardButton.builder().text("🔄 Sprint").callbackData("EDIT_FIELD:sprint").build()))
.keyboardRow(new InlineKeyboardRow(
        InlineKeyboardButton.builder().text("🗂 Feature").callbackData("EDIT_FIELD:feature").build()))
.keyboardRow(new InlineKeyboardRow(
        InlineKeyboardButton.builder().text("❌ Cancel").callbackData("CANCEL").build()))
```

- [ ] **Step 4: Add `case "feature":` to `handleEditTaskField` (~line 1447)**

Insert before `default:`:

```java
case "feature":
    BotTaskDraft fDraft = taskDrafts.get(chatId);
    if (fDraft == null || fDraft.getTaskId() == null) {
        clearConversationState();
        BotHelper.sendMessageToTelegram(chatId, "Error. Please try again.", telegramClient, null);
        exit = true;
        return;
    }
    List<com.springboot.MyTodoList.model.SprintTaskTT> links =
            sprintTaskTTService.getSprintsForTask(fDraft.getTaskId());
    long sprId = links.isEmpty() ? 0L : links.get(0).getSprId();
    if (sprId == 0L) {
        BotHelper.sendMessageToTelegram(chatId,
                "⚠️ Could not find sprint for this task.", telegramClient, null);
        showMainMenu();
        exit = true;
        return;
    }
    setCurrentState(BotConversationState.WAITING_EDIT_TASK_NEW_FEATURE);
    showFeatureSelectionForTaskEdit(sprId);
    break;
```

- [ ] **Step 5: Add dispatch case in `fnPendingConversation` (~line 557)**

After `case WAITING_EDIT_TASK_NEW_SPRINT: handleEditTaskNewSprint(); break;`, add:

```java
case WAITING_EDIT_TASK_NEW_FEATURE:
    handleEditTaskNewFeature();
    break;
```

- [ ] **Step 6: Add `showFeatureSelectionForTaskEdit(long sprintId)` helper**

Add immediately after `showFeatureSelectionForSprint` closes (after line ~976):

```java
private void showFeatureSelectionForTaskEdit(long sprintId) {
    List<FeatureTT> features = featureTTService.getFeaturesBySprint(sprintId);

    var builder = InlineKeyboardMarkup.builder();
    for (FeatureTT f : features) {
        builder.keyboardRow(new InlineKeyboardRow(
                InlineKeyboardButton.builder()
                        .text("🗂 " + f.getNameFeature())
                        .callbackData("EDIT_TASK_FEAT:" + f.getFeatureId())
                        .build()));
    }
    builder.keyboardRow(new InlineKeyboardRow(
            InlineKeyboardButton.builder()
                    .text("❌ Sin feature")
                    .callbackData("EDIT_TASK_FEAT:none")
                    .build()));
    builder.keyboardRow(new InlineKeyboardRow(
            InlineKeyboardButton.builder().text("❌ Cancel").callbackData("CANCEL").build()));

    BotHelper.sendMessageToTelegramButtons(
            chatId, "🗂 Select the feature for this task:", telegramClient, builder.build());
}
```

- [ ] **Step 7: Add `handleEditTaskNewFeature()` handler**

Add immediately after `handleEditTaskNewSprint` closes (~line 1653):

```java
private void handleEditTaskNewFeature() {
    if (!requestText.startsWith("EDIT_TASK_FEAT:")) {
        BotTaskDraft draft = taskDrafts.get(chatId);
        if (draft != null && draft.getTaskId() != null) {
            List<com.springboot.MyTodoList.model.SprintTaskTT> links =
                    sprintTaskTTService.getSprintsForTask(draft.getTaskId());
            long sprId = links.isEmpty() ? 0L : links.get(0).getSprId();
            showFeatureSelectionForTaskEdit(sprId);
        }
        exit = true;
        return;
    }

    BotTaskDraft draft = taskDrafts.get(chatId);
    if (draft == null || draft.getTaskId() == null) {
        clearConversationState();
        BotHelper.sendMessageToTelegram(chatId, "Error. Please try again with /edittask.", telegramClient, null);
        exit = true;
        return;
    }

    TaskTT task = taskTTService.getTaskById(draft.getTaskId()).orElse(null);
    if (task == null) {
        clearConversationState();
        BotHelper.sendMessageToTelegram(chatId, "Task not found.", telegramClient, null);
        exit = true;
        return;
    }

    String featureToken = requestText.substring(15);
    if ("none".equals(featureToken)) {
        task.setFeatureId(null);
    } else {
        try {
            task.setFeatureId(Long.parseLong(featureToken));
        } catch (NumberFormatException e) {
            List<com.springboot.MyTodoList.model.SprintTaskTT> links =
                    sprintTaskTTService.getSprintsForTask(draft.getTaskId());
            long sprId = links.isEmpty() ? 0L : links.get(0).getSprId();
            showFeatureSelectionForTaskEdit(sprId);
            exit = true;
            return;
        }
    }

    taskTTService.updateTask(task.getTaskId(), task);
    clearConversationState();
    BotHelper.sendMessageToTelegram(chatId, "✅ Feature updated!", telegramClient, null);
    showMainMenu();
    exit = true;
}
```

- [ ] **Step 8: Run the three new tests plus the Task 1 transition test**

```bash
cd MtdrSpring/backend && mvn test -Dtest="BotActionsTest#editField_feature_transitions_to_waiting_state+BotActionsTest#editTaskFeature_shows_feature_selection_keyboard+BotActionsTest#editTaskFeature_none_sets_featureId_null+BotActionsTest#editTaskFeature_id_updates_featureId" -q 2>&1 | tail -20
```

Expected: all 4 PASS.

- [ ] **Step 9: Run full suite**

```bash
cd MtdrSpring/backend && mvn test -q 2>&1 | tail -20
```

Expected: all tests pass.

- [ ] **Step 10: Commit**

```bash
git add MtdrSpring/backend/src/main/java/com/springboot/MyTodoList/util/BotActions.java
git add MtdrSpring/backend/src/test/java/com/springboot/MyTodoList/service/BotTaskAdditionIntegrationTest.java
git commit -m "feat(bot): add Feature field to task edit menu"
```
