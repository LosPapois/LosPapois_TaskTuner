package com.springboot.MyTodoList.controller;

import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.telegram.telegrambots.longpolling.BotSession;
import org.telegram.telegrambots.longpolling.interfaces.LongPollingUpdateConsumer;
import org.telegram.telegrambots.longpolling.starter.AfterBotRegistration;
import org.telegram.telegrambots.longpolling.starter.SpringLongPollingBot;
import org.telegram.telegrambots.meta.api.methods.AnswerCallbackQuery;
import org.telegram.telegrambots.meta.api.objects.Update;
import org.telegram.telegrambots.meta.exceptions.TelegramApiException;
import org.telegram.telegrambots.meta.generics.TelegramClient;

import com.springboot.MyTodoList.config.BotProps;
import com.springboot.MyTodoList.service.DocumentProcessingService;
import com.springboot.MyTodoList.service.DocumentTTService;
import com.springboot.MyTodoList.service.GroqService;
import com.springboot.MyTodoList.service.FeatureTTService;
import com.springboot.MyTodoList.service.LuceneService;
import com.springboot.MyTodoList.service.ProjectTTService;
import com.springboot.MyTodoList.service.ProjectUserTTService;
import com.springboot.MyTodoList.service.SprintTaskTTService;
import com.springboot.MyTodoList.service.SprintTTService;
import com.springboot.MyTodoList.service.TaskTTService;
import com.springboot.MyTodoList.service.ToDoItemService;
import com.springboot.MyTodoList.service.UserTTService;
import com.springboot.MyTodoList.util.BotActions;

@Component
public class ToDoItemBotController implements SpringLongPollingBot, LongPollingUpdateConsumer {

    private static final Logger logger = LoggerFactory.getLogger(ToDoItemBotController.class);

    // One single-threaded executor per chatId:
    //   - Messages from the same chat are processed in order (no state corruption)
    //   - Messages from different chats run in parallel (no blocking between users)
    private final ConcurrentHashMap<Long, ExecutorService> chatExecutors = new ConcurrentHashMap<>();
    private final ToDoItemService toDoItemService;
    private final GroqService groqService;
    private final UserTTService userTTService;
    private final SprintTTService sprintTTService;
    private final ProjectTTService projectTTService;
    private final ProjectUserTTService projectUserTTService;
    private final SprintTaskTTService sprintTaskTTService;
    private final TaskTTService taskTTService;
    private final FeatureTTService featureTTService;
    private final LuceneService luceneService;
    private final DocumentProcessingService documentProcessingService;
    private final DocumentTTService documentTTService;
    private final TelegramClient telegramClient;
    private final BotProps botProps;

    @Override
    public String getBotToken() {
        return botProps.getToken();
    }

    public ToDoItemBotController(BotProps bp,
            ToDoItemService tsvc,
            @Autowired(required = false) GroqService gs,
            UserTTService userTTService,
            SprintTTService sprintTTService,
            ProjectTTService projectTTService,
            ProjectUserTTService projectUserTTService,
            SprintTaskTTService sprintTaskTTService,
            TaskTTService taskTTService,
            FeatureTTService featureTTService,
            LuceneService luceneService,
            DocumentProcessingService documentProcessingService,
            DocumentTTService documentTTService,
            TelegramClient telegramClient) {
        this.botProps = bp;
        this.telegramClient = telegramClient;
        this.toDoItemService = tsvc;
        this.groqService = gs;
        this.userTTService = userTTService;
        this.sprintTTService = sprintTTService;
        this.projectTTService = projectTTService;
        this.projectUserTTService = projectUserTTService;
        this.sprintTaskTTService = sprintTaskTTService;
        this.taskTTService = taskTTService;
        this.featureTTService = featureTTService;
        this.luceneService = luceneService;
        this.documentProcessingService = documentProcessingService;
        this.documentTTService = documentTTService;
    }

    @Override
    public LongPollingUpdateConsumer getUpdatesConsumer() {
        return this;
    }

    @Override
    public void consume(List<Update> updates) {
        for (Update update : updates) {
            dispatchUpdate(update);
        }
    }

