"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SENSITIVE_PATTERNS = exports.DEFAULT_SOURCE_PATTERNS = exports.DEFAULT_TEST_PATTERNS = void 0;
exports.DEFAULT_TEST_PATTERNS = [
    "**/*.test.*",
    "**/*.spec.*",
    "tests/**",
    "**/tests/**",
    "test/**",
    "**/test/**",
    "**/__tests__/**"
];
exports.DEFAULT_SOURCE_PATTERNS = [
    "**/*.{js,jsx,ts,tsx,mjs,cjs,py,rb,go,rs,java,kt,kts,swift,php,cs,c,cc,cpp,h,hpp}"
];
exports.DEFAULT_SENSITIVE_PATTERNS = [
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
];
