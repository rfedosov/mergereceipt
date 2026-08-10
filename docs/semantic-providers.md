# Future semantic evidence providers

Semantic verification is not implemented in the MVP CLI. The core works fully
without an API key, network connection, or AI provider.

The exported `SemanticEvidenceProvider` interface reserves a narrow adapter
boundary. A future `mergereceipt verify --codex` flow should:

1. collect all deterministic checks and evidence first;
2. obtain the PR diff, PR description, and linked task only with explicit
   repository permissions;
3. send those inputs plus the deterministic report to a configured provider;
4. ask only whether claims are supported and which risks remain unverified;
5. return one `category: semantic`, `deterministic: false` evidence item.

A provider must not mutate deterministic evidence, override a failed required
check, or present model output as proof. Provider prompts and model/version
metadata should be recorded so the advisory result can be audited.

An OpenAI adapter may be offered, but the provider contract must remain neutral
enough for Codex, Claude, local models, and future tools.

The product order is fixed: deterministic checks first, semantic judgment
second, human decision last.