    /**
     * Routes each update to the per-chat executor.
     * Same chat → sequential (preserves conversation state order).
     * Different chats → parallel (users don't block each other).
     */
    private void dispatchUpdate(Update update) {
        long chatId;
        if (update.hasMessage() && update.getMessage().hasText()) {
            chatId = update.getMessage().getChatId();
        } else if (update.hasMessage() && update.getMessage().hasDocument()) {
            chatId = update.getMessage().getChatId();
        } else if (update.hasCallbackQuery()) {
            chatId = update.getCallbackQuery().getMessage().getChatId();
        } else {
            return;
        }

        ExecutorService executor = chatExecutors.computeIfAbsent(
            chatId, id -> Executors.newSingleThreadExecutor(r -> {
                Thread t = new Thread(r, "bot-chat-" + id);
                t.setDaemon(true);
                return t;
            })
        );

        executor.submit(() -> processUpdate(update));
    }

    private void processUpdate(Update update) {
        String messageFromTelegram;
        long chatId;
        String username;
        String docFileId   = null;
        String docFileName = null;
        String docMimeType = null;

        if (update.hasMessage() && update.getMessage().hasText()) {
            messageFromTelegram = update.getMessage().getText();
            chatId = update.getMessage().getChatId();
            username = update.getMessage().getFrom() != null
                    ? update.getMessage().getFrom().getUserName()
                    : null;
        } else if (update.hasMessage() && update.getMessage().hasDocument()) {
            // Document message: use sentinel command so BotActions can handle it
            var doc = update.getMessage().getDocument();
            docFileId   = doc.getFileId();
            docFileName = doc.getFileName() != null ? doc.getFileName() : "document";
            docMimeType = doc.getMimeType();
            messageFromTelegram = "/uploaddoc";
            chatId = update.getMessage().getChatId();
            username = update.getMessage().getFrom() != null
                    ? update.getMessage().getFrom().getUserName()
                    : null;
        } else if (update.hasCallbackQuery()) {
            messageFromTelegram = update.getCallbackQuery().getData();
            chatId = update.getCallbackQuery().getMessage().getChatId();
            username = update.getCallbackQuery().getFrom().getUserName() != null
                    ? update.getCallbackQuery().getFrom().getUserName()
                    : null;

            try {
                telegramClient.execute(AnswerCallbackQuery.builder()
                        .callbackQueryId(update.getCallbackQuery().getId())
                        .build());
            } catch (TelegramApiException e) {
                logger.error(e.getLocalizedMessage(), e);
            }
        } else {
            return;
        }

        String telegramIdentity = (username != null && !username.trim().isEmpty())
                ? "@" + username : String.valueOf(chatId);

        BotActions actions = new BotActions(telegramClient, toDoItemService,
                groqService,
                userTTService, sprintTTService, projectTTService, projectUserTTService,
                sprintTaskTTService, taskTTService, featureTTService,
                luceneService, documentProcessingService, documentTTService);
        actions.setRequestText(messageFromTelegram);
        actions.setChatId(chatId);
        actions.setTelegramIdentity(telegramIdentity);
        if (docFileId != null) {
            actions.setDocumentInfo(docFileId, docFileName, docMimeType);
        }
        if (actions.getTodoService() == null) {
            logger.info("todosvc error");
            actions.setTodoService(toDoItemService);
        }

        actions.fnStart();
        actions.fnHide();
        actions.fnLogin();
        actions.fnRegister();
        actions.fnCancel();
        actions.fnPendingConversation();
        actions.fnShowDonePicker();
        actions.fnMarkTaskDone();
        actions.fnUndo();
        actions.fnMarkTaskUndo();
        actions.fnShowEditPicker();
        actions.fnEditPickTask();
        actions.fnShowEditFeaturePicker();
        actions.fnEditPickFeature();
        actions.fnStatus();
        actions.fnDone();
        actions.fnDelete();
        actions.fnListAll();
        actions.fnAddItem();
        actions.fnAddFeature();
        actions.fnAiCreate();
        actions.fnAsk();
        actions.fnImportTasks();
        actions.fnUploadDocument();
        actions.fnListDocs();
        actions.fnElse();
    }

    @AfterBotRegistration
    public void afterRegistration(BotSession botSession) {
        System.out.println("Registered bot running state is: " + botSession.isRunning());
    }

}
