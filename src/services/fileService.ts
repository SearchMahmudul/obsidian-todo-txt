import { TFile, Vault } from 'obsidian';
import { TodoItem } from '../types';

export class FileService {
    constructor(private vault: Vault) { }

    // Read file content
    async readFile(file: TFile): Promise<string> {
        return await this.vault.read(file);
    }

    // Write content to file
    async writeFile(file: TFile, content: string): Promise<void> {
        await this.vault.modify(file, content);
    }

    // Replace task line in file
    async updateTaskLine(file: TFile, originalItem: TodoItem, newLine: string): Promise<void> {
        const currentContent = await this.readFile(file);
        const lines = currentContent.split('\n');
        const updatedLines = lines.map(line =>
            line.trim() === originalItem.raw.trim() ? newLine : line
        );
        await this.writeFile(file, updatedLines.join('\n'));
    }

    // Remove task line from file
    async deleteTaskLine(file: TFile, item: TodoItem): Promise<void> {
        const currentContent = await this.readFile(file);
        const lines = currentContent.split('\n');
        const filteredLines = lines.filter(line => line.trim() !== item.raw.trim());
        await this.writeFile(file, filteredLines.join('\n'));
    }

    // Add new task line to file
    async appendTaskLine(file: TFile, taskLine: string): Promise<void> {
        const currentContent = await this.readFile(file);

        if (!currentContent.trim()) {
            await this.writeFile(file, taskLine);
            return;
        }

        const lines = currentContent.split('\n');
        const lastLine = lines[lines.length - 1].trim();

        // Extract dates from both lines
        const lastDate = this.extractCreationDate(lastLine);
        const newDate = this.extractCreationDate(taskLine);

        // Add line break if different dates
        const separator = (lastDate && newDate && lastDate !== newDate) ? '\n\n' : '\n';
        const newContent = `${currentContent}${separator}${taskLine}`;

        await this.writeFile(file, newContent);
    }

    // Extract date from task line
    private extractCreationDate(taskLine: string): string | null {
        const match = taskLine.match(/^(?:KATEX_INLINE_OPEN[A-Z]KATEX_INLINE_CLOSE\s+)?(\d{4}-\d{2}-\d{2})/);
        return match ? match[1] : null;
    }

    // Rename project in all tasks
    async replaceProjectName(file: TFile, oldName: string, newName: string): Promise<void> {
        const currentContent = await this.readFile(file);
        const lines = currentContent.split('\n');
        const updatedLines = lines.map(line => {
            if (line.includes(`+${oldName}`)) {
                return line.replace(new RegExp(`\\+${oldName}\\b`, 'g'), `+${newName}`);
            }
            return line;
        });
        await this.writeFile(file, updatedLines.join('\n'));
    }

    // Remove project from all tasks
    async removeProjectFromTasks(file: TFile, projectName: string): Promise<void> {
        const currentContent = await this.readFile(file);
        const lines = currentContent.split('\n');
        const filteredLines = lines.filter(line => !line.includes(`+${projectName}`));
        await this.writeFile(file, filteredLines.join('\n'));
    }
}