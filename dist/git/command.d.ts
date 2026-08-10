export interface GitCommandResult {
    readonly exitCode: number;
    readonly stdout: Buffer;
    readonly stderr: string;
}
export declare function runGit(args: readonly string[], cwd: string): Promise<GitCommandResult>;
export declare function requireGit(args: readonly string[], cwd: string, description: string): Promise<GitCommandResult>;
