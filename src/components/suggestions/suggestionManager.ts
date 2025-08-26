import { SuggestionHandler } from './suggestionHandler';
import { TaskDataHandler } from '../modals/taskDataHandler';
import { TaskModalUI } from '../modals/taskModalUI';
import { calculateDueDate, getRepeatSyntax } from '../../utils/dateUtils';

export class SuggestionManager {
    // Individual suggestion handlers
    contextHandler: SuggestionHandler;
    priorityHandler: SuggestionHandler;
    projectHandler: SuggestionHandler;
    dueDateHandler: SuggestionHandler;
    mainMenuHandler: SuggestionHandler;

    private activeHandler: SuggestionHandler | null = null;
    private isInRepeatMode: boolean = false;
    private mainMenuMode: string = '';

    constructor(
        private dataHandler: TaskDataHandler,
        private ui: TaskModalUI,
        private onProjectChange?: (projectName: string) => Promise<void>
    ) {
        this.contextHandler = this.createContextHandler();
        this.priorityHandler = this.createPriorityHandler();
        this.projectHandler = this.createProjectHandler();
        this.dueDateHandler = this.createDueDateHandler();
        this.mainMenuHandler = this.createMainMenuHandler();
    }

    // Create context suggestions handler (@)
    private createContextHandler(): SuggestionHandler {
        return new SuggestionHandler({
            type: 'context',
            items: this.dataHandler.availableContexts,
            symbol: '@',
            onSelect: (context: string, symbolPosition: number, cursorPosition: number) => {
                const input = this.ui.getTaskInputElement();
                if (!input) return true;

                const value = input.value;
                const beforeAt = value.substring(0, symbolPosition);
                const afterCursor = value.substring(cursorPosition);

                // Insert context tag
                const newValue = beforeAt + `@${context} ` + afterCursor;
                input.value = newValue;
                this.dataHandler.taskDescription = newValue;

                // Position cursor after context
                const newCursorPosition = symbolPosition + context.length + 2;
                input.setSelectionRange(newCursorPosition, newCursorPosition);
                input.focus();

                this.activeHandler = null;
                return true;
            }
        });
    }

    // Create priority suggestions handler (!)
    private createPriorityHandler(): SuggestionHandler {
        return new SuggestionHandler({
            type: 'priority',
            items: ['A', 'B', 'C', ''],
            symbol: '!',
            // Allow searching by priority name
            customFilter: (item: string, searchTerm: string) => {
                const priorityMap: { [key: string]: string } = {
                    'A': 'high',
                    'B': 'medium',
                    'C': 'low',
                    '': 'none'
                };
                const displayText = priorityMap[item] || item.toLowerCase();
                const searchLower = searchTerm.toLowerCase();
                return item.toLowerCase().includes(searchLower) || displayText.includes(searchLower);
            },
            onSelect: (priority: string, symbolPosition: number, cursorPosition: number) => {
                const input = this.ui.getTaskInputElement();
                if (!input) return true;

                const value = input.value;
                const beforeExclamation = value.substring(0, symbolPosition);
                const afterCursor = value.substring(cursorPosition);

                // Remove symbol from text
                const newValue = beforeExclamation + afterCursor;
                input.value = newValue;
                this.dataHandler.taskDescription = newValue;

                // Set priority in UI
                this.dataHandler.priority = priority;
                this.ui.updatePriority(priority);

                input.setSelectionRange(symbolPosition, symbolPosition);
                input.focus();

                this.activeHandler = null;
                return true;
            }
        });
    }

    // Create project suggestions handler (+)
    private createProjectHandler(): SuggestionHandler {
        const projectsForSuggestion = this.getOrderedProjectsForSuggestions();

        return new SuggestionHandler({
            type: 'project',
            items: projectsForSuggestion,
            symbol: '+',
            onSelect: (project: string, symbolPosition: number, cursorPosition: number) => {
                const input = this.ui.getTaskInputElement();
                if (!input) return true;

                const value = input.value;
                const beforePlus = value.substring(0, symbolPosition);
                const afterCursor = value.substring(cursorPosition);

                // Remove symbol from text
                const newValue = beforePlus + afterCursor;
                input.value = newValue;
                this.dataHandler.taskDescription = newValue;

                // Set project in UI
                this.dataHandler.selectedProject = project;
                this.ui.updateProject(project);

                // Trigger context update if callback provided (non-blocking)
                if (this.onProjectChange) {
                    this.onProjectChange(project).catch(error => {
                        console.error('Error updating contexts for project:', error);
                    });
                }

                input.setSelectionRange(symbolPosition, symbolPosition);
                input.focus();

                this.activeHandler = null;
                return true;
            }
        });
    }

