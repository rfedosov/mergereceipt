import type { CommandCheckConfig } from "./schema";
type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
interface PackageJsonShape {
    readonly scripts?: Readonly<Record<string, unknown>>;
}
export interface InitResult {
    readonly path: string;
    readonly projectType: "node" | "unknown";
    readonly packageManager?: PackageManager;
    readonly detectedChecks: readonly string[];
}
export declare function initializeConfig(directory: string, options?: {
    readonly force?: boolean;
}): Promise<InitResult>;
export declare function detectChecks(packageJson: PackageJsonShape, packageManager: PackageManager): Record<string, CommandCheckConfig>;
export {};
