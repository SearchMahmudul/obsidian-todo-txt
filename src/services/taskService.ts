import { TFile } from 'obsidian';
import { TodoItem } from '../types';
import { FileService } from './fileService';
import { RecurrenceCalculator } from '../utils/recurrenceCalculator';

export class TaskService {
    constructor(private fileService: FileService) { }

    // Mark task as completed
    async completeTask(file: TFile, item: TodoItem): Promise<void> {
        const today = new Date().toISOString().split('T')[0];
        const { cleanedLine, priority } = this.extractPriorityFromTaskLine(item.raw);

        // Handle recurring tasks
        const recMatch = item.raw.match(/\brec:(\S+)/);
        if (recMatch) {
            const recPattern = recMatch[1];
            const dueMatch = item.raw.match(/due:(\d{4}-\d{2}-\d{2})/);

            if (dueMatch) {
                const currentDue = new Date(dueMatch[1]);
                const nextDue = RecurrenceCalculator.calculateNextDueDate(currentDue, recPattern);

                // Create new task with next due date
                let newTaskLine = item.raw.replace(/due:\d{4}-\d{2}-\d{2}/, `due:${nextDue}`);
                newTaskLine = newTaskLine.replace(/^x\s+\d{4}-\d{2}-\d{2}\s+/, '');

                await this.fileService.appendTaskLine(file, newTaskLine);
            }
        }

        // Mark current task as completed
        let completedLine = `x ${today} ${cleanedLine}`;
        if (priority) {
            completedLine += ` pri:${priority}`;
        }
        await this.fileService.updateTaskLine(file, item, completedLine);
    }

    // Unmark task completion
    async uncompleteTask(file: TFile, item: TodoItem): Promise<void> {
        const parts = item.raw.trim().split(/\s+/);
        // Remove completion marker and date
        if (parts[0] === 'x' && /^\d{4}-\d{2}-\d{2}$/.test(parts[1])) {
            parts.splice(0, 2);
        }
        let taskLine = parts.join(' ');

        // Restore priority from pri: tag
        const priMatch = taskLine.match(/ pri:([A-Z])$/);
        if (priMatch) {
            const priority = priMatch[1];
            taskLine = taskLine.replace(/ pri:[A-Z]$/, '');
            taskLine = `(${priority}) ${taskLine}`;
        }
        await this.fileService.updateTaskLine(file, item, taskLine);
    }

    // Update task content
    async updateTask(file: TFile, originalItem: TodoItem, newTaskLine: string): Promise<void> {
        await this.fileService.updateTaskLine(file, originalItem, newTaskLine);
    }

    // Remove task
    async deleteTask(file: TFile, item: TodoItem): Promise<void> {
        await this.fileService.deleteTaskLine(file, item);
    }

    // Add new task
    async addNewTask(file: TFile, taskLine: string): Promise<void> {
        await this.fileService.appendTaskLine(file, taskLine);
    }

    // Move task from archived to inbox
    async moveTaskFromArchivedToInbox(file: TFile, item: TodoItem): Promise<void> {
        const updatedProjects = item.projects.filter(p => p !== 'Archived');
        if (!updatedProjects.includes('Inbox')) {
            updatedProjects.push('Inbox');
        }

        // Rebuild task line with new projects
        let newTaskLine = item.description.replace(/\s*\+\w+/g, '');
        updatedProjects.forEach(project => {
            newTaskLine += ` +${project}`;
        });
        item.contexts.forEach(context => {
            if (!newTaskLine.includes(`@${context}`)) {
                newTaskLine += ` @${context}`;
            }
        });
        Object.entries(item.keyValuePairs).forEach(([key, value]) => {
            if (key !== 'pri' || !item.completed) {
                newTaskLine += ` ${key}:${value}`;
            }
        });

        await this.fileService.updateTaskLine(file, item, newTaskLine);
    }

    // Extract priority from task line
    private extractPriorityFromTaskLine(taskLine: string): { cleanedLine: string; priority: string | null } {
        const priorityMatch = taskLine.match(/^\(([A-Z])\)\s+(.+)$/);
        if (priorityMatch) {
            return {
                cleanedLine: priorityMatch[2],
                priority: priorityMatch[1]
            };
        }
        return {
            cleanedLine: taskLine,
            priority: null
        };
    }
}