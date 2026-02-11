# Project Template Guide

This document provides a template and guidelines for creating new projects in this repository.

## Overview

Each project in this repository is **completely isolated** and self-contained. Projects should not share code, even if it means duplicating utilities or patterns.

## Required File Structure

When creating a new project, use this template structure:

```
/new-project-name/                      # Use kebab-case naming
├── PROJECT_CONTEXT.md                   # Context for AI agents (REQUIRED)
├── README.md                            # Project documentation (REQUIRED)
├── DEPLOYMENT.md                        # Deployment instructions (if applicable)
├── package.json                         # Dependencies (Node.js projects)
├── tsconfig.json                        # TypeScript configuration (if applicable)
├── jest.config.js                       # Test configuration (if applicable)
├── .gitignore                           # Project-specific gitignore
├── .eslintrc.json                       # Linting configuration (if applicable)
├── .prettierrc.json                     # Formatting configuration (if applicable)
├── src/                                 # Source code
│   ├── coordinators/                    # Feature coordinators (TypeScript)
│   ├── services/                        # External integrations
│   ├── models/                          # Data models
│   ├── config/                          # Configuration files
│   ├── utils/                           # Project-specific utilities
│   └── index.ts                         # Entry point
├── config/                              # Runtime configuration
│   └── (environment-specific files)
├── data/                                # Data storage (if applicable)
│   └── .gitkeep
├── docs/                                # Additional documentation
│   └── ARCHITECTURE.md                  # Project-specific architecture (optional)
└── __tests__/                           # Tests (or co-located with source)
    └── (test files)
```

## Required Files

### 1. PROJECT_CONTEXT.md

**Purpose:** Provides context for AI agents working on the project.

**Template:**

```markdown
# [Project Name] - Project Context

> **For AI Agents**: This document provides project-specific context for working on [Project Name]. Read this BEFORE making any changes to this project.

## Quick Reference

- **Project Type:** [e.g., Node.js webhook server, Discord bot, API service]
- **Primary Language:** [TypeScript, JavaScript, Python, etc.]
- **Architecture Pattern:** [Coordinator/Manager/Service, MVC, etc.]
- **Testing Approach:** Black-box contract testing
- **Current Status:** [🚧 In Development, ✅ Production-ready]

## Project Overview

[Brief description of what this project does and why it exists]

### Core Features

- [Feature 1]
- [Feature 2]
- [Feature 3]

## Architecture

This project strictly follows the patterns defined in the root-level architecture documents:

### Adherence to Root Guidelines

1. **AGENTS.md Compliance:**
   - ✅ [List specific compliance points]

2. **AGENTS_TYPESCRIPT.md Compliance:** (if applicable)
   - ✅ [List specific compliance points]

3. **ARCHITECTURE.md Compliance:**
   - ✅ [List specific compliance points]

### Project-Specific Patterns

[Describe any project-specific patterns or deviations from root guidelines, with justification]

## Directory Structure

[Show the actual directory structure of your project]

## Key Files for AI Agents

### Must-Read Before Editing:

1. **[src/main-file.ts](./src/main-file.ts)**
   - [Description of what this file does]

2. **[config/config-file.ts](./config/config-file.ts)**
   - [Description of what this file does]

## Testing Strategy

[Describe your testing approach, test distribution, and key test files]

## Deployment Context

[Describe how this project is deployed, what environments exist, and key deployment notes]

## Common Tasks for AI Agents

### [Task Name]

[Step-by-step instructions for common tasks]

## Common Pitfalls to Avoid

### ❌ Don't Do This:

[List common mistakes specific to this project]

### ✅ Best Practices:

[List project-specific best practices]

## Environment Variables

[List and describe all required environment variables]

## Useful Commands

[List common commands for development, testing, building, deployment]

## Remember

This project is part of a larger repository with **isolated projects**. Do NOT:
- ❌ Create shared utilities outside this project folder
- ❌ Reference code from other projects
- ❌ Create cross-project dependencies

Code duplication across projects is acceptable and expected.
```

---

### 2. README.md

**Purpose:** User-facing documentation for the project.

**Template:**

```markdown
# [Project Name]

[Brief description of the project in 1-2 sentences]

## Current Status

**Phase X: [Phase Name]** [✅ Complete / 🚧 In Progress / 📋 Planned]

### Features Implemented

- ✅ [Feature 1]
- ✅ [Feature 2]
- 🚧 [Feature 3 - In Progress]
- 📋 [Feature 4 - Planned]

## Architecture

[High-level architecture overview]

Following clean architecture patterns:

- **Coordinators**: [Description]
- **Services**: [Description]
- **Models**: [Description]

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for detailed architecture documentation (if applicable).

## Prerequisites

- [Prerequisite 1]
- [Prerequisite 2]
- [Prerequisite 3]

## Installation

\```bash
# Install dependencies
[package manager] install

# Build
[package manager] build
\```

## Configuration

### 1. Create `.env` file

\```bash
# [Configuration section]
KEY=value
\```

### 2. [Additional configuration steps]

## Development

\```bash
# Run in development mode
[command]

# Run tests
[command]

# Lint code
[command]
\```

## Production Deployment

[Deployment instructions or link to DEPLOYMENT.md]

## Testing

[Testing instructions]

## API Endpoints (if applicable)

### [Endpoint Name]

\```
[HTTP METHOD] /path
\```

## Project Structure

\```
[Show directory structure]
\```

## Contributing

This project follows strict architectural guidelines:

- **Single Responsibility**: Each class/service does one thing well
- **Dependency Injection**: Dependencies injected via constructors
- **Black-Box Testing**: Test public contracts, not implementation
- **File Size Limits**: Max 500 lines per file

See [AGENTS.md](../AGENTS.md) for coding guidelines.

## License

[License]
```

