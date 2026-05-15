package com.springboot.MyTodoList.service;

import com.springboot.MyTodoList.model.FeatureTT;
import com.springboot.MyTodoList.model.ProjectUserTT;
import com.springboot.MyTodoList.model.SprintTT;
import com.springboot.MyTodoList.model.SprintTaskTT;
import com.springboot.MyTodoList.model.TaskTT;
import com.springboot.MyTodoList.model.UserTT;
import com.springboot.MyTodoList.util.BotActions;
import com.springboot.MyTodoList.util.BotConversationState;
import com.springboot.MyTodoList.util.BotMessages;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.telegram.telegrambots.meta.api.methods.send.SendMessage;
import org.telegram.telegrambots.meta.api.objects.replykeyboard.InlineKeyboardMarkup;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import java.lang.reflect.Field;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
@DisplayName("BotActions - chatbot action tests")
@SuppressWarnings("null")
class BotActionsTest {

    private static final long CHAT_ID = 1001L;
    private static final String TELEGRAM_IDENTITY = "tg-1001";
    private static final long USER_ID = 7L;
    private static final long PROJECT_ID = 1L;
    private static final long SPRINT_ID = 1L;
    private static final long FEATURE_ID = 10L;
    private static final long TASK_ID = 55L;

    @Mock
    private TelegramClient telegramClient;

    @Mock
    private ToDoItemService todoService;

    @Mock
    private DeepSeekService deepSeekService;

    @Mock
    private GroqService groqService;

    @Mock
    private UserTTService userTTService;

    @Mock
    private SprintTTService sprintTTService;

    @Mock
    private ProjectTTService projectTTService;

    @Mock
    private ProjectUserTTService projectUserTTService;

    @Mock
    private SprintTaskTTService sprintTaskTTService;

    @Mock
    private TaskTTService taskTTService;

    @Mock
    private FeatureTTService featureTTService;

    private UserTT user;
    private SprintTT activeSprint;
    private FeatureTT feature;
    private TaskTT pendingTask;
    private TaskTT completedTask;

    @BeforeEach
    void setUp() throws Exception {
        resetBotState();

        user = new UserTT(USER_ID, "Sergio Tester", "secret", TELEGRAM_IDENTITY, "sergio@example.com",
                "developer");
        activeSprint = new SprintTT(SPRINT_ID, "Sprint 1", LocalDate.now(), LocalDate.now().plusDays(14), 20,
                "active", PROJECT_ID);
        feature = new FeatureTT(FEATURE_ID, "Authentication", "high", SPRINT_ID);
        feature.setDescriptionFeature("Authentication feature");

        pendingTask = new TaskTT(TASK_ID, "Implement login", 8, LocalDate.now(), LocalDate.now().plusDays(7), null,
                "high", "Build login", FEATURE_ID, USER_ID, PROJECT_ID);
        completedTask = new TaskTT(TASK_ID + 1, "Fix dashboard", 5, LocalDate.now(), LocalDate.now().plusDays(7),
                LocalDate.now(), "medium", "Fix dashboard", FEATURE_ID, USER_ID, PROJECT_ID);

        when(userTTService.getUserByTelegram(TELEGRAM_IDENTITY)).thenReturn(Optional.of(user));
        when(userTTService.getUserById(USER_ID)).thenReturn(Optional.of(user));
        when(projectUserTTService.getProjectsForUser(USER_ID)).thenReturn(List.of(new ProjectUserTT(PROJECT_ID, USER_ID)));
        when(sprintTTService.getSprintsByProject(PROJECT_ID)).thenReturn(List.of(activeSprint));
        when(sprintTTService.findAll()).thenReturn(List.of(activeSprint));
        when(sprintTTService.getSprintById(SPRINT_ID)).thenReturn(Optional.of(activeSprint));
        when(sprintTTService.getSprintById(SPRINT_ID + 1)).thenReturn(Optional.of(
                new SprintTT(SPRINT_ID + 1, "Sprint 2", LocalDate.now().plusDays(15), LocalDate.now().plusDays(29),
                        20, "planned", PROJECT_ID)));
        when(sprintTTService.getActiveSprintForProject(PROJECT_ID)).thenReturn(Optional.of(activeSprint));
        when(featureTTService.getFeaturesBySprint(SPRINT_ID)).thenReturn(List.of(feature));
        when(featureTTService.getFeaturesBySprint(SPRINT_ID + 1)).thenReturn(List.of(feature));
        when(featureTTService.getFeatureById(FEATURE_ID)).thenReturn(Optional.of(feature));
        when(taskTTService.getTasksByUserInActiveSprint(USER_ID)).thenReturn(List.of(pendingTask, completedTask));
        when(taskTTService.getTasksByUser(USER_ID)).thenReturn(List.of(pendingTask, completedTask));
        when(taskTTService.getTaskById(TASK_ID)).thenReturn(Optional.of(pendingTask));
        when(taskTTService.getTaskById(TASK_ID + 1)).thenReturn(Optional.of(completedTask));
        when(sprintTaskTTService.getSprintsForTask(TASK_ID))
                .thenReturn(List.of(new SprintTaskTT(SPRINT_ID, TASK_ID, "active")));
        when(sprintTaskTTService.getSprintsForTask(TASK_ID + 1))
                .thenReturn(List.of(new SprintTaskTT(SPRINT_ID, TASK_ID + 1, "done")));
        when(taskTTService.addTask(any(TaskTT.class))).thenAnswer(invocation -> {
            TaskTT task = invocation.getArgument(0);
            task.setTaskId(TASK_ID);
            return task;
        });
        when(taskTTService.updateTask(anyLong(), any(TaskTT.class))).thenAnswer(invocation -> invocation.getArgument(1));
        when(sprintTaskTTService.addTaskToSprint(anyLong(), anyLong())).thenReturn(new SprintTaskTT(SPRINT_ID, TASK_ID,
                "active"));
        when(sprintTaskTTService.updateTaskState(anyLong(), anyLong(), any())).thenAnswer(invocation -> new SprintTaskTT(
                invocation.getArgument(0), invocation.getArgument(1), invocation.getArgument(2)));
        when(deepSeekService.generateText(any())).thenReturn("LLM output");
    }

