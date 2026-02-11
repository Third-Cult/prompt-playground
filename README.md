# Internal Tools & Process Automation

> A collection of isolated projects supporting internal team coordination and project management

## Overview

This repository houses several independent projects, each focused on automating specific internal processes. Each project is self-contained and can be deployed independently.

## Projects

### 🔔 [GitHub PR Notifier](./github-pr-notifier)
Automated Discord notifications for GitHub pull request events with user mapping and customizable templates.

**Status:** ✅ Active  
**Tech Stack:** Node.js, Express, Discord.js  
[Documentation](./github-pr-notifier/README.md)

### 🎫 Ticket Bot *(Planned)*
Discord bot for creating and managing tickets across GitHub Issues and Jira.

**Status:** 📋 Planned  
**Tech Stack:** TBD

### 📅 Calendar Reminder Bot *(Planned)*
Discord bot for event reminders with Google Calendar integration.

**Status:** 📋 Planned  
**Tech Stack:** TBD

## Repository Structure

```
/
├── AGENTS.md                    # AI agent guidelines (general principles)
├── AGENTS_TYPESCRIPT.md         # TypeScript-specific patterns
├── ARCHITECTURE.md              # Architecture patterns and practices
├── github-pr-notifier/          # Independent project
│   ├── PROJECT_CONTEXT.md       # Project-specific context
│   ├── README.md                # Project documentation
│   └── src/                     # Source code
├── ticket-bot/                  # Independent project (future)
└── calendar-reminder-bot/       # Independent project (future)
```

## For AI Agents / LLM Assistants

When working in this repository, you **MUST** follow these guidelines:

1. **Read the foundational documents:**
   - [AGENTS.md](./AGENTS.md) - General principles and guidelines
   - [AGENTS_TYPESCRIPT.md](./AGENTS_TYPESCRIPT.md) - TypeScript-specific patterns
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture patterns

2. **Project-specific context:**
   - Each project has a `PROJECT_CONTEXT.md` with project-specific information
   - Read this BEFORE making changes to any project

3. **Key Principles:**
   - Projects are **completely isolated** - no shared code between projects
   - Follow OOP principles, dependency injection, and black-box testing
   - Ask questions before making assumptions

## Getting Started

### For New Projects
See [docs/PROJECT_TEMPLATE.md](./docs/PROJECT_TEMPLATE.md) for guidance on creating new projects in this repository.

## Project Isolation Philosophy

Each project in this repository is **completely isolated**:

- ✅ **No shared code** - projects may duplicate utilities if needed
- ✅ **Independent dependencies** - each project manages its own `package.json`
- ✅ **Separate deployment** - projects deploy independently
- ✅ **Isolated testing** - no cross-project test dependencies

**Why?** This enables:
- Projects can evolve independently without breaking others
- Different technologies/frameworks per project
- Easy extraction to separate repositories if needed
- Clear ownership and boundaries

**Trade-off:** Code duplication is acceptable and expected. The benefits of independence outweigh the cost of duplication.

## Documentation

Technical documentation lives within each project folder. See each project's `README.md` for:
- Architecture details
- API documentation
- Deployment guides
- Testing strategies

## Contributing

Please read our [Contributing Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md) before submitting any changes.

**Note:** This repository is for internal experimentation and is not actively maintained for external contributions.

## Creating a New Project

When adding a new project to this repository:

1. **Follow the template structure** (see [docs/PROJECT_TEMPLATE.md](./docs/PROJECT_TEMPLATE.md))
2. **Use kebab-case naming** (e.g., `new-project-name`)
3. **Create required files:**
   - `PROJECT_CONTEXT.md` - Context for AI agents
   - `README.md` - Project documentation
   - `DEPLOYMENT.md` - Deployment instructions (if applicable)
4. **Ensure complete isolation** - no dependencies on other projects
5. **Follow architecture guidelines** - reference root-level `AGENTS.md`, `AGENTS_TYPESCRIPT.md`, `ARCHITECTURE.md`

## License

[MIT License](./LICENSE)

---

© 2025 Third Cult
