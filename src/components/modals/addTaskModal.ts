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

        // Initialize suggestion system with project change callback
        this.suggestionManager = new SuggestionManager(
            this.dataHandler,
            this.ui,
            async (projectName: string) => {
                const projectContexts = await this.getContextsForProject(projectName);
                this.dataHandler.updateAvailableContexts(projectContexts);
                this.suggestionManager.updateContextItems(projectContexts);
            }
        );

        // Set up input handling
        this.inputHandler = new TaskInputHandler(this.dataHandler, this.ui, this.suggestionManager);
    }

    // Get contexts for a specific project
    private async getContextsForProject(projectName: string): Promise<string[]> {
        try {
            // Get default todo file
            const files = this.app.vault.getFiles().filter(f => f.extension === 'txt');
            if (files.length === 0) return this.dataHandler.availableContexts;

            const file = files[0];
            const content = await this.app.vault.read(file);
            const lines = content.split('\n').filter(line => line.trim().length > 0);

            const contextsSet = new Set<string>();

            lines.forEach(line => {
                // Skip completed tasks
                if (line.trim().startsWith('x ')) {
                    return;
                }

                // Check if line has project
                if (line.includes(`+${projectName}`) || projectName === 'Inbox') {
                    // Remove notes section
                    let cleanLine = line;
                    const notesIndex = cleanLine.indexOf('||');
                    if (notesIndex !== -1) {
                        cleanLine = cleanLine.substring(0, notesIndex).trim();
                    }

                    // Remove metadata
                    cleanLine = cleanLine.replace(/^KATEX_INLINE_OPEN[A-Z]KATEX_INLINE_CLOSE\s+/, ''); // Priority
                    cleanLine = cleanLine.replace(/^\d{4}-\d{2}-\d{2}\s+/, ''); // Date

                    // Extract contexts at word boundaries only
                    const contextMatches = cleanLine.match(/(?:^|\s)@(\S+)/g);
                    if (contextMatches) {
                        contextMatches.forEach(match => {
                            const context = match.trim().substring(1);
                            contextsSet.add(context);
                        });
                    }
                }
            });

            return Array.from(contextsSet).sort();
        } catch (error) {
            console.error('Error fetching contexts for project:', error);
            return this.dataHandler.availableContexts;
        }
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
        this.ui.onProjectChange(async (project: string) => {
            this.dataHandler.selectedProject = project;
            const projectContexts = await this.getContextsForProject(project);
            this.dataHandler.updateAvailableContexts(projectContexts);
            this.suggestionManager.updateContextItems(projectContexts);
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