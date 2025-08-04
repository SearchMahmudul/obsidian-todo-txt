import { App, TFile } from 'obsidian';
import { TodoItem } from '../types';
import { AddProjectModal } from '../components/modals/addProjectModal';
import { DeleteProjectModal } from '../components/modals/confirmModals';
import TodoTxtPlugin from '../main';

export class ProjectManager {
    // Project data stores
    public pinnedProjects: Set<string> = new Set();
    public allKnownProjects: Set<string> = new Set();
    public projectIcons: Map<string, string> = new Map();

    // Callback handlers
    public onProjectCreate: (projectName: string, icon?: string) => Promise<void> = async () => { };
    public onProjectUpdate: (oldName: string, newName: string, icon?: string) => Promise<void> = async () => { };
    public onProjectDelete: (projectName: string) => Promise<void> = async () => { };
    public onProjectPin: (projectName: string, isPinned: boolean) => Promise<void> = async () => { };

    constructor(private plugin: TodoTxtPlugin) {
    }

    // Extract projects from todo items
    updateFromTodoItems(items: TodoItem[]): void {
        items.forEach(item => {
            item.projects.forEach(project => {
                if (project !== 'Inbox' && project !== 'Archived') {
                    this.allKnownProjects.add(project);
                }
            });
        });
    }

    // Count active tasks per project
    getProjectCounts(items: TodoItem[]): { project: string; count: number }[] {
        const projectCounts = new Map<string, number>();

        // Initialize all projects with zero count
        this.allKnownProjects.forEach(project => {
            projectCounts.set(project, 0);
        });

        // Count active tasks per project
        items.filter(item => !item.completed && !item.projects.includes('Archived'))
            .forEach(item => {
                item.projects.forEach(project => {
                    if (project !== 'Archived') {
                        const currentCount = projectCounts.get(project) || 0;
                        projectCounts.set(project, currentCount + 1);
                    }
                });
            });

        // Ensure Inbox exists
        if (!projectCounts.has('Inbox')) {
            projectCounts.set('Inbox', 0);
        }

        return Array.from(projectCounts.entries())
            .map(([project, count]) => ({ project, count }))
            .filter(({ project }) => project !== 'Inbox' && project !== 'Archived')
            .sort((a, b) => a.project.localeCompare(b.project));
    }

    // Get all projects for dropdowns
    getAvailableProjects(): string[] {
        const projects = new Set<string>(this.allKnownProjects);
        projects.add('Archived');
        return Array.from(projects).sort();
    }

    // Open modal to create project
    openAddProjectModal(file: TFile | null): void {
        const modal = new AddProjectModal(
            this.plugin.app,
            async (projectName: string, icon?: string) => {
                if (icon !== undefined) {
                    this.projectIcons.set(projectName, icon);
                    await this.saveProjectIcons(file);
                }
                await this.onProjectCreate(projectName, icon);
            }
        );
        modal.open();
    }

    // Open modal to edit project
    private editProject(projectName: string, file: TFile | null): void {
        const currentIcon = this.projectIcons.get(projectName) || '';
        const modal = new AddProjectModal(
            this.plugin.app,
            async (oldName: string, newName: string, icon?: string) => {
                if (oldName !== newName && this.projectIcons.has(oldName)) {
                    this.projectIcons.delete(oldName);
                }
                if (icon !== undefined) {
                    this.projectIcons.set(newName, icon);
                    await this.saveProjectIcons(file);
                }
                await this.onProjectUpdate(oldName, newName, icon);
            },
            projectName,
            currentIcon
        );
        modal.open();
    }

    // Save icons to settings
    async saveProjectIcons(file: TFile | null): Promise<void> {
        if (!file) return;

        if (!this.plugin.settings.projectIcons) {
            this.plugin.settings.projectIcons = {};
        }

        this.plugin.settings.projectIcons[file.path] = Object.fromEntries(this.projectIcons);
        await this.plugin.saveSettings();
    }

    // Load icons from settings
    loadProjectIcons(file: TFile | null): void {
        if (!file) return;

        if (this.plugin.settings.projectIcons && this.plugin.settings.projectIcons[file.path]) {
            this.projectIcons = new Map(Object.entries(this.plugin.settings.projectIcons[file.path]));
        } else {
            this.projectIcons = new Map();
        }
    }

