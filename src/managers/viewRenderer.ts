import { TodoItem } from '../types';
import { TaskManager } from './taskManager';
import { ProjectManager } from './projectManager';
import { FilterManager, FilterState } from './filterManager';
import { Icons, createSVGElement } from '../utils/icons';
import { TaskItem } from '../components/ui/taskItem';
import { TaskControls } from '../components/ui/taskControls';
import { ProjectsSidebar } from '../components/ui/projectsSidebar';
import { TFile } from 'obsidian';
import TodoTxtPlugin from '../main';

export class ViewRenderer {
    // UI component renderers
    private taskItemRenderer: TaskItem;
    private taskControls: TaskControls;
    private projectsSidebar: ProjectsSidebar;
    private searchInputHasFocus: boolean = false;
    private sidebarOpen: boolean = false;
    private resizeObserver: ResizeObserver | null = null;
    private currentBreakpoint: 'mobile' | 'desktop' = 'mobile';
    private isInitialized: boolean = false;

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
        private filterManager: FilterManager,
        private plugin: TodoTxtPlugin
    ) {
        this.initializeResponsiveClasses();

        const isDesktop = this.currentBreakpoint === 'desktop';
        this.sidebarOpen = isDesktop ? !this.plugin.settings.sidebarCollapsed : false;

        this.setupResizeObserver();

        this.taskItemRenderer = new TaskItem(
            taskManager,
            projectManager,
            filterManager,
            (tag: string) => this.searchForTag(tag)
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
            () => this.toggleSidebar()
        );
    }

    // Set responsive classes by container width
    private initializeResponsiveClasses(): void {
        const width = this.containerEl.offsetWidth || window.innerWidth;
        const initialBreakpoint = width > 768 ? 'desktop' : 'mobile';

        this.containerEl.removeClass('mobile', 'desktop')
        this.containerEl.addClass(initialBreakpoint);
        this.currentBreakpoint = initialBreakpoint;
    }

    // ResizeObserver for container width changes
    private setupResizeObserver(): void {
        if (typeof ResizeObserver !== 'undefined' && !this.resizeObserver) {
            this.resizeObserver = new ResizeObserver(() => {
                this.updateResponsiveClasses();
            });
            this.resizeObserver.observe(this.containerEl);
        }
    }

    // Update responsive classes by container width
    private updateResponsiveClasses(): void {
        const containerWidth = this.containerEl.offsetWidth;

        // Fallback to window width if container width is 0
        const effectiveWidth = containerWidth > 0 ? containerWidth : window.innerWidth;
        const newBreakpoint = effectiveWidth > 768 ? 'desktop' : 'mobile';

        // Only update if breakpoint actually changed
        if (newBreakpoint !== this.currentBreakpoint) {
            this.containerEl.removeClass('mobile', 'desktop');
            this.containerEl.addClass(newBreakpoint);
            this.currentBreakpoint = newBreakpoint;
            this.handleBreakpointChange();
        }
    }

    // Handle breakpoint changes
    private handleBreakpointChange(): void {
        if (!this.isInitialized) {
            return;
        }

        const isDesktop = this.currentBreakpoint === 'desktop';
        const shouldBeOpen = isDesktop ? !this.plugin.settings.sidebarCollapsed : false;

        if (shouldBeOpen !== this.sidebarOpen) {
            this.sidebarOpen = shouldBeOpen;
            this.updateSidebarState();
        }
    }

    // Force responsive update
    private forceResponsiveUpdate(): void {
        const containerWidth = this.containerEl.offsetWidth;
        const effectiveWidth = containerWidth > 0 ? containerWidth : window.innerWidth;
        const correctBreakpoint = effectiveWidth > 768 ? 'desktop' : 'mobile';

        this.containerEl.removeClass('mobile', 'desktop');
        this.containerEl.addClass(correctBreakpoint);

        if (correctBreakpoint !== this.currentBreakpoint) {
            this.currentBreakpoint = correctBreakpoint;
            this.handleBreakpointChange();
        }
    }

    // Cleanup ResizeObserver
    public destroy(): void {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
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

        const sidebarScrollTop = this.containerEl.querySelector('.projects-sidebar')?.scrollTop || 0;
        const tasksScrollTop = this.containerEl.querySelector('.todo-tasks-container')?.scrollTop || 0;

        this.containerEl.empty();
        const mainLayout = this.containerEl.createDiv('todo-txt-content');

        // Force update to apply correct classes
        this.forceResponsiveUpdate();

        // Apply sidebar state class on render
        if (!this.sidebarOpen) {
            mainLayout.addClass('sidebar-collapsed');
        }

        // Mobile overlay for sidebar
        const mobileOverlay = mainLayout.createDiv('mobile-sidebar-overlay');
        if (this.sidebarOpen) {
            mobileOverlay.addClass('visible');
        }
        mobileOverlay.addEventListener('click', () => {
            this.toggleSidebar();
        });

        this.projectsSidebar.render(mainLayout, allItems, filterState, pinnedProjects, allKnownProjects, file, this.sidebarOpen);

        const tasksMain = mainLayout.createDiv('tasks-main');

        // Apply sidebar state to tasks-main immediately
        if (!this.sidebarOpen) {
            tasksMain.addClass('sidebar-closed');
        }

        this.renderTasksSection(tasksMain, filteredItems, filterState);

        // Restore scroll position
        requestAnimationFrame(() => {
            const sidebar = this.containerEl.querySelector('.projects-sidebar');
            if (sidebar) sidebar.scrollTop = sidebarScrollTop;

            const tasksContainer = this.containerEl.querySelector('.todo-tasks-container');
            if (tasksContainer) tasksContainer.scrollTop = tasksScrollTop;
        });

        // Restore search focus
        if (this.searchInputHasFocus) {
            const searchInput = this.containerEl.querySelector('.search-input') as HTMLInputElement;
            if (searchInput) {
                searchInput.focus();
                searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
            }
        }

        // Mark as initialized after first render
        if (!this.isInitialized) {
            this.isInitialized = true;
        }
    }

    // Toggle sidebar visibility
    private async toggleSidebar(): Promise<void> {
        this.sidebarOpen = !this.sidebarOpen;
        this.updateSidebarState();

        // Save state only on desktop
        if (this.currentBreakpoint === 'desktop') {
            this.plugin.settings.sidebarCollapsed = !this.sidebarOpen;
            await this.plugin.saveSettings();
        }
    }

    // Update sidebar DOM state
    private updateSidebarState(): void {
        const sidebar = this.containerEl.querySelector('.projects-sidebar');
        const mainContent = this.containerEl.querySelector('.tasks-main');
        const overlay = this.containerEl.querySelector('.mobile-sidebar-overlay');
        const todoContent = this.containerEl.querySelector('.todo-txt-content');

        if (sidebar && mainContent) {
            if (this.sidebarOpen) {
                sidebar.addClass('open');
                sidebar.removeClass('closed');
                mainContent.removeClass('sidebar-closed');
                todoContent?.removeClass('sidebar-collapsed');
                if (this.currentBreakpoint === 'mobile') {
                    overlay?.addClass('visible');
                }
            } else {
                sidebar.addClass('closed');
                sidebar.removeClass('open');
                mainContent.addClass('sidebar-closed');
                todoContent?.addClass('sidebar-collapsed');
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

        // Menu button
        const menuBtn = headerContainer.createDiv('menu-btn');
        const menuSvg = createSVGElement(Icons.menu);
        menuBtn.appendChild(menuSvg);
        menuBtn.addEventListener('click', () => {
            this.toggleSidebar();
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