export const DEFAULT_TEST_PATTERNS = [
  "**/*.test.*",
  "**/*.spec.*",
  "tests/**",
  "**/tests/**",
  "test/**",
  "**/test/**",
  "**/__tests__/**"
] as const;

export const DEFAULT_SOURCE_PATTERNS = [
  "**/*.{js,jsx,ts,tsx,mjs,cjs,py,rb,go,rs,java,kt,kts,swift,php,cs,c,cc,cpp,h,hpp}"
] as const;

export const DEFAULT_SENSITIVE_PATTERNS = [
  "**/auth/**",
  "**/*auth*.*",
  "**/authentication/**",
  "**/permissions/**",
  "**/*permission*.*",
  "**/security/**",
  "**/*security*.*",
  "**/payment/**",
  "**/payments/**",
  "**/*payment*.*",
  "**/billing/**",
  "**/*billing*.*",
  "**/migrations/**",
  "**/migration/**",
  "**/*migration*.*",
  "**/*schema*.*",
  "**/*.prisma",
  "**/Dockerfile",
  "**/Dockerfile.*",
  ".github/workflows/**",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "Cargo.lock",
  "composer.lock",
  "Gemfile.lock",
  "poetry.lock"
] as const;
