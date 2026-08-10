import { type MergeReceiptConfig } from "./schema";
export interface LoadedConfig {
    readonly path: string;
    readonly directory: string;
    readonly config: MergeReceiptConfig;
}
export declare function findConfigPath(startDirectory: string, explicitPath?: string): Promise<string>;
export declare function loadConfig(startDirectory: string, explicitPath?: string): Promise<LoadedConfig>;
