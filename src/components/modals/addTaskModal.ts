import { App, Modal } from 'obsidian';
import { TodoItem } from '../../types';
import { TaskModalUI } from './taskModalUI';
import { TaskDataHandler } from './taskDataHandler';
import { SuggestionManager } from '../suggestions/suggestionManager';
import { TaskInputHandler } from '../suggestions/taskInputHandler';

export class AddTaskModal extends Modal {
    // Modal components
    private ui: TaskModalUI;
    private dataHandler: TaskDataHandler;
    private suggestionManager: SuggestionManager;
    private inputHandler: TaskInputHandler;
    private onSubmit: (taskLine: string) => void;
    private onDelete?: () => void;
    private isEditMode: boolean = false;

    constructor(
        app: App,
        onSubmit: (taskLine: string) => void,
        availableProjects: string[] = [],
        availableContexts: string[] = [],
        editingItem?: TodoItem,
        onDelete?: () => void,
        preselectedProject?: string,
        defaultDueDate?: string
    ) {
        super(app);
        this.modalEl.addClass('todo-task-mod');
        this.onSubmit = onSubmit;
        this.onDelete = onDelete;
        this.isEditMode = !!editingItem;

        // Initialize data handler
        this.dataHandler = new TaskDataHandler(
            availableProjects,
            availableContexts,
            editingItem,
            preselectedProject,
            defaultDueDate
        );

        // Create UI component
        this.ui = new TaskModalUI(
            this.contentEl,
            this.isEditMode,
            this.dataHandler,
            () => this.submitTask(),
            this.onDelete ? () => { this.onDelete!(); this.close(); } : undefined,
            () => this.close()
        );

        // Initialize suggestion system
        this.suggestionManager = new SuggestionManager(this.dataHandler, this.ui);

        // Set up input handling
        this.inputHandler = new TaskInputHandler(this.dataHandler, this.ui, this.suggestionManager);
    }

    // Set up modal UI and event handlers
    onOpen() {
        this.ui.render();

        // Handle text input changes
        this.ui.onTaskDescriptionChange((value: string, cursorPosition: number) => {
            this.inputHandler.handleTaskDescriptionChange(value, cursorPosition);
        });

        // Handle keyboard events
        this.ui.onKeyDown((e: KeyboardEvent) => {
            this.inputHandler.handleKeyDown(e, () => this.submitTask());
        });

        this.ui.onKeyUp((e: KeyboardEvent) => {
            this.inputHandler.handleKeyUp(e);
        });

        // Handle project selection
        this.ui.onProjectChange((project: string) => {
            this.dataHandler.selectedProject = project;
        });

        // Handle priority changes
        this.ui.onPriorityChange((priority: string) => {
            this.dataHandler.priority = priority;
            this.dataHandler.isFirstTimePriority = false;
        });

        // Handle date changes
        this.ui.onDateChange((date: string) => {
            this.dataHandler.dueDate = date;
        });

        // Handle notes changes
        this.ui.onTaskDescriptionNotesChange((value: string) => {
            this.dataHandler.taskDescriptionNotes = value;
        });

        // Focus input after render
        setTimeout(() => this.ui.focusInput(), 100);
    }

    // Build and submit task line
    private submitTask(): void {
        const taskLine = this.dataHandler.buildTaskLine();
        if (taskLine) {
            this.onSubmit(taskLine);
            this.close();
        }
    }

    // Clean up modal resources
    onClose() {
        this.contentEl.empty();
        this.suggestionManager.cleanup();
    }
}