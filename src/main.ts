import { App, Plugin, TFile } from 'obsidian';
import { TodoTxtSettings, DEFAULT_SETTINGS, VIEW_TYPE_TODO_TXT } from './types';
import { TodoTxtSettingTab } from './settings';
import { TodoTxtView } from './view';
import { AddTaskModal } from './components/modals/addTaskModal';

export default class TodoTxtPlugin extends Plugin {
    settings: TodoTxtSettings;

    async onload(): Promise<void> {
        console.log('Loading Todo.txt plugin...');
        // Load settings or defaults
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

        // Register todo view type
        this.registerView(VIEW_TYPE_TODO_TXT, (leaf) => new TodoTxtView(leaf, this));
        // Auto-open .txt files as todo
        this.registerExtensions(['txt'], VIEW_TYPE_TODO_TXT);

        // Handle file renames
        this.registerEvent(
            this.app.vault.on('rename', async (file, oldPath) => {
                if (file instanceof TFile && file.extension === 'txt') {
                    await this.handleFileRename(file, oldPath);
                }
            })
        );

        // Add ribbon icon
        this.addRibbonIcon('circle-check-big', 'Open Todo.txt', () => {
            this.activateView();
        });

        // Open todo command
        this.addCommand({
            id: 'open-task',
            name: 'Open Task',
            callback: () => this.activateView()
        });

        // Add task hotkey (Alt+N)
        this.addCommand({
            id: 'add-task',
            name: 'Add task',
            hotkeys: [{ modifiers: ['Alt'], key: 'n' }],
            callback: () => {
                // Use existing view or create new modal
                const activeLeaf = this.app.workspace.getActiveViewOfType(TodoTxtView);
                if (activeLeaf) {
                    activeLeaf.openAddTaskModal();
                } else {
                    this.openAddTaskModal();
                }
            }
        });

        // Auto-open on startup
        if (this.settings.openOnStartup) {
            setTimeout(() => {
                this.activateView();
            }, 1000);
        }

        this.addSettingTab(new TodoTxtSettingTab(this.app, this));
        console.log('Todo.txt plugin loaded successfully');
    }

    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);
    }

    // Update settings on file rename
    private async handleFileRename(file: TFile, oldPath: string): Promise<void> {
        let dataUpdated = false;

        // Update pinned projects
        if (this.settings.pinnedProjects && this.settings.pinnedProjects[oldPath]) {
            this.settings.pinnedProjects[file.path] = this.settings.pinnedProjects[oldPath];
            delete this.settings.pinnedProjects[oldPath];
            dataUpdated = true;
        }

        // Update project icons
        if (this.settings.projectIcons && this.settings.projectIcons[oldPath]) {
            this.settings.projectIcons[file.path] = this.settings.projectIcons[oldPath];
            delete this.settings.projectIcons[oldPath];
            dataUpdated = true;
        }

        // Update known projects
        if (this.settings.allKnownProjects && this.settings.allKnownProjects[oldPath]) {
            this.settings.allKnownProjects[file.path] = this.settings.allKnownProjects[oldPath];
            delete this.settings.allKnownProjects[oldPath];
            dataUpdated = true;
        }

        if (dataUpdated) {
            await this.saveSettings();

            // Refresh open views
            const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TODO_TXT);
            for (const leaf of leaves) {
                const view = leaf.view as TodoTxtView;
                if (view.getFile()?.path === file.path) {
                    view.getProjectManager().loadPinnedProjects(file);
                    view.getProjectManager().loadAllKnownProjects(file);
                    view.getProjectManager().loadProjectIcons(file);
                    await view.loadFileContent();
                }
            }
        }
    }

    // Open task modal for default file
    private async openAddTaskModal(): Promise<void> {
        const defaultFile = await this.getDefaultTodoFile();
        const availableProjects = await this.getAvailableProjectsFromFile(defaultFile);
        const availableContexts = await this.getAvailableContextsFromFile(defaultFile);

        const modal = new AddTaskModal(this.app, async (taskLine: string) => {
            await this.addTaskToDefaultFile(taskLine);
        }, availableProjects, availableContexts);
        modal.open();
    }

    // Extract projects from file
    private async getAvailableProjectsFromFile(file: TFile): Promise<string[]> {
        try {
            const content = await this.app.vault.read(file);
            const projects = new Set<string>();

            const lines = content.split('\n').filter(line => line.trim().length > 0);

            lines.forEach(line => {
                // Match +ProjectName patterns
                const projectMatches = line.match(/\+(\w+)/g);
                if (projectMatches) {
                    projectMatches.forEach(match => {
                        const project = match.substring(1); // Remove +
                        if (project !== 'Inbox') {
                            projects.add(project);
                        }
                    });
                }
            });

            return Array.from(projects).sort();
        } catch (error) {
            console.error('Error reading file for projects:', error);
            return [];
        }
    }

    // Extract contexts from file
    private async getAvailableContextsFromFile(file: TFile): Promise<string[]> {
        try {
            const content = await this.app.vault.read(file);
            const contexts = new Set<string>();

            const lines = content.split('\n').filter(line => line.trim().length > 0);

            // Match @ContextName patterns
            lines.forEach(line => {
                const contextMatches = line.match(/@(\w+)/g);
                if (contextMatches) {
                    contextMatches.forEach(match => {
                        const context = match.substring(1); // Remove @
                        contexts.add(context);
                    });
                }
            });

            return Array.from(contexts).sort();
        } catch (error) {
            console.error('Error reading file for contexts:', error);
            return [];
        }
    }

    // Add task to default file
    private async addTaskToDefaultFile(taskLine: string): Promise<void> {
        const defaultFile = await this.getDefaultTodoFile();
        const currentContent = await this.app.vault.read(defaultFile);
        const newContent = currentContent ? `${currentContent}\n${taskLine}` : taskLine;
        await this.app.vault.modify(defaultFile, newContent);
    }

    // Open todo view for file
    async openTodoTxtView(file: TFile): Promise<void> {
        const leaf = this.app.workspace.getLeaf(true);
        await leaf.setViewState({
            type: VIEW_TYPE_TODO_TXT,
            state: { file: file.path },
            active: true
        });
    }

    // Get or create default file
    async getDefaultTodoFile(): Promise<TFile> {
        let path = this.settings.todoFilePath.trim();
        if (!path) {
            path = DEFAULT_SETTINGS.todoFilePath;
        }
        let file = this.app.vault.getAbstractFileByPath(path);
        // Create if missing
        if (!file) {
            await this.app.vault.create(path, '');
            file = this.app.vault.getAbstractFileByPath(path);
        }
        if (file instanceof TFile) {
            return file;
        } else {
            throw new Error('Failed to get or create default Todo.txt file');
        }
    }

    // Convert filter to state
    private getStartupState(filter: string): any {
        switch (filter.toLowerCase()) {
            case 'all':
                return { selectedProject: '', selectedTimeFilter: '', archivedFilter: false, completedFilter: false };
            case 'inbox':
                return { selectedProject: 'Inbox', selectedTimeFilter: '', archivedFilter: false, completedFilter: false };
            case 'today':
                return { selectedProject: '', selectedTimeFilter: 'today', archivedFilter: false, completedFilter: false };
            case 'upcoming':
                return { selectedProject: '', selectedTimeFilter: 'upcoming', archivedFilter: false, completedFilter: false };
            case 'archived':
                return { selectedProject: '', selectedTimeFilter: '', archivedFilter: true, completedFilter: false };
            case 'completed':
                return { selectedProject: '', selectedTimeFilter: '', archivedFilter: false, completedFilter: true };
            default:
                // Treat as project name
                return { selectedProject: filter, selectedTimeFilter: '', archivedFilter: false, completedFilter: false };
        }
    }

    // Open or focus default view
    async activateView(): Promise<void> {
        const defaultFile = await this.getDefaultTodoFile();
        const defaultFilePath = defaultFile.path;

        const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_TODO_TXT);

        // Find existing view for default file
        for (const leaf of leaves) {
            const state = leaf.getViewState();

            if (state.type === VIEW_TYPE_TODO_TXT && state.state?.file === defaultFilePath) {
                const view = leaf.view as TodoTxtView;

                // Focus existing view
                this.app.workspace.setActiveLeaf(leaf);
                this.app.workspace.revealLeaf(leaf);

                // Apply startup filter
                setTimeout(() => {
                    view.setFilter(this.settings.startupFilter);
                }, 100);

                return;
            }
        }

        // Create new view
        const leaf = this.app.workspace.getLeaf(true);
        const startupState = this.getStartupState(this.settings.startupFilter);
        await leaf.setViewState({
            type: VIEW_TYPE_TODO_TXT,
            state: { file: defaultFilePath, ...startupState },
            active: true
        });
    }
}