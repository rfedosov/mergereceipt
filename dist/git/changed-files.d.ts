export interface ChangedFilesOptions {
    readonly cwd: string;
    readonly base?: string;
    readonly includeUncommitted?: boolean;
    readonly env?: NodeJS.ProcessEnv;
}
export interface ChangedFilesResult {
    readonly root: string;
    readonly base: string;
    readonly head: string;
    readonly files: readonly string[];
}
export declare function collectChangedFiles(options: ChangedFilesOptions): Promise<ChangedFilesResult>;