    @Test
    @DisplayName("fnStart shows login for anonymous users")
    void fnStart_shows_login_when_anonymous() throws Exception {
        actions("/start").fnStart();

        SendMessage message = lastMessage();
        assertTrue(message.getText().contains("Welcome! Please log in."));
        assertNotNull(message.getReplyMarkup());
        assertNull(conversationState());
    }

    @Test
    @DisplayName("fnStart shows the main menu for authenticated users")
    void fnStart_shows_main_menu_when_authenticated() throws Exception {
        authenticate(user);
        actions("/start").fnStart();

        SendMessage message = lastMessage();
        assertTrue(message.getText().contains("Hello Sergio Tester! What would you like to do?"));
        InlineKeyboardMarkup keyboard = (InlineKeyboardMarkup) message.getReplyMarkup();
        assertEquals("➕ Add Task", keyboard.getKeyboard().get(0).get(0).getText());
    }

    @Test
    @DisplayName("fnCancel clears state and prompts login")
    void fnCancel_clears_state_and_prompts_login() throws Exception {
        actions("/cancel").fnCancel();

        List<SendMessage> messages = sentMessages();
        assertTrue(messages.stream().anyMatch(msg -> msg.getText().contains("Operation cancelled")));
        assertTrue(messages.stream().anyMatch(msg -> msg.getText().contains("Welcome! Please log in.")));
        assertNull(conversationState());
    }

    @Test
    @DisplayName("fnLogin authenticates the Telegram user and opens the menu")
    void fnLogin_authenticates_user() throws Exception {
        actions("/login").fnLogin();

        assertSame(user, authenticatedUser());
        assertTrue(lastMessage().getText().contains("Hello Sergio Tester! What would you like to do?"));
    }

    @Test
    @DisplayName("fnRegister starts the registration flow")
    void fnRegister_starts_registration_flow() throws Exception {
        when(userTTService.getUserByTelegram(TELEGRAM_IDENTITY)).thenReturn(Optional.empty());
        actions("/register").fnRegister();

        assertEquals(BotConversationState.WAITING_REGISTER_NAME, conversationState());
        assertTrue(lastMessage().getText().contains(BotMessages.TYPE_REGISTER_NAME.getMessage()));
    }