    // Get project icon
    getProjectIcon(projectName: string): string {
        return this.projectIcons.get(projectName) || '';
    }

    // Show context menu for project
    showProjectMenu(event: MouseEvent, projectName: string, file: TFile | null): void {
        const existingMenu = document.querySelector('.project-context-menu');
        if (existingMenu) {
            existingMenu.remove();
        }

        const menu = document.createElement('div');
        menu.className = 'project-context-menu';
        menu.style.left = `${event.clientX}px`;
        menu.style.top = `${event.clientY}px`;

        // Edit option
        const editOption = menu.createEl('div', {
            text: 'Edit',
            cls: 'project-context-menu-item'
        });
        editOption.addEventListener('click', () => {
            this.editProject(projectName, file);
            menu.remove();
        });

        // Pin/unpin option
        const isPinned = this.pinnedProjects.has(projectName);
        const pinOption = menu.createEl('div', {
            text: isPinned ? 'Unpin' : 'Pin',
            cls: 'project-context-menu-item'
        });
        pinOption.addEventListener('click', async () => {
            await this.onProjectPin(projectName, !isPinned);
            menu.remove();
        });

        // Delete option
        const deleteOption = menu.createEl('div', {
            text: 'Delete',
            cls: 'project-context-menu-item'
        });
        deleteOption.addEventListener('click', () => {
            this.confirmDeleteProject(projectName);
            menu.remove();
        });

        document.body.appendChild(menu);

        // Close menu on outside click
        const closeMenu = (e: MouseEvent) => {
            if (!menu.contains(e.target as Node)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        };

        setTimeout(() => {
            document.addEventListener('click', closeMenu);
        }, 0);
    }

    // Show delete confirmation
    private confirmDeleteProject(projectName: string): void {
        const modal = new DeleteProjectModal(
            this.plugin.app,
            projectName,
            async () => {
                await this.onProjectDelete(projectName);
            }
        );
        modal.open();
    }

    // Update project name in sets
    async renameProject(oldName: string, newName: string, file: TFile | null): Promise<void> {
        if (this.pinnedProjects.has(oldName)) {
            this.pinnedProjects.delete(oldName);
            this.pinnedProjects.add(newName);
            await this.savePinnedProjects(file);
        }

        if (this.allKnownProjects.has(oldName)) {
            this.allKnownProjects.delete(oldName);
            this.allKnownProjects.add(newName);
            await this.saveAllKnownProjects(file);
        }
    }

    // Remove project from all data
    async deleteProject(projectName: string, file: TFile | null): Promise<void> {
        this.allKnownProjects.delete(projectName);
        this.pinnedProjects.delete(projectName);
        this.projectIcons.delete(projectName);
        await this.saveAllKnownProjects(file);
        await this.savePinnedProjects(file);
        await this.saveProjectIcons(file);
    }

    // Save pinned projects to settings
    async savePinnedProjects(file: TFile | null): Promise<void> {
        if (!file) return;

        if (!this.plugin.settings.pinnedProjects) {
            this.plugin.settings.pinnedProjects = {};
        }

        this.plugin.settings.pinnedProjects[file.path] = Array.from(this.pinnedProjects);
        await this.plugin.saveSettings();
    }

    // Load pinned projects from settings
    loadPinnedProjects(file: TFile | null): void {
        if (!file) return;

        if (this.plugin.settings.pinnedProjects && this.plugin.settings.pinnedProjects[file.path]) {
            this.pinnedProjects = new Set(this.plugin.settings.pinnedProjects[file.path]);
        } else {
            this.pinnedProjects = new Set();
        }
    }

    // Save all known projects to settings
    async saveAllKnownProjects(file: TFile | null): Promise<void> {
        if (!file) return;

        if (!this.plugin.settings.allKnownProjects) {
            this.plugin.settings.allKnownProjects = {};
        }

        this.plugin.settings.allKnownProjects[file.path] = Array.from(this.allKnownProjects);
        await this.plugin.saveSettings();
    }

    // Load all known projects from settings
    loadAllKnownProjects(file: TFile | null): void {
        if (!file) return;

        if (this.plugin.settings.allKnownProjects && this.plugin.settings.allKnownProjects[file.path]) {
            this.allKnownProjects = new Set(this.plugin.settings.allKnownProjects[file.path]);
        } else {
            this.allKnownProjects = new Set();
        }
    }
}