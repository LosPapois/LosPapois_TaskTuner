package com.springboot.MyTodoList.util;

public enum BotMessages {

	HELLO_MYTODO_BOT(
	"Hello! I'm MyTodoList Bot!\nType a new todo item below and press the send button (blue arrow), or select an option below:"),
	BOT_REGISTERED_STARTED("Bot registered and started successfully!"),
	ITEM_DONE("Item done! Select /todolist to return to the list of todo items, or /start to go to the main screen."),
	ITEM_UNDONE("Item undone! Select /todolist to return to the list of todo items, or /start to go to the main screen."),
	ITEM_DELETED("Item deleted! Select /todolist to return to the list of todo items, or /start to go to the main screen."),
	TYPE_NEW_TODO_ITEM("Write the task name."),
	NEW_ITEM_ADDED("New item added! Select /todolist to return to the list of todo items, or /start to go to the main screen."),
	TYPE_REGISTER_NAME("Write your name to complete registration."),
	TYPE_REGISTER_EMAIL("Now write your email address."),
	TYPE_REGISTER_PASSWORD("Write your password:"),
	TYPE_REGISTER_PASSWORD_CONFIRM("Repeat your password to confirm it:"),
	PASSWORD_MISMATCH("The passwords don't match. Please enter your password again:"),
	REGISTER_COMPLETED("Registration completed successfully."),
	REGISTER_ALREADY_EXISTS("A registration already exists for this Telegram user."),
	INVALID_EMAIL("The email address doesn't look valid. Try again."),
	TYPE_NEW_ITEM_DESCRIPTION("Write a brief description for this task:"),
	TYPE_NEW_FEATURE_DESCRIPTION("Write a brief description for this feature:"),
	TYPE_NEW_ITEM_STORY_POINTS("Write the story points (integer number):"),
	INVALID_STORY_POINTS("Invalid value. Enter an integer number for story points:"),
	TYPE_NEW_ITEM_DATE_START("Write the start date (DD/MM/YYYY):"),
	TYPE_NEW_ITEM_DATE_END("Write the end date (DD/MM/YYYY):"),
	INVALID_DATE("Invalid date. Use the DD/MM/YYYY format:"),
	INVALID_DATE_RANGE("Date out of range. Use a date between 2022 and 2040 (DD/MM/YYYY):"),
	SELECT_PRIORITY("Select the priority level:"),
	SELECT_SPRINT("Select the sprint this task belongs to:"),
	NO_SPRINTS_CREATED("No sprints were available. Test sprints were created — try selecting them."),
	TASK_ADDED("Task added successfully to the sprint!"),
	USER_NOT_REGISTERED("You must register first with /register to add tasks."),
	SELECT_FEATURE("Select the feature this task belongs to:"),
	NO_FEATURES_FOR_SPRINT("No features found for this sprint. The task will be saved without a feature."),
	INVALID_DESCRIPTION("Description cannot be empty. Please write a description:"),
	TYPE_NEW_FEATURE_NAME("Write the name of the new feature:"),
	SELECT_FEATURE_PRIORITY("Select the feature priority:"),
	SELECT_FEATURE_SPRINT("Select the sprint this feature belongs to:"),
	FEATURE_ADDED("Feature created successfully!"),
	BYE("Bye! Select /start to resume!"),
	ASK_AI_PROMPT("🤖 I'm your AI assistant! Ask me anything or tell me what to do:\n• \"What should I work on next?\"\n• \"Add a bug fix task, high priority, 2 story points\"\n• \"Create a user authentication feature\"\n• \"How is the sprint going?\"\n• \"What's my progress this sprint?\""),
	ASK_AI_DISABLED("The AI assistant is currently unavailable."),
	ASK_AI_THINKING("🤔 Thinking..."),
	ASK_AI_EMPTY_QUESTION("Please type a project-related question."),
	AI_CREATE_PROMPT("🤖 Describe what you want to create. Examples:\n• \"Fix login bug, 3 story points, high priority\"\n• \"Feature: user authentication, medium priority\""),
	AI_CREATE_PARSING("🤔 Parsing your request..."),
	AI_CREATE_TASK_CONFIRM("✅ I'll create this task:\n%s\nSelect priority below (or cancel):"),
	AI_CREATE_FEATURE_CONFIRM("✅ I'll create this feature:\n%s\nSelect priority below (or cancel):"),
	AI_CREATE_UNKNOWN("❓ I could not understand what to create. Try again or use the manual buttons."),
	AI_CREATE_CONFIRMED("✅ Created! Now select the sprint:"),
	AI_CREATE_CANCELLED("❌ Creation cancelled."),
	IMPORT_PROMPT(
		"📥 *Import Tasks from Text*\n\n"
		+ "Paste your text below and the AI will extract tasks automatically.\n\n"
		+ "*Recommended format:*\n"
		+ "```\n"
		+ "- Fix login crash: button throws NullPointerException on submit [high, 2 pts]\n"
		+ "- Add dark mode: allow users to switch between light and dark themes [low, 3 pts]\n"
		+ "- Migrate DB schema: move user table from MySQL to PostgreSQL [critical, 8 pts]\n"
		+ "```\n"
		+ "Format: `- Name: description [priority, pts]`\n\n"
		+ "You can also paste meeting notes, a requirements doc, or any free-form text — "
		+ "the AI will find the action items.\n\n"
		+ "*Priority hints:* use words like `urgent`, `critical`, `blocker` for HIGH; "
		+ "`nice-to-have`, `optional`, `refactor` for LOW.\n"
		+ "*Story point hints:* include a number followed by `pts` or `points`.\n\n"
		+ "⚠️ *Warning:* all imported tasks will be assigned to a *single feature* "
		+ "(you will choose it in the next step). If your tasks belong to different features, "
		+ "import them separately.\n\n"
		+ "Type /cancel to abort."),
	IMPORT_PARSING("🤔 Extracting tasks from your text..."),
	IMPORT_NO_TASKS("❓ No tasks found in the text. Try again with more detail or create tasks manually."),
	IMPORT_PARSE_ERROR("❌ Failed to parse tasks. Try again or create tasks manually."),
	IMPORT_SELECT_SPRINT("Select the sprint for all imported tasks:"),
	IMPORT_SELECT_FEATURE("Select the feature for all imported tasks:"),
	IMPORT_CONFIRM("📋 Found *%d task(s)*:\n\n%s\nCreate all in the selected sprint and feature?"),
	IMPORT_SUCCESS("✅ Successfully created %d task(s)!"),
	IMPORT_CANCELLED("❌ Import cancelled."),
	DOC_UPLOAD_PROMPT("📎 Send me a document (PDF, DOCX, or TXT) and I will index it for RAG search."),
	DOC_UPLOAD_PROCESSING("⏳ Processing your document..."),
	DOC_UPLOAD_SUCCESS("✅ Document indexed! Use /ask to query it."),
	DOC_UPLOAD_FAILED("❌ Could not process the file. Check it's a valid PDF, DOCX, or TXT under 20 MB."),
	DOC_UPLOAD_NO_PROJECT("❌ You have no active project. Cannot index documents."),
	DOC_LIST_EMPTY("📂 No documents indexed for your project yet. Use /uploaddoc to add one."),
	DOC_RAG_CONTEXT_HEADER("📚 *Relevant context from your documents:*\n\n");

	private String message;

	BotMessages(String enumMessage) {
		this.message = enumMessage;
	}

	public String getMessage() {
		return message;
	}

}
