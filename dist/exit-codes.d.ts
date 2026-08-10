import { type ExitCode } from "./constants";
import type { Verdict } from "./types";
export declare function exitCodeForVerdict(verdict: Verdict, options?: {
    readonly failOnReview?: boolean;
}): ExitCode;
