import { IPipeline } from "./IPipeline";
import * as azureBuildInterfaces from "azure-devops-node-api/interfaces/BuildInterfaces";
import tl = require('azure-pipelines-task-lib/task');
import { AbstractPipelineTask } from "./AbstractPipelineTask";
import { BuildTask } from "./BuildTask";
import { AbstractAzureApi } from "./AbstractAzureApi";

export class Build implements IPipeline{

    private buildData: azureBuildInterfaces.Build;
    private tasks: AbstractPipelineTask[] = [];

    constructor(buildData: azureBuildInterfaces.Build, timelineData: azureBuildInterfaces.Timeline) {
        this.buildData = buildData;
        if (timelineData) {
            for (let taskRecord of timelineData.records) {
                this.tasks.push(new BuildTask(taskRecord));
            }
        }
    }

    public isFailure() : boolean {
        if (this.isComplete()){
            return this.buildData.result === azureBuildInterfaces.BuildResult.Failed;
        }
        for (let task of this.tasks){
            if (task.ran() && task.wasFailure()){
                return true;
            }
        }
        return false;
    }

    public isComplete(): boolean {
        return this.buildData.status === azureBuildInterfaces.BuildStatus.Completed;
    }

    public getDefinitionId(): number {
        return Number(this.buildData.definition.id);
    }

    public getDefinitionName(): string {
        return this.buildData.definition.name;
    }

    public async getDefinitionLink(apiCaller: AbstractAzureApi, project: string): Promise<string> {
        return (await apiCaller.getDefinition(project, this.getDefinitionId()))._links.web.href;
    }

    public getLink(): string {
        return String(this.buildData._links.web.href);
    }

    public getId(): number {
        return Number(this.buildData.id); 
    }

    public getDisplayName(): string {
        return this.buildData.buildNumber;
    }

    public getAllTasks(): AbstractPipelineTask[] {
        if (!this.tasks) {
            return null;
        }
        return this.tasks;
    }

    public getTask(taskToGet: AbstractPipelineTask): AbstractPipelineTask {
        if (this.getAllTasks()) {
            for (let task of this.getAllTasks()) {
                if (task.equals(taskToGet)) {
                    return task;
                }
            }
        }
        return null;
    }
} 