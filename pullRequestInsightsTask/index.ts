import tl = require('azure-pipelines-task-lib/task');
import * as azureGitInterfaces from "azure-devops-node-api/interfaces/GitInterfaces";
import { EnvironmentConfigurations } from './EnvironmentConfigurations';
import messages from './user_messages.json';
import { Branch } from './Branch';
import { IPipeline } from './IPipeline';
import { AzureApiFactory } from './AzureApiFactory';
import { PullRequest } from './PullRequest';
import './StringExtensions';
import { CommentFactory } from './CommentFactory';


async function run() {
    try {
        const pastFailureThreshold: number = 0; 
        const numberBuildsToQuery: number = 10;
        
        let configurations: EnvironmentConfigurations = new EnvironmentConfigurations();
        let azureApiFactory: AzureApiFactory = new AzureApiFactory();
        let azureApi = await azureApiFactory.create(configurations); 
        let currentProject: string = configurations.getProjectName();
        let currentPipeline: IPipeline = await azureApi.getCurrentPipeline(configurations);
        let type: string = configurations.getHostType();
        let commentFactory: CommentFactory = new CommentFactory();

        tl.debug("pull request id: " + configurations.getPullRequestId());
        if (!configurations.getPullRequestId()){
            tl.debug(this.format(messages.notInPullRequestMessage, type));
        }
        else if (!currentPipeline.isFailure()){
            tl.debug(this.format(messages.noFailureMessage, type));
        }
        else {
            let pullRequest: PullRequest = new PullRequest(configurations.getPullRequestId(), configurations.getRepository(), configurations.getProjectName());
            let targetBranchName: string = await configurations.getTargetBranch(azureApi);
            tl.debug("target branch of pull request: " + targetBranchName);
            let retrievedPipelines: IPipeline[] = await azureApi.getMostRecentPipelinesOfCurrentType(currentProject, currentPipeline, numberBuildsToQuery, targetBranchName);
            let targetBranch: Branch = new Branch(targetBranchName, retrievedPipelines); 
            if (targetBranch.tooManyPipelinesFailed(pastFailureThreshold)){
                let currentIterationCommentThread: azureGitInterfaces.GitPullRequestCommentThread = await pullRequest.getCurrentIterationCommentThread(azureApi, configurations.getBuildIteration());
                let currentPipelineCommentContent: string = commentFactory.createRow(targetBranch.getMostRecentCompletePipeline().isFailure(), currentPipeline.getDisplayName(), currentPipeline.getLink(), String(targetBranch.getPipelineFailStreak()), targetBranch.getTruncatedName(), type, targetBranch.getMostRecentCompletePipeline().getDisplayName(), targetBranch.getMostRecentCompletePipeline().getLink());
                if (currentIterationCommentThread) {
                    pullRequest.editMatchingCommentInThread(azureApi, currentIterationCommentThread, currentPipelineCommentContent, configurations.getBuildIteration());
                }
                else {
                    let currentIterationCommentThreadId: number = (await pullRequest.addNewComment(azureApi, messages.newIterationCommentHeading.format(configurations.getBuildIteration()) + currentPipelineCommentContent)).id;
                    pullRequest.deactivateOldComments(azureApi, currentIterationCommentThreadId);
                }
            }
        }   
    }
    catch (err) {
        console.log("error!", err); 
    }
}

run();