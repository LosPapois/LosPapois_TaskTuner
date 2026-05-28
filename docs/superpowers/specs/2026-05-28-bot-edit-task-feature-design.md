# Bot: Change Task Feature from Edit Menu

**Date:** 2026-05-28  
**Scope:** Telegram bot — task edit flow + task creation flow

---

## Problem

The bot's task edit menu (`showEditFieldButtons`) exposes: Name, Description, Story Points, Priority, Sprint — but **not Feature**. Users cannot reassign a task to a different feature via the bot. Additionally, when creating a task, the feature selection blocks the flow entirely if the sprint has no features, and there is no "No feature" escape option.

---

## Goals

1. Add **"🗂 Feature"** option to the task edit menu in the bot.
2. When editing, show the features available in the task's current sprint.
3. Include **"❌ Sin feature"** option in both edit and creation flows so a task can be left without a feature.
4. Creation flow: never block when sprint has no features — always offer "❌ Sin feature" as fallback.

---

## Out of Scope

- Web frontend changes (feature dropdown already works there).
- Bulk-import feature assignment changes.
- Changing which sprint a feature belongs to from the task edit screen.

---

## Design

### State machine change — `BotConversationState.java`

Add one new state:

```java
WAITING_EDIT_TASK_NEW_FEATURE,
```

### `BotActions.java` — 5 targeted changes

#### 1. `showEditFieldButtons()` — add Feature button

Add a new keyboard row after the Sprint row:

```java
.keyboardRow(new InlineKeyboardRow(
    InlineKeyboardButton.builder()
        .text("🗂 Feature").callbackData("EDIT_FIELD:feature").build()))
```

#### 2. `handleEditTaskField()` — add `case "feature":`

Resolve the task's current sprint, then show feature buttons:

```java
case "feature":
    BotTaskDraft fDraft = taskDrafts.get(chatId);
    if (fDraft != null && fDraft.getTaskId() != null) {
        List<SprintTaskTT> links = sprintTaskTTService.getSprintsForTask(fDraft.getTaskId());
        long sprId = links.isEmpty() ? 0L : links.get(0).getId().getSprId();
        setCurrentState(BotConversationState.WAITING_EDIT_TASK_NEW_FEATURE);
        showFeatureSelectionForTaskEdit(sprId, fDraft.getTaskId());
    }
    break;
```

If no sprint found, sends an error message and stays on main menu.

#### 3. New helper `showFeatureSelectionForTaskEdit(long sprintId, long taskId)`

Uses callback prefix `EDIT_TASK_FEAT:` (distinct from `FEATURE:` used in creation flow).  
Always includes "❌ Sin feature" at the bottom with `EDIT_TASK_FEAT:none`.  
If `sprintId == 0` or features list is empty: still shows "❌ Sin feature" as the only option.

#### 4. New handler `handleEditTaskNewFeature()` (dispatched from `fnPendingConversation`)

```
WAITING_EDIT_TASK_NEW_FEATURE → handleEditTaskNewFeature()
```

- Parses `EDIT_TASK_FEAT:{id}` or `EDIT_TASK_FEAT:none`
- Looks up task from draft's `taskId`
- Sets `task.setFeatureId(parsedId)` (or `null` for "none")
- Calls `taskTTService.updateTask(task.getTaskId(), task)`
- Sends confirmation and returns to main menu

#### 5. `showFeatureSelectionForSprint()` (creation flow) — add "❌ Sin feature"

Currently blocks if no features exist. Change to:
- Always add `FEATURE:none` button ("❌ Sin feature") as last option.
- Remove the early-return error when `features.isEmpty()`.

Update `handleNewItemFeature()` to handle `featureToken.equals("none")` → `draft.setFeatureId(null)`.

---

## Data Flow

```
Edit menu → EDIT_FIELD:feature
    → find sprint via sprintTaskTTService.getSprintsForTask(taskId)
    → featureTTService.getFeaturesBySprint(sprintId)
    → show buttons: [Feature A] [Feature B] [❌ Sin feature]
    → EDIT_TASK_FEAT:{id} or EDIT_TASK_FEAT:none
    → task.setFeatureId(id or null) → taskTTService.updateTask(...)
    → ✅ Feature updated! → main menu
```

---

## Files Changed

| File | Change |
|------|--------|
| `util/BotConversationState.java` | Add `WAITING_EDIT_TASK_NEW_FEATURE` |
| `util/BotActions.java` | 5 changes described above |

---

## Edge Cases

- **No sprint found for task:** Show "⚠️ Could not find sprint for this task." and return to main menu without changing state.
- **Sprint has no features:** Show only "❌ Sin feature" button — user can unassign or cancel.
- **`featureId` is already null:** Selecting "❌ Sin feature" is a no-op but still confirms and returns to menu.
- **Non-owner task:** The existing ownership check in `fnEditPickTask` already prevents editing tasks that don't belong to the user — no additional guard needed here.