    @Test
    @DisplayName("fnAddItem and fnPendingConversation complete the task creation flow")
    void fnAddItem_and_fnPendingConversation_complete_task_flow() throws Exception {
        authenticate(user);

        actions("/addtask").fnAddItem();
        assertEquals(BotConversationState.WAITING_NEW_ITEM_NAME, conversationState());
        assertTrue(lastMessage().getText().contains(BotMessages.TYPE_NEW_TODO_ITEM.getMessage()));

        clearInvocations(telegramClient);
        actions("Implement login").fnPendingConversation();
        assertEquals(BotConversationState.WAITING_NEW_ITEM_DESCRIPTION, conversationState());

        clearInvocations(telegramClient);
        actions("Build a login page and API").fnPendingConversation();
        assertEquals(BotConversationState.WAITING_NEW_ITEM_STORY_POINTS, conversationState());

        clearInvocations(telegramClient);
        actions("8").fnPendingConversation();
        assertEquals(BotConversationState.WAITING_NEW_ITEM_PRIORITY, conversationState());

        clearInvocations(telegramClient);
        actions("PRIO:high").fnPendingConversation();
        assertEquals(BotConversationState.WAITING_NEW_ITEM_SPRINT, conversationState());

        clearInvocations(telegramClient);
        actions("SPRINT:1").fnPendingConversation();
        assertEquals(BotConversationState.WAITING_NEW_ITEM_FEATURE, conversationState());

        clearInvocations(telegramClient);
        actions("FEATURE:10").fnPendingConversation();

        ArgumentCaptor<TaskTT> captor = ArgumentCaptor.forClass(TaskTT.class);
        verify(taskTTService).addTask(captor.capture());
        assertEquals("Implement login", captor.getValue().getNameTask());
        assertEquals(8, captor.getValue().getStoryPoints());
        assertEquals(USER_ID, captor.getValue().getUserId());
        assertEquals(PROJECT_ID, captor.getValue().getPjId());
        verify(sprintTaskTTService).addTaskToSprint(SPRINT_ID, TASK_ID);
        assertNull(conversationState());
        assertTrue(sentMessages().stream().anyMatch(msg -> msg.getText().contains(BotMessages.TASK_ADDED.getMessage())));
    }

    @Test
    @DisplayName("fnListAll shows the current sprint tasks")
    void fnListAll_shows_active_sprint_tasks() throws Exception {
        authenticate(user);
        actions("/todolist").fnListAll();

        assertTrue(sentMessages().stream().anyMatch(msg -> msg.getText().contains("My Tasks — Active Sprint")));
        assertTrue(sentMessages().stream().anyMatch(msg -> msg.getText().contains("Implement login")));
        assertTrue(sentMessages().stream().anyMatch(msg -> msg.getText().contains("Fix dashboard")));
    }

    @Test
    @DisplayName("fnStatus shows progress for the active sprint")
    void fnStatus_shows_progress_summary() throws Exception {
        authenticate(user);
        actions("/status").fnStatus();

        assertTrue(sentMessages().stream().anyMatch(msg -> msg.getText().contains("My Progress — Active Sprint")));
        assertTrue(sentMessages().stream().anyMatch(msg -> msg.getText().contains("Authentication")));
    }

    @Test
    @DisplayName("fnShowDonePicker and fnMarkTaskDone complete a task")
    void fnShowDonePicker_and_fnMarkTaskDone_complete_task() throws Exception {
        authenticate(user);

        actions("/done").fnShowDonePicker();
        assertTrue(lastMessage().getText().contains("SELECT A TASK TO MARK AS DONE"));

        clearInvocations(telegramClient);
        actions("DONE_TASK:55").fnMarkTaskDone();

        ArgumentCaptor<TaskTT> captor = ArgumentCaptor.forClass(TaskTT.class);
        verify(taskTTService).updateTask(eq(TASK_ID), captor.capture());
        assertNotNull(captor.getValue().getDateEndRealTask());
        verify(sprintTaskTTService).updateTaskState(SPRINT_ID, TASK_ID, "done");
        assertTrue(sentMessages().stream().anyMatch(msg -> msg.getText().contains("completed")));
    }

    @Test
    @DisplayName("fnUndo and fnMarkTaskUndo reopen a task")
    void fnUndo_and_fnMarkTaskUndo_reopen_task() throws Exception {
        authenticate(user);

        actions("/undo").fnUndo();
        assertTrue(lastMessage().getText().contains("Select a task to reopen"));

        clearInvocations(telegramClient);
        actions("UNDO_TASK:56").fnMarkTaskUndo();

        ArgumentCaptor<TaskTT> captor = ArgumentCaptor.forClass(TaskTT.class);
        verify(taskTTService).updateTask(eq(TASK_ID + 1), captor.capture());
        assertNull(captor.getValue().getDateEndRealTask());
        verify(sprintTaskTTService).updateTaskState(SPRINT_ID, TASK_ID + 1, "active");
        assertTrue(sentMessages().stream().anyMatch(msg -> msg.getText().contains("reopened successfully")));
    }

    @Test
    @DisplayName("fnShowEditPicker and fnEditPickTask start the task edit flow")
    void fnShowEditPicker_and_fnEditPickTask_start_edit_flow() throws Exception {
        authenticate(user);

        actions("/edittask").fnShowEditPicker();
        assertTrue(lastMessage().getText().contains("Select a task to edit"));

        clearInvocations(telegramClient);
        actions("EDIT_PICK:55").fnEditPickTask();
        assertEquals(BotConversationState.WAITING_EDIT_TASK_FIELD, conversationState());
        assertTrue(lastMessage().getText().contains("What would you like to edit?"));
    }

