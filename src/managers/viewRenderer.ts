import { TodoItem } from '../types';
import { TaskManager } from './taskManager';
import { ProjectManager } from './projectManager';
import { FilterManager, FilterState } from './filterManager';
import { Icons, createSVGElement } from '../utils/icons';
import { TaskItem } from '../components/ui/taskItem';
import { TaskControls } from '../components/ui/taskControls';
import { ProjectsSidebar } from '../components/ui/projectsSidebar';
import { TFile } from 'obsidian';

export class ViewRenderer {
    // UI component renderers
    private taskItemRenderer: TaskItem;
    private taskControls: TaskControls;
    private projectsSidebar: ProjectsSidebar;
    private searchInputHasFocus: boolean = false;
    private mobileSidebarOpen: boolean = false;

    // Event callbacks
    public onProjectSelect: (project: string) => void = () => { };
    public onTimeFilterSelect: (filter: string) => void = () => { };
    public onSearchChange: (query: string) => void = () => { };
    public onSortChange: (sortOption: string) => void = () => { };
    public onContextFilterChange: (context: string) => void = () => { };
    public onSpecialFilterSelect: (filter: string) => void = () => { };
    public onProjectReorder: (projectName: string, newIndex: number, isPinned: boolean) => void = () => { };
    public onProjectTogglePin: (projectName: string, shouldPin: boolean) => void = () => { };

    constructor(
        private containerEl: HTMLElement,
        private taskManager: TaskManager,
        private projectManager: ProjectManager,
        private filterManager: FilterManager
    ) {
        this.taskItemRenderer = new TaskItem(
            taskManager,
            projectManager,
            (tag) => this.searchForTag(tag)
        );

        this.taskControls = new TaskControls(
            filterManager,
            taskManager,
            projectManager,
            (query) => this.onSearchChange(query),
            (sortOption) => this.onSortChange(sortOption),
            (context) => this.onContextFilterChange(context)
        );

        this.projectsSidebar = new ProjectsSidebar(
            projectManager,
            (project) => this.onProjectSelect(project),
            (filter) => this.onTimeFilterSelect(filter),
            (filter) => this.onSpecialFilterSelect(filter),
            (projectName, newIndex, isPinned) => this.onProjectReorder(projectName, newIndex, isPinned),
            (projectName, shouldPin) => this.onProjectTogglePin(projectName, shouldPin),
            () => this.toggleMobileSidebar()
        );
    }

    // Render complete view layout
    render(
        filteredItems: TodoItem[],
        allItems: TodoItem[],
        filterState: FilterState,
        pinnedProjects: string[],
        allKnownProjects: string[],
        file: TFile | null
    ): void {
        // Preserve focus and scroll position
        const activeElement = document.activeElement;
        this.searchInputHasFocus = activeElement?.classList.contains('search-input') || false;

        const scrollTop = this.containerEl.querySelector('.projects-sidebar')?.scrollTop || 0;

        this.containerEl.empty();
        const mainLayout = this.containerEl.createDiv('todo-txt-content');

        // Mobile overlay for sidebar
        const mobileOverlay = mainLayout.createDiv('mobile-sidebar-overlay');
        if (this.mobileSidebarOpen) {
            mobileOverlay.addClass('visible');
        }
        mobileOverlay.addEventListener('click', () => {
            this.toggleMobileSidebar();
        });

        this.projectsSidebar.render(mainLayout, allItems, filterState, pinnedProjects, allKnownProjects, file, this.mobileSidebarOpen);

        const tasksMain = mainLayout.createDiv('tasks-main');
        this.renderTasksSection(tasksMain, filteredItems, filterState);

        // Restore scroll position
        requestAnimationFrame(() => {
            const sidebar = this.containerEl.querySelector('.projects-sidebar');
            if (sidebar) sidebar.scrollTop = scrollTop;
        });

        // Restore search focus
        if (this.searchInputHasFocus) {
            const searchInput = this.containerEl.querySelector('.search-input') as HTMLInputElement;
            if (searchInput) {
                searchInput.focus();
                searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
            }
        }
    }

    // Toggle mobile sidebar visibility
    private toggleMobileSidebar(): void {
        this.mobileSidebarOpen = !this.mobileSidebarOpen;
        const sidebar = this.containerEl.querySelector('.projects-sidebar');
        const overlay = this.containerEl.querySelector('.mobile-sidebar-overlay');

        if (sidebar) {
            if (this.mobileSidebarOpen) {
                sidebar.addClass('mobile-open');
                overlay?.addClass('visible');
            } else {
                sidebar.removeClass('mobile-open');
                overlay?.removeClass('visible');
            }
        }
    }

    // Render main tasks area
    private renderTasksSection(
        container: HTMLElement,
        filteredItems: TodoItem[],
        filterState: FilterState
    ): void {
        const tasksSection = container.createDiv('todo-section');
        const stickyHeader = tasksSection.createDiv('todo-header-sticky');

        const headerContainer = stickyHeader.createDiv('header-title-container');

        // Mobile menu button
        const mobileMenuBtn = headerContainer.createDiv('mobile-menu-btn');
        const menuSvg = createSVGElement(Icons.menu);
        mobileMenuBtn.appendChild(menuSvg);
        mobileMenuBtn.addEventListener('click', () => {
            this.toggleMobileSidebar();
        });

        // Header title
        const headerText = this.getHeaderText(filterState);
        const headerEl = headerContainer.createEl('h2', {
            text: headerText,
            cls: filterState.selectedProject ? 'todo-section-title project-header' : 'todo-section-title all-tasks-header'
        });

        // Render task controls
        this.taskControls.render(
            stickyHeader,
            filterState.searchQuery,
            filterState.sortOption,
            filterState.contextFilter,
            filterState.completedFilter
        );

        // Render tasks list
        const tasksContainer = tasksSection.createDiv('todo-tasks-container');
        const tasksList = tasksContainer.createDiv('todo-tasks-list');

        filteredItems.forEach(item => this.taskItemRenderer.render(tasksList, item));

        // Show empty state
        if (filteredItems.length === 0) {
            tasksList.createDiv('todo-empty').setText('No tasks found');
        }
    }

    // Get appropriate header text
    private getHeaderText(filterState: FilterState): string {
        if (filterState.completedFilter) return 'Completed';
        if (filterState.archivedFilter) return 'Archived';
        if (filterState.selectedTimeFilter === 'today') return 'Today';
        if (filterState.selectedTimeFilter === 'upcoming') return 'Upcoming';
        if (filterState.selectedProject) return filterState.selectedProject.replace(/_/g, ' ');
        return 'Tasks';
    }

    // Search for clicked tag
    private searchForTag(tag: string): void {
        this.taskControls.setSearchValue(tag);
        this.onSearchChange(tag);
    }
}