import { TFile } from 'obsidian';
import { FileService } from './fileService';
import { ProjectManager } from '../managers/projectManager';

export class ProjectService {
    constructor(
        private fileService: FileService,
        private projectManager: ProjectManager
    ) { }

    // Create new empty project
    async createEmptyProject(file: TFile | null, projectName: string): Promise<void> {
        this.projectManager.allKnownProjects.add(projectName);
        await this.projectManager.saveAllKnownProjects(file);
    }

    // Rename project everywhere
    async updateProjectName(file: TFile, oldName: string, newName: string): Promise<void> {
        if (oldName === newName) return;

        await this.fileService.replaceProjectName(file, oldName, newName);
        await this.projectManager.renameProject(oldName, newName, file);
    }

    // Delete project and its tasks
    async deleteProject(file: TFile, projectName: string): Promise<void> {
        await this.fileService.removeProjectFromTasks(file, projectName);
        await this.projectManager.deleteProject(projectName, file);
    }

    // Pin or unpin project
    async toggleProjectPin(file: TFile | null, projectName: string, isPinned: boolean): Promise<void> {
        if (isPinned) {
            this.projectManager.pinnedProjects.add(projectName);
        } else {
            this.projectManager.pinnedProjects.delete(projectName);
        }
        await this.projectManager.savePinnedProjects(file);
    }
}