    // Get projects in order
    private getOrderedProjectsForSuggestions(): string[] {
        const availableProjects = [...this.dataHandler.availableProjects];
        const orderedProjects: string[] = [];

        // Inbox first
        orderedProjects.push('Inbox');

        // Other projects
        const otherProjects = availableProjects.filter(project =>
            project !== 'Inbox' && project !== 'Archived'
        );
        orderedProjects.push(...otherProjects);

        // Archived last
        orderedProjects.push('Archived');

        return orderedProjects;
    }

    // Create due date suggestions handler (*)
    private createDueDateHandler(): SuggestionHandler {
        return new SuggestionHandler({
            type: 'priority',
            items: ['Today', 'Tomorrow', 'Next Week', 'Next Month', 'Repeat'],
            symbol: '*',
            onSelect: (option: string, symbolPosition: number, cursorPosition: number) => {
                const input = this.ui.getTaskInputElement();
                if (!input) return true;

                const value = input.value;
                const beforeSymbol = value.substring(0, symbolPosition);
                const afterCursor = value.substring(cursorPosition);

                // Enter repeat mode
                if (option === 'Repeat' && !this.isInRepeatMode) {
                    this.isInRepeatMode = true;
                    this.dueDateHandler.updateItems(['Daily', 'Weekly', 'Monthly', 'Yearly']);
                    const searchTerm = value.substring(symbolPosition + 1, cursorPosition).toLowerCase();
                    this.dueDateHandler.showSuggestions(searchTerm, input, cursorPosition);
                    return false;
                }

                // Handle repeat selection
                if (this.isInRepeatMode) {
                    const repeatSyntax = getRepeatSyntax(option);
                    const newValue = beforeSymbol + repeatSyntax + ' ' + afterCursor;
                    input.value = newValue;
                    this.dataHandler.taskDescription = input.value;

                    this.isInRepeatMode = false;
                    this.dueDateHandler.updateItems(['Today', 'Tomorrow', 'Next Week', 'Next Month', 'Repeat']);

                    const newPosition = beforeSymbol.length + repeatSyntax.length + 1;
                    input.setSelectionRange(newPosition, newPosition);
                    input.focus();

                    this.activeHandler = null;
                    return true;
                } else {
                    // Handle date selection
                    const dueDate = calculateDueDate(option);
                    input.value = beforeSymbol + afterCursor;
                    this.dataHandler.taskDescription = input.value;

                    this.dataHandler.dueDate = dueDate;
                    this.ui.updateDueDate(dueDate);

                    input.setSelectionRange(symbolPosition, symbolPosition);
                    input.focus();

                    this.activeHandler = null;
                    return true;
                }
            }
        });
    }

    // Create main menu handler (/)
    private createMainMenuHandler(): SuggestionHandler {
        return new SuggestionHandler({
            type: 'priority',
            items: ['Date', 'Priority', 'Project', 'Context'],
            symbol: '/',
            getDisplayText: (item: string) => {
                if (this.mainMenuMode === 'Project') {
                    return item.replace(/_/g, ' ');
                }
                return item;
            },
            onSelect: (option: string, symbolPosition: number, cursorPosition: number) => {
                const input = this.ui.getTaskInputElement();
                if (!input) return true;

                const value = input.value;
                const beforeSymbol = value.substring(0, symbolPosition);
                const afterCursor = value.substring(cursorPosition);

                if (this.mainMenuMode) {
                    return this.handleMainMenuSubmenuSelection(
                        option,
                        symbolPosition,
                        cursorPosition,
                        beforeSymbol,
                        afterCursor,
                        input
                    );
                } else {
                    return this.handleMainMenuSelection(option, value, symbolPosition, cursorPosition, input);
                }
            }
        });
    }

