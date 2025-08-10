import { TodoItem } from '../../types';
import { DateUtils } from '../../utils/dateUtils';
import { Icons, createSVGElement } from '../../utils/icons';
import { TaskManager } from '../../managers/taskManager';
import { ProjectManager } from '../../managers/projectManager';

export class TaskItem {
    constructor(
        private taskManager: TaskManager,
        private projectManager: ProjectManager,
        private filterManager: any,
        private onSearchTag: (tag: string) => void
    ) { }

    // Render complete task item
    render(container: HTMLElement, item: TodoItem): void {
        const todoEl = container.createDiv('todo-item');
        if (item.completed || item.projects.includes('Archived')) {
            todoEl.addClass('completed');
        }

        this.renderCheckbox(todoEl, item);
        this.renderContent(todoEl, item);

        // Open edit modal on click
        todoEl.addEventListener('click', (e) => {
            const target = e.target as HTMLElement;
            if (!target.classList.contains('todo-checkbox')) {
                this.taskManager.editTask(
                    item,
                    this.projectManager.getAvailableProjects(),
                    this.filterManager.getAvailableContexts()
                );
            }
        });
    }

    // Render completion checkbox
    private renderCheckbox(container: HTMLElement, item: TodoItem): void {
        const checkbox = container.createEl('input', { type: 'checkbox' });
        checkbox.checked = item.completed || item.projects.includes('Archived');
        checkbox.addClass('todo-checkbox');

        // Apply priority styling
        const priorityForDisplay = this.getPriorityForDisplay(item);
        if (priorityForDisplay) {
            if (['A', 'B', 'C'].includes(priorityForDisplay)) {
                checkbox.addClass(`priority-${priorityForDisplay.toLowerCase()}`);
            } else {
                checkbox.addClass('priority-other');
            }
        }

        // Handle checkbox changes
        checkbox.addEventListener('change', async (event) => {
            const isChecked = (event.target as HTMLInputElement).checked;
            if (item.projects.includes('Archived')) {
                if (!isChecked) {
                    await this.taskManager.moveTaskFromArchived(item);
                }
            } else {
                if (isChecked) {
                    await this.taskManager.completeTask(item);
                } else {
                    await this.taskManager.uncompleteTask(item);
                }
            }
        });
    }

    // Render task content and metadata
    private renderContent(container: HTMLElement, item: TodoItem): void {
        const contentEl = container.createDiv('todo-content');
        const mainLine = contentEl.createDiv('todo-main');

        // Check what metadata we have
        const dueMatch = item.description.match(/due:(\d{4}-\d{2}-\d{2})/);
        const hasDueDate = dueMatch && !item.completed;
        const hasDescriptionNotes = !!item.descriptionNotes;
        const hasKeyValuePairs = Object.keys(item.keyValuePairs).filter(k => k !== 'pri' && k !== 'due').length > 0;

        // Check if we're on mobile
        const isMobile = window.innerWidth <= 768;

        // Main description line
        const descriptionLine = mainLine.createDiv('todo-description-line');
        const descriptionEl = descriptionLine.createDiv('todo-description');
        this.renderFormattedDescription(descriptionEl, item);

        // Show projects inline if not mobile and no metadata
        if (!item.completed && !hasDueDate && !hasDescriptionNotes && !hasKeyValuePairs && item.projects.length > 0 && !isMobile) {
            this.renderInlineProjects(descriptionLine, item.projects, item);
        }

        // Description notes section
        if (hasDescriptionNotes) {
            const descriptionNotesLine = mainLine.createDiv('todo-description-notes-line');
            const descriptionNotesEl = descriptionNotesLine.createDiv('task-description-notes');
            this.renderFormattedDescriptionNotes(descriptionNotesEl, item.descriptionNotes || '');

            if (!item.completed && !hasDueDate && !hasKeyValuePairs && item.projects.length > 0 && !isMobile) {
                this.renderInlineProjects(descriptionNotesLine, item.projects, item);
            }
        }

        // Metadata section
        if (hasDueDate || hasKeyValuePairs || item.completionDate || (item.completed && item.projects.length > 0) || (isMobile && item.projects.length > 0)) {
            const shouldRenderProjectsInMeta = item.completed || hasDueDate || hasKeyValuePairs || isMobile;
            this.renderMetadata(contentEl, item, shouldRenderProjectsInMeta);
        }
    }

