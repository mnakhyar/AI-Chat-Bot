// GitHub Actions Service
export interface GitHubActionsConfig {
  enabled: boolean;
  autoDeploy: boolean;
  testOnPush: boolean;
}

export class GitHubActionsService {
  private static instance: GitHubActionsService;
  private config: GitHubActionsConfig;

  private constructor() {
    this.config = {
      enabled: false,
      autoDeploy: false,
      testOnPush: true,
    };
  }

  static getInstance(): GitHubActionsService {
    if (!GitHubActionsService.instance) {
      GitHubActionsService.instance = new GitHubActionsService();
    }
    return GitHubActionsService.instance;
  }

  updateConfig(config: GitHubActionsConfig): void {
    this.config = config;
    this.saveToLocalStorage();
  }

  getConfig(): GitHubActionsConfig {
    return { ...this.config };
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  shouldAutoDeploy(): boolean {
    return this.config.enabled && this.config.autoDeploy;
  }

  shouldTestOnPush(): boolean {
    return this.config.enabled && this.config.testOnPush;
  }

  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('github-actions-config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save GitHub Actions config:', error);
    }
  }

  loadFromLocalStorage(): void {
    try {
      const saved = localStorage.getItem('github-actions-config');
      if (saved) {
        this.config = { ...this.config, ...JSON.parse(saved) };
      }
    } catch (error) {
      console.error('Failed to load GitHub Actions config:', error);
    }
  }

  // Method to check GitHub Actions status
  async checkGitHubActionsStatus(): Promise<{ status: string; lastRun?: string }> {
    try {
      // This would typically call GitHub API to check workflow status
      // For now, return mock data
      return {
        status: this.config.enabled ? 'active' : 'inactive',
        lastRun: this.config.enabled ? new Date().toISOString() : undefined
      };
    } catch (error) {
      console.error('Failed to check GitHub Actions status:', error);
      return { status: 'error' };
    }
  }

  // Method to trigger GitHub Actions workflow
  async triggerWorkflow(workflowName: string): Promise<boolean> {
    try {
      if (!this.config.enabled) {
        throw new Error('GitHub Actions is not enabled');
      }

      // This would typically call GitHub API to trigger workflow
      console.log(`Triggering workflow: ${workflowName}`);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      console.error('Failed to trigger workflow:', error);
      return false;
    }
  }

  // Method to get workflow logs
  async getWorkflowLogs(workflowName: string): Promise<string[]> {
    try {
      if (!this.config.enabled) {
        return [];
      }

      // This would typically call GitHub API to get workflow logs
      // For now, return mock logs
      return [
        `[${new Date().toISOString()}] Workflow ${workflowName} started`,
        `[${new Date().toISOString()}] Running tests...`,
        `[${new Date().toISOString()}] Tests passed`,
        `[${new Date().toISOString()}] Building project...`,
        `[${new Date().toISOString()}] Build successful`,
      ];
    } catch (error) {
      console.error('Failed to get workflow logs:', error);
      return [];
    }
  }
}

export const githubActionsService = GitHubActionsService.getInstance(); 