    // Handle submenu selections
    private handleMainMenuSubmenuSelection(
        option: string,
        symbolPosition: number,
        cursorPosition: number,
        beforeSymbol: string,
        afterCursor: string,
        input: HTMLTextAreaElement
    ): boolean {
        // Enter repeat submenu
        if (this.mainMenuMode === 'Date' && option === 'Repeat') {
            this.mainMenuHandler.updateItems(['Daily', 'Weekly', 'Monthly', 'Yearly']);
            this.mainMenuMode = 'Date-Repeat';
            const searchTerm = input.value.substring(symbolPosition + 1, cursorPosition).toLowerCase();
            this.mainMenuHandler.showSuggestions(searchTerm, input, cursorPosition);
            return false;
        }

        switch (this.mainMenuMode) {
            case 'Date':
                const dueDate = calculateDueDate(option);
                input.value = beforeSymbol + afterCursor;
                this.dataHandler.taskDescription = input.value;
                this.dataHandler.dueDate = dueDate;
                this.ui.updateDueDate(dueDate);
                input.setSelectionRange(symbolPosition, symbolPosition);
                input.focus();
                break;

            case 'Date-Repeat':
                const repeatSyntax = getRepeatSyntax(option);
                const newValue = beforeSymbol + repeatSyntax + ' ' + afterCursor;
                input.value = newValue;
                this.dataHandler.taskDescription = input.value;
                const newPosition = beforeSymbol.length + repeatSyntax.length + 1;
                input.setSelectionRange(newPosition, newPosition);
                input.focus();
                break;

            case 'Priority':
                // Map display names to priority values
                const priorityMap: { [key: string]: string } = {
                    'High': 'A',
                    'Medium': 'B',
                    'Low': 'C',
                    'None': ''
                };
                const priority = priorityMap[option] || '';
                input.value = beforeSymbol + afterCursor;
                this.dataHandler.taskDescription = input.value;
                this.dataHandler.priority = priority;
                this.ui.updatePriority(priority);
                input.setSelectionRange(symbolPosition, symbolPosition);
                input.focus();
                break;

            case 'Project':
                input.value = beforeSymbol + afterCursor;
                this.dataHandler.taskDescription = input.value;
                this.dataHandler.selectedProject = option;
                this.ui.updateProject(option);

                // Trigger context update if callback provided (non-blocking)
                if (this.onProjectChange) {
                    this.onProjectChange(option).catch(error => {
                        console.error('Error updating contexts for project:', error);
                    });
                }

                input.setSelectionRange(symbolPosition, symbolPosition);
                input.focus();
                break;

            case 'Context':
                // Insert context tag in text
                const ctxValue = beforeSymbol + `@${option} ` + afterCursor;
                input.value = ctxValue;
                this.dataHandler.taskDescription = input.value;
                const ctxPosition = symbolPosition + option.length + 2;
                input.setSelectionRange(ctxPosition, ctxPosition);
                input.focus();
                break;
        }

        // Reset menu state
        this.mainMenuMode = '';
        this.mainMenuHandler.updateItems(['Date', 'Priority', 'Project', 'Context']);
        this.activeHandler = null;
        return true;
    }

    // Handle main menu category selection
    private handleMainMenuSelection(
        option: string,
        value: string,
        symbolPosition: number,
        cursorPosition: number,
        input: HTMLTextAreaElement
    ): boolean {
        this.mainMenuMode = option;

        // Update items for selected category
        switch (option) {
            case 'Date':
                this.mainMenuHandler.updateItems(['Today', 'Tomorrow', 'Next Week', 'Next Month', 'Repeat']);
                break;
            case 'Priority':
                this.mainMenuHandler.updateItems(['High', 'Medium', 'Low', 'None']);
                break;
            case 'Project':
                const projectsForMenu = this.getOrderedProjectsForSuggestions();
                this.mainMenuHandler.updateItems(projectsForMenu);
                break;
            case 'Context':
                this.mainMenuHandler.updateItems(this.dataHandler.availableContexts);
                break;
        }

        // Show submenu
        const searchTerm = value.substring(symbolPosition + 1, cursorPosition).toLowerCase();
        this.mainMenuHandler.showSuggestions(searchTerm, input, cursorPosition);
        return false;
    }

    getActiveHandler(): SuggestionHandler | null {
        return this.activeHandler;
    }

    setActiveHandler(handler: SuggestionHandler | null): void {
        this.activeHandler = handler;
    }

    // Reset all mode states
    resetModes(): void {
        if (this.isInRepeatMode) {
            this.isInRepeatMode = false;
            this.dueDateHandler.updateItems(['Today', 'Tomorrow', 'Next Week', 'Next Month', 'Repeat']);
        }

        if (this.mainMenuMode) {
            this.mainMenuMode = '';
            this.mainMenuHandler.updateItems(['Date', 'Priority', 'Project', 'Context']);
        }
    }

    // Update context handler with new items
    updateContextItems(newContexts: string[]): void {
        this.contextHandler.updateItems(newContexts);

        if (this.mainMenuMode === 'Context') {
            this.mainMenuHandler.updateItems(newContexts);
        }
    }

    // Clean up all handlers
    cleanup(): void {
        this.contextHandler.cleanup();
        this.priorityHandler.cleanup();
        this.projectHandler.cleanup();
        this.dueDateHandler.cleanup();
        this.mainMenuHandler.cleanup();
        this.resetModes();
    }
}