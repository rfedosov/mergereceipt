import type { Evidence, RepositoryEvidence } from "../types";

export interface SemanticVerificationInput {
  readonly repository: RepositoryEvidence;
  readonly deterministicEvidence: readonly Evidence[];
  readonly pullRequestDescription?: string;
  readonly taskDescription?: string;
  readonly diff?: string;
}

/**
 * Future semantic providers implement this advisory boundary. Providers may add
 * evidence, but they must never change or replace deterministic check results.
 */
export interface SemanticEvidenceProvider {
  readonly id: string;
  evaluate(input: SemanticVerificationInput): Promise<Evidence>;
}