    // Format description with clickable elements
    private renderFormattedDescription(container: HTMLElement, item: TodoItem): void {
        let displayDescription = item.description;

        // Hide priority for completed tasks
        if (item.completed) {
            displayDescription = displayDescription.replace(/\s+pri:[A-Z]\b/g, '').trim();
        }

        const parts = displayDescription.split(/(\s+)/);

        parts.forEach(part => {
            if (part.trim() === '') {
                container.appendChild(document.createTextNode(part));
            } else if (part.startsWith('+') && part.match(/^\+\w+/)) {
                // Skip project tags
                return;
            } else if (part.startsWith('@') && part.match(/^@\w+/)) {
                // Render context
                const contextEl = container.createSpan('context-tag');
                contextEl.setText(part.substring(1));
            } else if (part.startsWith('#')) {
                // Render clickable hashtag
                const hashtagEl = container.createSpan('hashtag-tag');
                hashtagEl.setText(part);
                hashtagEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.onSearchTag(part);
                });
            } else if (part.includes(':') && !part.includes(' ') && !part.startsWith('http')) {
                const [key, value] = part.split(':', 2);
                if (key === 'rec') {
                    return;
                }
                // Skip only if valid key:value pair
                if (value && value.trim()) {
                    return;
                } else {
                    // Treat as text if no value after colon
                    container.appendChild(document.createTextNode(part));
                }
            } else if (part.match(/https?:\/\/[^\s]+/)) {
                // Render clickable link
                const linkEl = container.createEl('a', {
                    href: part,
                    text: part
                });
                linkEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(part, '_blank');
                });
            } else {
                container.appendChild(document.createTextNode(part));
            }
        });
    }

    // Format description notes with links
    private renderFormattedDescriptionNotes(container: HTMLElement, descriptionNotes: string): void {
        const parts = descriptionNotes.split(/(\s+)/);

        parts.forEach(part => {
            if (part.match(/https?:\/\/[^\s]+/)) {
                // Render clickable links
                const linkEl = container.createEl('a', {
                    href: part,
                    text: part
                });
                linkEl.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(part, '_blank');
                });
            } else {
                container.appendChild(document.createTextNode(part));
            }
        });
    }

    // Render projects inline with description
    private renderInlineProjects(container: HTMLElement, projects: string[], item: TodoItem): void {
        const inlineProjectsEl = container.createDiv('todo-projects-inline');
        projects.forEach(project => {
            const projectEl = inlineProjectsEl.createSpan('todo-project-meta');

            const displayProject = this.getDisplayProject(project, item);
            const textSpan = projectEl.createSpan('todo-project-text');
            textSpan.setText(displayProject.replace(/_/g, ' '));

            const iconSpan = projectEl.createSpan('todo-project-icon');
            const icon = this.getProjectIcon(displayProject);

            if (icon.includes('<svg')) {
                const svgElement = createSVGElement(icon);
                iconSpan.appendChild(svgElement);
            } else {
                iconSpan.setText(icon);
            }
        });
    }

    // Render task metadata section
    private renderMetadata(container: HTMLElement, item: TodoItem, renderProjects: boolean = true): void {
        const metaEl = container.createDiv('todo-meta');
        const metaLeft = metaEl.createDiv('todo-meta-left');
        const metaRight = metaEl.createDiv('todo-meta-right');

        // Show completion date
        if (item.completed && item.completionDate) {
            const formattedDate = DateUtils.formatDate(item.completionDate);
            const completionDateEl = metaLeft.createSpan('todo-date completion-date');
            completionDateEl.setText(formattedDate);
        }

        // Show creation date for archived tasks
        if (item.projects.includes('Archived') && !item.completed && item.creationDate) {
            const formattedDate = DateUtils.formatDate(item.creationDate);
            const creationDateEl = metaLeft.createSpan('todo-date creation-date');
            creationDateEl.setText(formattedDate);
        }

        // Show due date with status
        const dueMatch = item.description.match(/due:(\d{4}-\d{2}-\d{2})/);
        if (dueMatch && !item.completed) {
            const dueDateValue = dueMatch[1];
            const formattedDate = DateUtils.formatDate(dueDateValue);
            const dueDateStatus = DateUtils.getDueDateStatus(dueDateValue);

            const dueDateEl = metaLeft.createSpan('todo-due-date');
            dueDateEl.appendText(formattedDate);

            // Show repeat icon for recurring tasks
            const hasRecurrence = item.keyValuePairs.rec || item.description.includes('rec:');
            if (hasRecurrence) {
                const repeatIcon = dueDateEl.createSpan('repeat-icon');
                const repeatSvg = createSVGElement(Icons.repeat);
                repeatIcon.appendChild(repeatSvg);
            }

            if (dueDateStatus) {
                dueDateEl.addClass(dueDateStatus);
            }
        }

        // Show generic completion status
        if (item.completed && !item.completionDate) {
            const completionDateEl = metaLeft.createSpan('todo-date completion-date');
            completionDateEl.setText('Completed');
        }

        // Show projects in metadata
        if (renderProjects && item.projects.length > 0) {
            const projectsEl = metaRight.createDiv('todo-projects-meta');
            item.projects.forEach(project => {
                const projectEl = projectsEl.createSpan('todo-project-meta');

                const displayProject = this.getDisplayProject(project, item);
                const textSpan = projectEl.createSpan('todo-project-text');
                textSpan.setText(displayProject.replace(/_/g, ' '));

                const iconSpan = projectEl.createSpan('todo-project-icon');
                const icon = this.getProjectIcon(displayProject);

                if (icon.includes('<svg')) {
                    const svgElement = createSVGElement(icon);
                    iconSpan.appendChild(svgElement);
                } else {
                    iconSpan.setText(icon);
                }
            });
        }

        // Show other key:value pairs
        const kvPairs = Object.entries(item.keyValuePairs).filter(([key]) =>
            key !== 'pri' &&
            key !== 'due' &&
            key !== 'rec' &&
            key !== 'origProj' &&
            key !== '||https' &&
            key !== '||http'
        );

        if (kvPairs.length > 0) {
            const kvEl = metaLeft.createDiv('todo-kv');
            kvPairs.forEach(([key, value]) => {
                const kvPair = kvEl.createSpan('todo-kv-pair');
                kvPair.setText(`${key}:${value}`);
            });
        }
    }

    // Get priority from completed or active task
    private getPriorityForDisplay(item: TodoItem): string | null {
        if (item.priority) return item.priority;
        if (item.completed && item.keyValuePairs.pri) return item.keyValuePairs.pri;
        return null;
    }

    // Get appropriate icon for project
    private getProjectIcon(project: string): string {
        if (project === 'Inbox') {
            return Icons.inbox;
        } else if (project === 'Archived') {
            return Icons.archived;
        }

        const customIcon = this.projectManager.getProjectIcon(project);
        return customIcon || Icons.hash;
    }

    // Show original project for archived tasks
    private getDisplayProject(project: string, item: TodoItem): string {
        if (project === 'Archived' && item.keyValuePairs.origProj) {
            const originalProjects = item.keyValuePairs.origProj.split(',');
            return originalProjects[0];
        }
        return project;
    }
}