---

### 3. DEPLOYMENT.md (if applicable)

**Purpose:** Deployment instructions and operational procedures.

**Template:**

```markdown
# [Project Name] - Deployment Guide

## Deployment Options

### Option 1: [Deployment Method 1]

[Instructions]

### Option 2: [Deployment Method 2]

[Instructions]

## Environment Setup

[Environment-specific setup instructions]

## Monitoring & Observability

[Monitoring setup instructions]

## Troubleshooting

[Common issues and solutions]
```

---

## Naming Conventions

### Project Names
- **Format:** `kebab-case`
- **Examples:**
  - ✅ `github-pr-notifier`
  - ✅ `ticket-bot`
  - ✅ `calendar-reminder-bot`
  - ❌ `GitHubPRNotifier` (PascalCase)
  - ❌ `github_pr_notifier` (snake_case)

### File Names

**TypeScript/JavaScript:**
- Classes: `PascalCase.ts` (e.g., `PRCoordinator.ts`)
- Utilities: `camelCase.ts` (e.g., `logger.ts`)
- Interfaces: `IPascalCase.ts` (e.g., `IDiscordService.ts`)
- Tests: `*.test.ts` (e.g., `PRCoordinator.test.ts`)

**Configuration:**
- `kebab-case.json` (e.g., `discord-messages.json`)
- `.env` files: `.env.example`, `.env.development`, `.env.production`

**Documentation:**
- `SCREAMING_SNAKE_CASE.md` (e.g., `README.md`, `DEPLOYMENT.md`, `PROJECT_CONTEXT.md`)

---

## Architecture Guidelines

All projects in this repository MUST follow the guidelines in:

1. **[AGENTS.md](../AGENTS.md)** - General principles
   - Ask questions first
   - Single responsibility
   - File size limits (500 lines max)
   - Black-box testing
   - No progress files

2. **[AGENTS_TYPESCRIPT.md](../AGENTS_TYPESCRIPT.md)** - TypeScript patterns (if applicable)
   - Coordinator/Manager/Service patterns
   - Dependency injection
   - Event-driven communication
   - Interface-based services

3. **[ARCHITECTURE.md](../ARCHITECTURE.md)** - Architecture patterns
   - Separation of concerns
   - Encapsulation
   - Testability
   - OOP principles

---

## Testing Requirements

Every project MUST have:

1. **Comprehensive test suite** covering:
   - Unit tests (80%)
   - Integration tests (15%)
   - E2E tests (5%)

2. **Black-box contract tests**:
   - Test public APIs only
   - Don't test implementation details
   - Mock external dependencies

3. **Test documentation**:
   - Document testing strategy
   - Provide examples of how to run tests
   - Explain test structure

---

## Git Configuration

### .gitignore

Each project should have its own `.gitignore` that includes:

```gitignore
# Dependencies
node_modules/
dist/
build/

# Environment files
.env
.env.local
.env.*.local
*.env

# Configuration (with secrets)
config/user-mappings.json
config/credentials.json

# Data/State
data/*.json
!data/.gitkeep

# Logs
*.log
logs/

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

### Example Files

Always provide example configuration files:
- `.env.example`
- `config/user-mappings.example.json`
- `config/credentials.example.json`

---

## Documentation Standards

### Code Comments

- Use JSDoc for all public methods
- Document parameters, return values, and examples
- Explain "why", not "what"

**Example:**

```typescript
/**
 * Handle PR opened event from GitHub webhook
 * 
 * Creates a Discord message with PR details and a thread for discussion.
 * Maps GitHub usernames to Discord mentions if mapping exists.
 * 
 * @param payload - GitHub webhook payload
 * @throws {Error} If Discord service fails to create message
 */
async handlePROpened(payload: GitHubWebhookPayload): Promise<void> {
  // Implementation
}
```

### README Requirements

Every project README must include:
- ✅ Project description and status
- ✅ Architecture overview
- ✅ Prerequisites and installation
- ✅ Configuration instructions
- ✅ Development commands
- ✅ Testing instructions
- ✅ Deployment information

---

## Checklist for New Projects

Before submitting a new project, verify:

- [ ] Project follows kebab-case naming
- [ ] `PROJECT_CONTEXT.md` exists with complete context
- [ ] `README.md` exists with comprehensive documentation
- [ ] `.gitignore` configured properly
- [ ] Example configuration files provided
- [ ] Dependencies documented in `package.json` (or equivalent)
- [ ] Tests implemented (80/15/5 pyramid)
- [ ] All tests passing
- [ ] Linting/formatting configured and passing
- [ ] No shared code with other projects
- [ ] No cross-project dependencies
- [ ] Architecture follows root-level guidelines
- [ ] Deployment instructions provided (if applicable)

---

## Example Projects

See existing projects for reference:

- **[github-pr-notifier](../github-pr-notifier/)** - Node.js webhook server with Discord integration
  - Good example of Coordinator/Manager/Service pattern
  - Comprehensive testing (110 tests)
  - Multi-environment deployment
  - Template-based customization

---

## Questions?

For questions about:
- **Architecture patterns**: See [ARCHITECTURE.md](../ARCHITECTURE.md)
- **TypeScript guidelines**: See [AGENTS_TYPESCRIPT.md](../AGENTS_TYPESCRIPT.md)
- **General principles**: See [AGENTS.md](../AGENTS.md)
- **Existing projects**: Check their `PROJECT_CONTEXT.md` and `README.md`
