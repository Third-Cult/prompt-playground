# AI Agent Guidelines

This document contains general principles and guidelines that apply across all languages and technologies in this codebase.

## Language-Specific Documentation

For detailed patterns and practices specific to each language:

- **TypeScript/JavaScript**: See [AGENTS_TYPESCRIPT.md](./AGENTS_TYPESCRIPT.md)
- **C++**: See [AGENTS_CPP.md](./AGENTS_CPP.md)
- **Architecture Details**: See [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Core Philosophy

These principles apply to all code in this repository, regardless of language:

1. **Ask Questions First**: Never assume - always clarify requirements before implementing
2. **Single Responsibility**: Every class/function does one thing well
3. **Separation of Concerns**: Clear boundaries between components
4. **Dependency Injection**: Inject dependencies explicitly, avoid hidden coupling
5. **Encapsulation**: Hide implementation details, expose clean public APIs
6. **Testability**: Write code that can be tested without knowing internal implementation

---

## Communication Style

### DO: Communicate Progress in the Conversation

Explain what you did and why in the conversation:

```markdown
I've updated the IdentityCoordinator to use action methods instead of 
public setters. The new `updateAuthState()` method now validates the 
auth data and emits a semantic event when authentication completes.

I've also added tests to verify the event emission works correctly.
```

### DON'T: Write Transient Progress Files

❌ **AVOID CREATING THESE FILES:**

```
TASK_1_COMPLETE.md
PHASE_17_REFACTOR_DONE.md
IMPLEMENTATION_STATUS.md
PROGRESS_TRACKER.md
REFACTORING_COMPLETE.md
```

**Why?** These files clutter the workspace and create noise in version control. Progress should be communicated in the conversation, not persisted to disk.

### When Files Are Acceptable

- ✅ User explicitly requests a file be created
- ✅ Creating actual documentation (README.md, ARCHITECTURE.md) that will be maintained
- ✅ Creating implementation files (source code, tests, configs)

### When Files Are NOT Acceptable

- ❌ Tracking task completion status
- ❌ Logging what you just did
- ❌ Creating "proof of work" summaries
- ❌ Any file with "COMPLETE", "DONE", "STATUS", "PROGRESS" in the name (unless explicitly requested)

---

## Ask Questions, Don't Assume

**CRITICAL**: When creating something new or making architectural decisions, **ALWAYS ask clarifying questions** before implementing.

### Pattern to Follow

1. **Understand the request**
2. **Ask clarifying questions** (even if you think you know the answer)
3. **Wait for confirmation**
4. **Implement based on the answers**

### Example Interaction

```
User: "Create a new SessionManager for handling player sessions"

AI: "I can help you create a SessionManager. Before I start, I have a few 
questions to ensure I build exactly what you need:

1. What language/framework? (TypeScript, C++, etc.)
2. What are the key responsibilities?
3. What dependencies will it need?
4. Are there any existing patterns in the codebase I should follow?

Do you have any other specific requirements or constraints I should know about?"
```

### When to Ask Questions

- Creating new components or classes
- Making architectural decisions (where to put logic, how to structure)
- Unclear requirements or ambiguous requests
- Trade-offs between different approaches
- When you're about to make an assumption

**Golden Rule**: If you're about to write "I assume..." or "I'll guess that...", **STOP and ask a question instead**.

---

## File Length and Structure

**CRITICAL**: Enforce strict file size limits to maintain readability and modularity.

### General Limits

- **Never allow a file to exceed 500 lines**
- **If a file approaches 400 lines, break it up immediately**
- **Treat 1000 lines as unacceptable, even temporarily**

### How to Split Large Files

1. **Identify distinct responsibilities**
2. **Create focused classes/modules for each responsibility**
3. **Use folders and naming conventions to keep small files logically grouped**
4. **Keep only orchestration in the main file, delegate to smaller modules**

---

## Object-Oriented Programming Principles

### OOP First

- Every functionality should be in a dedicated class, struct, or interface
- Favor composition over inheritance
- Code must be built for reuse, not just to "make it work"

### Single Responsibility Principle

- Every file, class, and function should do one thing only
- If it has multiple responsibilities, split it immediately
- Each component should be laser-focused on one concern

### Modular Design

- Code should connect like Lego — interchangeable, testable, and isolated
- Ask: "Can I reuse this class in a different module or project?" If not, refactor it
- Reduce tight coupling between components
- Favor dependency injection or interfaces

### Function and Class Size

- Keep functions under 30–40 lines
- If a class is over 200 lines, assess splitting into smaller helper classes

### Naming and Readability

- All class, method, and variable names must be descriptive and intention-revealing
- Avoid vague names like `data`, `info`, `helper`, or `temp`

### Scalability Mindset

- Always code as if someone else will scale this
- Include extension points from day one
- Think about future maintainability

### Avoid God Classes

- Never let one file or class hold everything
- Split into focused concerns (UI, State, Handlers, Networking, etc.)

---

## Testing Philosophy

### General Testing Principles

1. **Test the contract, not the implementation**
2. **Test public APIs, not private methods**
3. **Mock all external dependencies**
4. **Tests should be deterministic and fast**
5. **Tests should survive refactoring**

### Black-Box Testing

Write tests that verify public behavior without knowing internal implementation:

- ✅ Test public methods and their outcomes
- ✅ Test state changes visible through public API
- ✅ Test error handling and edge cases
- ❌ Don't test private methods
- ❌ Don't test implementation details
- ❌ Don't access internal state directly

### What TO TEST

- Public API methods (the contract)
- State transitions
- Error handling
- Integration between components (using real or mocked dependencies)

### What NOT TO TEST

- Private methods (implementation details)
- Internal state directly
- Third-party library behavior
- Implementation details that can change without affecting behavior

---

## Pre-Code Checklist

Before writing any code, verify:

- [ ] Have I asked clarifying questions to understand the requirements?
- [ ] Have I reviewed the relevant architecture documentation?
- [ ] Do I know which pattern/approach to use?
- [ ] Have I defined the public contract (methods, interfaces)?
- [ ] Is this testable with black-box tests?
- [ ] Am I using dependency injection?
- [ ] Have I checked the file size limit (500 lines max)?
- [ ] Have I looked for similar examples in the codebase?

---

## Architecture Patterns

### High-Level Separation

Most features should follow a clear separation:

- **Orchestration Layer**: Coordinates multiple concerns, delegates work
- **Business Logic Layer**: Implements specific domain logic
- **Integration Layer**: Handles external systems (APIs, databases, IPC)

See language-specific documentation for concrete patterns:
- **TypeScript**: Coordinator, Controller, Manager, Service patterns
- **C++**: (Documentation coming soon)

---

## Common Mistakes to Avoid

### Mistake 1: Assuming Instead of Asking

❌ **WRONG**: Immediately implementing based on assumptions
✅ **CORRECT**: Ask clarifying questions first

### Mistake 2: Creating Progress Files

❌ **WRONG**: Writing `TASK_COMPLETE.md` or `PROGRESS.md`
✅ **CORRECT**: Communicate progress in the conversation

### Mistake 3: God Classes

❌ **WRONG**: One file/class handling 10+ concerns
✅ **CORRECT**: Split into focused, single-responsibility classes

### Mistake 4: Breaking Encapsulation

❌ **WRONG**: Accessing internal state from outside
✅ **CORRECT**: Use public methods/interfaces

### Mistake 5: Testing Implementation Details

❌ **WRONG**: Testing private methods or internal state
✅ **CORRECT**: Testing public behavior and contracts

### Mistake 6: Ignoring File Size Limits

❌ **WRONG**: Letting files grow to 1000+ lines
✅ **CORRECT**: Splitting at 400-500 lines

---

## Summary: Golden Rules

1. **Ask Questions First**: Never assume - always clarify requirements before implementing
2. **Communicate in Chat**: Keep progress in the conversation, not in files
3. **File Size Limits**: Split files before they reach 500 lines
4. **Single Responsibility**: Each class/function does one thing well
5. **Dependency Injection**: Inject dependencies, don't create them
6. **Encapsulation**: Hide implementation, expose clean APIs
7. **Black-Box Testing**: Test contracts, not implementation
8. **OOP Principles**: Composition, modularity, reusability

**When in doubt, ask questions and reference the architecture documentation for your language.**