    @Test
    @DisplayName("fnShowEditFeaturePicker and fnEditPickFeature start the feature edit flow")
    void fnShowEditFeaturePicker_and_fnEditPickFeature_start_edit_flow() throws Exception {
        authenticate(user);

        actions("/editfeature").fnShowEditFeaturePicker();
        assertTrue(lastMessage().getText().contains("Select a feature to edit"));

        clearInvocations(telegramClient);
        actions("EDIT_FEAT_PICK:10").fnEditPickFeature();
        assertEquals(BotConversationState.WAITING_EDIT_FEATURE_FIELD, conversationState());
        assertTrue(lastMessage().getText().contains("What would you like to edit?"));
    }

    @Test
    @DisplayName("fnAsk, fnAiCreate, fnAddFeature, fnImportTasks, fnLLM and fnElse start their chatbot flows")
    void chatbot_entrypoints_start_their_flows() throws Exception {
        authenticate(user);

        actions("/ask").fnAsk();
        assertEquals(BotConversationState.WAITING_AI_QUESTION, conversationState());
        assertTrue(lastMessage().getText().contains(BotMessages.ASK_AI_PROMPT.getMessage()));

        clearInvocations(telegramClient);
        actions("/aicreate").fnAiCreate();
        assertEquals(BotConversationState.WAITING_AI_CREATE_DESCRIPTION, conversationState());
        assertTrue(lastMessage().getText().contains(BotMessages.AI_CREATE_PROMPT.getMessage()));

        clearInvocations(telegramClient);
        actions("/addfeature").fnAddFeature();
        assertEquals(BotConversationState.WAITING_NEW_FEATURE_NAME, conversationState());
        assertTrue(lastMessage().getText().contains(BotMessages.TYPE_NEW_FEATURE_NAME.getMessage()));

        clearInvocations(telegramClient);
        actions("/importtasks").fnImportTasks();
        assertEquals(BotConversationState.WAITING_IMPORT_TEXT, conversationState());
        assertTrue(lastMessage().getText().contains(BotMessages.IMPORT_PROMPT.getMessage()));

        clearInvocations(telegramClient);
        actions("/llm").fnLLM();
        assertTrue(lastMessage().getText().contains("LLM: LLM output"));

        clearInvocations(telegramClient);
        actions("whatever").fnElse();
        assertTrue(lastMessage().getText().contains("Select a valid option"));
    }

    @Test
    @DisplayName("fnDone and fnDelete remain safe no-ops")
    void fnDone_and_fnDelete_are_safe_noops() throws Exception {
        BotActions doneActions = actions("/done");
        doneActions.fnDone();
        doneActions.fnDelete();
        verifyNoInteractions(telegramClient);
    }

    private BotActions actions(String requestText) {
        BotActions botActions = new BotActions(telegramClient, todoService, deepSeekService, groqService,
                userTTService, sprintTTService, projectTTService, projectUserTTService, sprintTaskTTService,
                taskTTService, featureTTService);
        botActions.setChatId(CHAT_ID);
        botActions.setTelegramIdentity(TELEGRAM_IDENTITY);
        botActions.setRequestText(requestText);
        return botActions;
    }

    private void authenticate(UserTT value) throws Exception {
        staticMap("authenticatedUsers").put(CHAT_ID, value);
    }

    private UserTT authenticatedUser() throws Exception {
        return (UserTT) staticMap("authenticatedUsers").get(CHAT_ID);
    }

    private BotConversationState conversationState() throws Exception {
        return (BotConversationState) staticMap("chatStates").get(CHAT_ID);
    }

    @SuppressWarnings("unchecked")
    private <K, V> Map<K, V> staticMap(String fieldName) throws Exception {
        Field field = BotActions.class.getDeclaredField(fieldName);
        field.setAccessible(true);
        return (Map<K, V>) field.get(null);
    }

    private void resetBotState() throws Exception {
        staticMap("chatStates").clear();
        staticMap("registrationDrafts").clear();
        staticMap("taskDrafts").clear();
        staticMap("featureDrafts").clear();
        staticMap("importDrafts").clear();
        staticMap("authenticatedUsers").clear();
    }

    private SendMessage lastMessage() throws Exception {
        return sentMessages().get(sentMessages().size() - 1);
    }

    private List<SendMessage> sentMessages() throws Exception {
        ArgumentCaptor<SendMessage> captor = ArgumentCaptor.forClass(SendMessage.class);
        verify(telegramClient, atLeastOnce()).execute(captor.capture());
        return new ArrayList<>(captor.getAllValues());
    }
}
