import { TodoItem } from '../../types';
import { TaskDataHandler } from './taskDataHandler';

export class TaskModalUI {
    private contentEl: HTMLElement;
    private isEditMode: boolean;
    private dataHandler: TaskDataHandler;
    private onSubmit: () => void;
    private onDelete?: () => void;
    private onCancel?: () => void;

    // UI element references
    private taskDescriptionInput: HTMLTextAreaElement | null = null;
    private priorityDropdown: HTMLSelectElement | null = null;
    private projectDropdown: HTMLSelectElement | null = null;
    private datePicker: HTMLInputElement | null = null;
    private taskDescriptionNotes: HTMLTextAreaElement | null = null;

    constructor(
        contentEl: HTMLElement,
        isEditMode: boolean,
        dataHandler: TaskDataHandler,
        onSubmit: () => void,
        onDelete?: () => void,
        onCancel?: () => void
    ) {
        this.contentEl = contentEl;
        this.isEditMode = isEditMode;
        this.dataHandler = dataHandler;
        this.onSubmit = onSubmit;
        this.onDelete = onDelete;
        this.onCancel = onCancel;
    }

    // Check if device is mobile
    private isMobile(): boolean {
        return window.innerWidth <= 768;
    }

    // Create complete modal UI
    render(): void {
        this.contentEl.empty();

        // Main task input
        const inputContainer = this.contentEl.createDiv('task-input-container');
        const taskInput = inputContainer.createEl('textarea');
        taskInput.addClass('task-input-field');
        taskInput.setAttribute('rows', '1');
        taskInput.setAttribute('placeholder', 'Next thing to do');
        taskInput.value = this.dataHandler.taskDescription;
        this.taskDescriptionInput = taskInput;

        // Handle Enter key submission
        taskInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                if (this.isMobile()) {
                    e.preventDefault();
                    this.onSubmit();
                } else {
                    e.preventDefault();
                }
            }
        });

        // Description notes input
        const descriptionContainer = inputContainer.createDiv('task-description-container');
        const descriptionInput = descriptionContainer.createEl('textarea');
        descriptionInput.addClass('task-description-field');
        descriptionInput.setAttribute('rows', '2');
        descriptionInput.setAttribute('placeholder', 'Description');
        descriptionInput.value = this.dataHandler.taskDescriptionNotes || '';
        this.taskDescriptionNotes = descriptionInput;

        // Handle Enter for notes
        descriptionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                if (!this.isMobile()) {
                    e.preventDefault();
                    this.onSubmit();
                }
            }
        });

        // Bottom controls section
        const bottomContainer = this.contentEl.createDiv('modal-bottom-container');
        const leftContainer = bottomContainer.createDiv('left-container');

        this.createProjectDropdown(leftContainer);
        this.createPriorityDropdown(leftContainer);
        this.createDatePicker(leftContainer);

        this.createButtons(bottomContainer);
    }

    // Create project selection dropdown
    private createProjectDropdown(container: HTMLElement): void {
        const projectContainer = container.createDiv('dropdown-container');
        const projectSelect = projectContainer.createEl('select');
        projectSelect.addClass('modal-dropdown');
        this.projectDropdown = projectSelect;

        // Add default projects
        projectSelect.createEl('option', { value: 'Inbox', text: 'Inbox' });
        projectSelect.createEl('option', { value: 'Archived', text: 'Archived' });

        // Add available projects
        this.dataHandler.availableProjects
            .filter(p => p !== 'Inbox' && p !== 'Archived')
            .forEach(project => {
                projectSelect.createEl('option', {
                    value: project,
                    text: project.replace(/_/g, ' ')
                });
            });

        projectSelect.value = this.dataHandler.selectedProject;
    }

    // Create priority selection dropdown
    private createPriorityDropdown(container: HTMLElement): void {
        const priorityContainer = container.createDiv('dropdown-container');
        const prioritySelect = priorityContainer.createEl('select');
        prioritySelect.addClass('modal-dropdown');
        this.priorityDropdown = prioritySelect;

        // Add placeholder for new tasks
        if ((this.dataHandler.isFirstTimePriority && !this.isEditMode) ||
            (this.isEditMode && !this.dataHandler.priority)) {
            const defaultOption = prioritySelect.createEl('option', {
                value: '',
                text: 'Priority'
            });
            defaultOption.disabled = true;
            defaultOption.hidden = true;
            defaultOption.addClass('default-option');
        }

        // Add standard priorities
        const priorities = [
            { value: 'A', text: 'High' },
            { value: 'B', text: 'Medium' },
            { value: 'C', text: 'Low' },
            { value: '', text: 'None' }
        ];

        priorities.forEach(p => prioritySelect.createEl('option', p));

        // Add custom priority if needed
        if (this.dataHandler.priority && !['A', 'B', 'C', ''].includes(this.dataHandler.priority)) {
            prioritySelect.createEl('option', {
                value: this.dataHandler.priority,
                text: `Priority ${this.dataHandler.priority}`
            });
        }

        if (this.dataHandler.priority) {
            prioritySelect.value = this.dataHandler.priority;
        }
    }

    // Create due date picker
    private createDatePicker(container: HTMLElement): void {
        const dateContainer = container.createDiv('dropdown-container');
        const dateInput = dateContainer.createEl('input', { type: 'date' });
        dateInput.addClass('modal-date-picker');
        this.datePicker = dateInput;

        if (this.dataHandler.dueDate) {
            dateInput.value = this.dataHandler.dueDate;
        }
    }

    // Create action buttons
    private createButtons(container: HTMLElement): void {
        const buttonsContainer = container.createDiv('buttons-container');

        // Delete button for edit mode
        if (this.isEditMode && this.onDelete) {
            const deleteButton = buttonsContainer.createEl('button', { text: 'Delete' });
            deleteButton.addClass('delete-button');
            deleteButton.addEventListener('click', () => this.onDelete!());
        }

        // Cancel button for new tasks
        if (!this.isEditMode) {
            const cancelButton = buttonsContainer.createEl('button', { text: 'Cancel' });
            cancelButton.addClass('cancel-button');
            cancelButton.addEventListener('click', () => {
                if (this.onCancel) {
                    this.onCancel();
                }
            });
        }

        // Submit button
        const submitButton = buttonsContainer.createEl('button', {
            text: this.isEditMode ? 'Update' : 'Add'
        });
        submitButton.addClass('add-button');
        submitButton.addEventListener('click', this.onSubmit);
    }

    // Set up task description change handler
    onTaskDescriptionChange(handler: (value: string, cursorPosition: number) => void): void {
        this.taskDescriptionInput?.addEventListener('input', (e) => {
            const target = e.target as HTMLTextAreaElement;
            handler(target.value, target.selectionStart || 0);
        });
    }

    // Set up key down handler
    onKeyDown(handler: (e: KeyboardEvent) => void): void {
        this.taskDescriptionInput?.addEventListener('keydown', handler);
    }

    // Set up key up handler
    onKeyUp(handler: (e: KeyboardEvent) => void): void {
        this.taskDescriptionInput?.addEventListener('keyup', handler);
    }

    // Set up project change handler
    onProjectChange(handler: (value: string) => void): void {
        this.projectDropdown?.addEventListener('change', (e) => {
            handler((e.target as HTMLSelectElement).value);
        });
    }

    // Set up priority change handler
    onPriorityChange(handler: (value: string) => void): void {
        this.priorityDropdown?.addEventListener('change', (e) => {
            handler((e.target as HTMLSelectElement).value);
            // Remove placeholder option
            const defaultOption = this.priorityDropdown?.querySelector('.default-option');
            if (defaultOption) {
                defaultOption.remove();
            }
        });
    }

    // Set up date change handler
    onDateChange(handler: (value: string) => void): void {
        this.datePicker?.addEventListener('change', (e) => {
            handler((e.target as HTMLInputElement).value);
        });
    }

    // Update priority dropdown selection
    updatePriority(priority: string): void {
        if (this.priorityDropdown) {
            // Remove placeholder
            const defaultOption = this.priorityDropdown.querySelector('.default-option');
            if (defaultOption) {
                defaultOption.remove();
            }

            // Add custom priority option if needed
            if (!['A', 'B', 'C', ''].includes(priority)) {
                const existing = this.priorityDropdown.querySelector(`option[value="${priority}"]`);
                if (!existing) {
                    const customOption = this.priorityDropdown.createEl('option', {
                        value: priority,
                        text: `Priority ${priority}`
                    });
                    const noneOption = this.priorityDropdown.querySelector('option[value=""]');
                    if (noneOption) {
                        this.priorityDropdown.insertBefore(customOption, noneOption);
                    }
                }
            }

            this.priorityDropdown.value = priority;
        }

        // Update input text
        if (this.taskDescriptionInput) {
            this.taskDescriptionInput.value = this.dataHandler.taskDescription;
        }
    }

    // Insert context at cursor position
    insertContextAtPosition(context: string, atPosition: number): void {
        this.insertTextAtPosition(context, atPosition, '@');
    }

    getTaskDescription(): string {
        return this.taskDescriptionInput?.value || '';
    }

    getTaskInputElement(): HTMLTextAreaElement | null {
        return this.taskDescriptionInput;
    }

    // Focus main input field
    focusInput(): void {
        this.taskDescriptionInput?.focus();
    }

    // Set up notes change handler
    onTaskDescriptionNotesChange(handler: (value: string) => void): void {
        this.taskDescriptionNotes?.addEventListener('input', (e) => {
            handler((e.target as HTMLTextAreaElement).value);
        });
    }

    getTaskDescriptionNotes(): string {
        return this.taskDescriptionNotes?.value || '';
    }

    // Update project dropdown selection
    updateProject(project: string): void {
        if (this.projectDropdown) {
            this.projectDropdown.value = project;
        }
    }

    // Insert text at specific position in input
    insertTextAtPosition(text: string, symbolPosition: number, symbol: string): void {
        if (!this.taskDescriptionInput) return;

        const input = this.taskDescriptionInput;
        const value = input.value;
        const cursorPosition = input.selectionStart || 0;

        const searchTerm = value.substring(symbolPosition + 1, cursorPosition);

        const beforeSymbol = value.substring(0, symbolPosition);
        const afterCursor = value.substring(cursorPosition);

        // Build new value with inserted text
        const newValue = beforeSymbol + symbol + text + ' ' + afterCursor;
        input.value = newValue;

        // Position cursor after inserted text
        const newCursorPosition = symbolPosition + symbol.length + text.length + 1;
        input.setSelectionRange(newCursorPosition, newCursorPosition);
        input.focus();

        this.dataHandler.taskDescription = input.value;
    }

    // Update date picker value
    updateDueDate(date: string): void {
        if (this.datePicker) {
            this.datePicker.value = date;
        }
    }
}