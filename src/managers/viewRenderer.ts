import { TodoItem } from '../types';
import { TaskManager } from './taskManager';
import { ProjectManager } from './projectManager';
import { FilterManager, FilterState } from './filterManager';
import { Icons } from '../utils/icons';
import { TaskCounter } from '../utils/taskCounter';
import { FilterItem } from '../components/ui/filterItem';
import { TaskItem } from '../components/ui/taskItem';
import { TaskControls } from '../components/ui/taskControls';
import { TFile } from 'obsidian';

export class ViewRenderer {
    // UI component renderers
    private taskItemRenderer: TaskItem;
    private taskControls: TaskControls;
    private projectsListEl: HTMLElement | null = null;
    private searchInputHasFocus: boolean = false;
    private mobileSidebarOpen: boolean = false;

    // Event callbacks
    public onProjectSelect: (project: string) => void = () => { };
    public onTimeFilterSelect: (filter: string) => void = () => { };
    public onSearchChange: (query: string) => void = () => { };
    public onSortChange: (sortOption: string) => void = () => { };
    public onContextFilterChange: (context: string) => void = () => { };
    public onSpecialFilterSelect: (filter: string) => void = () => { };

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
    }

    // Render complete view layout
    render(
        filteredItems: TodoItem[],
        allItems: TodoItem[],
        filterState: FilterState,
        pinnedProjects: Set<string>,
        allKnownProjects: Set<string>,
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

        this.renderProjectsSidebar(mainLayout, allItems, filterState, pinnedProjects, allKnownProjects, file);

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

    // Render left sidebar with filters and projects
    private renderProjectsSidebar(
        container: HTMLElement,
        allItems: TodoItem[],
        filterState: FilterState,
        pinnedProjects: Set<string>,
        allKnownProjects: Set<string>,
        file: TFile | null
    ): void {
        const sidebar = container.createDiv('projects-sidebar');
        if (this.mobileSidebarOpen) {
            sidebar.addClass('mobile-open');
        }

        const topSection = sidebar.createDiv('projects-top-section');

        // Render default filters
        const filters = [
            { id: 'all', label: 'All', count: TaskCounter.getAllTasksCount(allItems) },
            { id: 'today', label: 'Today', count: TaskCounter.getTodayTasksCount(allItems) },
            { id: 'upcoming', label: 'Upcoming', count: TaskCounter.getUpcomingTasksCount(allItems) },
            { id: 'inbox', label: 'Inbox', count: TaskCounter.getInboxTasksCount(allItems) },
            { id: 'archived', label: 'Archived', count: TaskCounter.getArchivedTasksCount(allItems) },
            { id: 'completed', label: 'Completed', count: TaskCounter.getCompletedTasksCount(allItems) }
        ];

        filters.forEach(filter => {
            FilterItem.render(
                topSection,
                filter.id,
                filter.label,
                filter.count,
                filterState,
                () => {
                    this.handleFilterClick(filter.id);
                    if (window.innerWidth <= 768) {
                        this.toggleMobileSidebar();
                    }
                }
            );
        });

        // Separate pinned and unpinned projects
        const projectCounts = this.projectManager.getProjectCounts(allItems);
        const pinnedProjectCounts = projectCounts.filter(p => pinnedProjects.has(p.project));
        const unpinnedProjectCounts = projectCounts.filter(p => !pinnedProjects.has(p.project));

        // Render pinned projects section
        if (pinnedProjectCounts.length > 0) {
            const pinnedHeaderContainer = sidebar.createDiv('pinned-header-container');
            pinnedHeaderContainer.createEl('h3', { text: 'Pinned' });

            const pinnedList = sidebar.createDiv('projects-list pinned-projects-list');
            pinnedProjectCounts.forEach(({ project, count }) => {
                this.renderProjectItem(pinnedList, project, count, filterState, file);
            });
        }

        this.renderProjectsSection(sidebar, unpinnedProjectCounts, filterState, file);
    }

    // Handle filter button clicks
    private handleFilterClick(filterId: string): void {
        switch (filterId) {
            case 'all':
                this.onProjectSelect('');
                this.onTimeFilterSelect('');
                this.onSpecialFilterSelect('');
                break;
            case 'today':
            case 'upcoming':
                this.onTimeFilterSelect(filterId);
                break;
            case 'inbox':
                this.onProjectSelect('Inbox');
                break;
            case 'archived':
            case 'completed':
                this.onSpecialFilterSelect(filterId);
                break;
        }
    }

    // Render single project list item
    private renderProjectItem(
        container: HTMLElement,
        project: string,
        count: number,
        filterState: FilterState,
        file: TFile | null
    ): void {
        const projectItem = container.createDiv('project-item');

        // Highlight if selected
        if (filterState.selectedProject === project && !filterState.archivedFilter && !filterState.completedFilter) {
            projectItem.addClass('selected');
        }

        // Project icon
        const projectIcon = projectItem.createSpan('project-icon');
        const icon = this.projectManager.getProjectIcon(project);

        if (icon) {
            if (icon.includes('<svg')) {
                projectIcon.innerHTML = icon;
            } else {
                projectIcon.setText(icon);
            }
        } else {
            projectIcon.innerHTML = Icons.hash;
        }

        // Project name
        const projectText = projectItem.createSpan('project-text');
        projectText.setText(project.replace(/_/g, ' '));

        // Task count
        const projectCount = projectItem.createSpan('project-count');
        projectCount.setText(count.toString());

        // Context menu button
        const projectMenu = projectItem.createSpan('project-menu');
        projectMenu.innerHTML = Icons.threeDots;
        projectMenu.addClass('project-menu-dots');

        // Handle clicks
        projectItem.addEventListener('click', (e) => {
            if (e.target === projectMenu || projectMenu.contains(e.target as Node)) {
                e.stopPropagation();
                this.projectManager.showProjectMenu(e, project, file);
            } else {
                this.onProjectSelect(project);
                if (window.innerWidth <= 768) {
                    this.toggleMobileSidebar();
                }
            }
        });
    }

    // Render projects section with header
    private renderProjectsSection(
        container: HTMLElement,
        projectCounts: { project: string; count: number }[],
        filterState: FilterState,
        file: TFile | null
    ): void {
        const headerContainer = container.createDiv('projects-header-container');
        const title = headerContainer.createEl('h3', { text: 'Projects' });
        const addIcon = headerContainer.createSpan('add-project-icon');
        addIcon.innerHTML = Icons.add;

        // Handle add project click
        headerContainer.addEventListener('click', (e) => {
            if (e.target === addIcon || addIcon.contains(e.target as Node)) {
                e.stopPropagation();
                this.projectManager.openAddProjectModal(file);
            }
        });

        const projectsList = container.createDiv('projects-list');
        this.projectsListEl = projectsList;

        // Render all projects
        projectCounts.forEach(({ project, count }) => {
            this.renderProjectItem(projectsList, project, count, filterState, file);
        });
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
        mobileMenuBtn.innerHTML = Icons.menu;
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