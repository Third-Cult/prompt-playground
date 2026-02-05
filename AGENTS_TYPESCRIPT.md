# AI Agent Ruleset for TypeScript Applications

**Note**: This document contains TypeScript-specific patterns and practices. For general principles that apply across all languages, see [AGENTS.md](./AGENTS.md).

## Quick Reference

- **General Guidelines**: See [AGENTS.md](./AGENTS.md) for communication style, file size limits, and core principles
- **Architecture Spec**: See [ARCHITECTURE.md](./ARCHITECTURE.md) for complete pattern definitions
- **Testing Approach**: Black-box contract tests (test public API, not implementation)
- **Primary Patterns**: Coordinator, Controller, Manager, Service
- **Key Principle**: Separation of concerns through OOP and dependency injection

---

## Pattern Selection Guide

### When to Use Each Pattern

| Pattern | Use When... | Example |
|---------|------------|---------|
| **Coordinator** | Managing a root-level feature domain with multiple concerns | `IdentityCoordinator`, `SessionCoordinator`, `StreamingCoordinator` |
| **Controller** | Managing a user flow with distinct phases (state machine) | `QuickstartController`, `OnboardingController`, `CheckoutController` |
| **Manager** | Splitting a coordinator's concern into focused logic | `LoginProfileManager`, `TimerManager`, `AnalyticsManager` |
| **Service** | Integrating with external systems or platform APIs | `IpcService`, `RealtimeService`, `DatabaseService` |

### Decision Tree

```
Is this an external integration (API, database, IPC)?
├─ YES → Service
└─ NO ↓

Is this a root-level feature (authentication, sessions, streaming)?
├─ YES → Coordinator
└─ NO ↓

Is this a user flow with phases (onboarding, checkout, quickstart)?
├─ YES → Controller
└─ NO ↓

Is this a focused concern within a feature?
└─ YES → Manager
```

---

## TypeScript File Size Limits

| File Type | Soft Limit | Hard Limit | Action When Exceeded |
|-----------|-----------|-----------|---------------------|
| Coordinator | 400 lines | 500 lines | Split into more managers |
| Controller | 600 lines | 800 lines | Extract managers or split phases |
| Manager | 200 lines | 300 lines | Split into multiple managers |
| Service | 300 lines | 400 lines | Split by concern or protocol |

**How to Split**:
1. Identify distinct responsibilities
2. Create a manager for each responsibility
3. Move logic to managers, keep only orchestration in coordinator
4. Use folders to group related managers: `coordinators/identity/managers/`

---

## TypeScript-Specific Practices

### Dependency Injection

✅ **CORRECT**: Inject dependencies via constructor
```typescript
class Manager {
  constructor(
    private stores: FeatureStores,
    private someService: ISomeService
  ) {}
}
```

❌ **WRONG**: Lambda getters or global access
```typescript
class Manager {
  constructor(
    private getState: () => State,  // ❌ Don't do this
  ) {}
  
  someMethod() {
    const state = globalState.get();  // ❌ Don't do this
  }
}
```

### Constructor Cleanliness

✅ **CORRECT**: Keep constructors simple
```typescript
constructor() {
  super('FeatureCoordinator', {} as FeatureState);
  this.stores = createFeatureStores();
  this.managers = {
    manager: new Manager(this.stores),
  };
}

protected async onInit(): Promise<void> {
  // Heavy initialization here
  await this.loadData();
  this.managers.manager.init();
}
```

❌ **WRONG**: Heavy work in constructor
```typescript
constructor() {
  super('FeatureCoordinator', {} as FeatureState);
  
  // ❌ Don't do async work here
  this.loadData();
  
  // ❌ Don't call external services here
  this.apiService.connect();
}
```

### Naming Conventions

**Coordinators:**
- Pattern: `[Feature]Coordinator`
- Examples: `IdentityCoordinator`, `SessionCoordinator`, `StreamingCoordinator`

**Controllers:**
- Pattern: `[Feature]Controller` or `[Feature]Coordinator` (both acceptable)
- Examples: `QuickstartController`, `OnboardingController`, `CheckoutController`

**Managers:**
- Pattern: `[Concern]Manager`
- Examples: `LoginProfileManager`, `TimerManager`, `AnalyticsManager`

**Services:**
- Pattern: `[Resource]Service` (class) and `I[Resource]Service` (interface)
- Examples: `IpcService` / `IIpcService`, `RealtimeService` / `IRealtimeService`

**Events:**
- Pattern: Semantic, past-tense action verbs
- Examples: `authenticated`, `machineIdSet`, `allPlayersLeft`, `matchFound`
- **NOT**: `stateChanged`, `updated`, `data`

**Methods:**
- Getters: `getSomeValue()`, `isSomeCondition()`, `hasSomeProperty()`
- Actions: `performAction()`, `startFlow()`, `cancelOperation()`

---

## Testing Rules

### Running Tests

**Run individual test files** (faster than full suite):
```bash
node "node_modules/jest/bin/jest.js" "<path_to_test_file>" -c "<path_to_jest_config>"
```

**Example - Run specific test file:**
```bash
node "node_modules/jest/bin/jest.js" "c:/Dev/playcast-apps/apps/host/host-frontend/src/api/modules/MessageRouter.test.ts" -c "c:/Dev/playcast-apps/apps/host/host-frontend/jest.config.ts"
```

**Example - Run specific test suite within a file:**
```bash
node "node_modules/jest/bin/jest.js" "c:/Dev/playcast-apps/apps/host/host-frontend/src/tests/math.test.ts" -c "c:/Dev/playcast-apps/apps/host/host-frontend/jest.config.ts" -t "Math Sanity Test"
```

**Run full test suite:**
```bash
yarn nx run host-frontend:test
```

### What TO TEST

✅ **Public API methods** - The contract
```typescript
describe('FeatureCoordinator', () => {
  it('getAuthId returns current auth ID', () => {
    coordinator.setAuthId('user123');
    expect(coordinator.getAuthId()).toBe('user123');
  });
});
```

✅ **Event emissions** - Verify semantic events fire correctly
```typescript
describe('FeatureCoordinator events', () => {
  it('emits authenticated event when user logs in', () => {
    let emitted = false;
    
    coordinator.events.authenticated.addListener(() => {
      emitted = true;
    });
    
    coordinator.setAuthId('user123');
    expect(emitted).toBe(true);
  });
});
```

✅ **State transitions** - For controllers with phases
```typescript
describe('FlowController', () => {
  it('transitions from loading to ready', async () => {
    const controller = new FlowController();
    await controller.init();
    expect(controller.getState().currentState.phase).toBe('ready');
  });
});
```

### What NOT TO TEST

❌ **Private methods** - These are implementation details
❌ **Manager internals in coordinator tests** - Test managers separately
❌ **Store internals** - Don't access private stores in tests
❌ **Implementation details that can change** - Test behavior, not how it works

---

## Templates

### Template: New Coordinator

```typescript
import { FeatureCoordinator } from '../_types/coordinator';
import { CoordinatorEvent } from '../_types/events';
import type { FeatureStores } from './stores';
import { createFeatureStores } from './stores';
import { SomeManager } from './managers/SomeManager';

/**
 * [Feature]Coordinator - Manages [feature domain]
 *
 * Responsibilities:
 * - [Responsibility 1]
 * - [Responsibility 2]
 */
class FeatureCoordinator extends FeatureCoordinator<FeatureState> {
  private readonly stores: FeatureStores;
  private managers: {
    some: SomeManager;
  };

  public events = {
    someEvent: new CoordinatorEvent<{ data: string }>(),
  };

  constructor() {
    super('[Feature]Coordinator', {} as FeatureState);
    this.stores = createFeatureStores();
    this.managers = {
      some: new SomeManager(this.stores),
    };
  }

  protected async onInit(): Promise<void> {
    this.setupEventEmitters();
    this.managers.some.init();
  }

  private setupEventEmitters(): void {
    // Set up event emitters
  }

  // ========================================
  // Public API - Getters (READ)
  // ========================================

  public getSomeValue(): string {
    return this.stores.someStore.currentState;
  }

  // ========================================
  // Public API - Actions (WRITE)
  // ========================================

  /**
   * Update value with validation and business logic
   * 
   * NOTE: Avoid public setters! Use action methods.
   */
  public async updateValue(value: string): Promise<void> {
    if (!value) throw new Error('Value cannot be empty');
    this.stores.someStore.updateState({ value });
    this.events.someEvent.emit({ data: value });
  }
}

export const featureCoordinator = new FeatureCoordinator();
```

### Template: New Manager

```typescript
import type { FeatureStores } from '../stores';
import type { ISomeService } from '../../../services/interfaces';

/**
 * [Concern]Manager
 *
 * Responsibilities:
 * - [Single responsibility description]
 */
export class ConcernManager {
  constructor(
    private stores: FeatureStores,
    private someService: ISomeService
  ) {}

  init(): void {
    this.stores.someStore.addListener(this.onStoreChange.bind(this));
    console.log('[ConcernManager] Initialized');
  }

  async performAction(param: string): Promise<void> {
    console.log('[ConcernManager] Performing action:', param);
    
    this.stores.someStore.updateState({ loading: true });

    try {
      const result = await this.someService.doSomething(param);
      this.stores.someStore.updateState({ 
        loading: false,
        data: result 
      });
    } catch (error) {
      console.error('[ConcernManager] Action failed:', error);
      this.stores.someStore.updateState({ 
        loading: false,
        error: error.message 
      });
      throw error;
    }
  }

  private onStoreChange(state: SomeState): void {
    // React to state changes
  }
}
```

### Template: New Controller

```typescript
import { FeatureController, BaseFeatureState } from '../_base/FeatureController';

export type FlowPhase = 'initial' | 'loading' | 'ready' | 'error';

export interface FlowState extends BaseFeatureState {
  phase: FlowPhase;
}

export class FlowController extends FeatureController<FlowState> {
  constructor() {
    super({
      status: 'idle',
      phase: 'initial',
    });
  }

  protected async onInit(): Promise<void> {
    this.transitionTo('loading');
    await this.loadData();
  }

  private transitionTo(phase: FlowPhase): void {
    const previousPhase = this.state.currentState.phase;
    console.log(`[FlowController] ${previousPhase} → ${phase}`);
    this.state.updateState({ ...this.state.currentState, phase });
  }

  private async loadData(): Promise<void> {
    // Implementation
    this.transitionTo('ready');
  }

  public debugJumpToPhase(phase: FlowPhase): void {
    if (process.env.NODE_ENV !== 'development' && process.env.NODE_ENV !== 'test') {
      throw new Error('debugJumpToPhase only available in dev/test');
    }
    this.transitionTo(phase);
  }
}
```

### Template: New Service

```typescript
// interfaces/ISomeService.ts
export interface ISomeService {
  doSomething(param: string): Promise<Result>;
  subscribe(callback: (data: Data) => void): () => void;
}

// services/SomeService.ts
export class SomeService implements ISomeService {
  private listeners: Array<(data: Data) => void> = [];

  async doSomething(param: string): Promise<Result> {
    // Implementation
  }

  subscribe(callback: (data: Data) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(data: Data): void {
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error('[SomeService] Listener error:', error);
      }
    });
  }
}
```

---

## Architecture Drift Prevention

### Red Flags 🚨

Watch for these signs that code is drifting from the architecture:

1. **Public setters that directly mutate state**
   - ❌ `coordinator.setSomeValue(value) { this.stores.someStore.updateState({ value }); }`
   - ✅ `coordinator.updateConfiguration(config) { /* validate, process, update, emit */ }`

2. **Coordinator calling services directly**
   - ❌ `coordinator.someMethod() { await apiService.fetch(); }`
   - ✅ `coordinator.someMethod() { await this.managers.api.fetch(); }`

3. **Manager containing orchestration logic**
   - ❌ Manager has complex if/else chains coordinating multiple operations
   - ✅ Manager focuses on single concern, coordinator orchestrates

4. **Public methods only used internally**
   - ❌ `public internalHelper()` that's only called from within the class
   - ✅ Make it `private` if not part of public contract

5. **Complex logic in constructors**
   - ❌ `constructor() { this.loadData(); this.connectAPI(); }`
   - ✅ Move to `onInit()` method

6. **Tight coupling between unrelated features**
   - ❌ `identityCoordinator.stores.auth` accessed from `sessionCoordinator`
   - ✅ Use public methods or events: `identityCoordinator.getAuthId()`

7. **Accessing internal stores from outside**
   - ❌ `coordinator.stores.someStore.currentState`
   - ✅ `coordinator.getSomeValue()`

8. **God classes (>1000 lines)**
   - ❌ Single coordinator handles 10+ concerns
   - ✅ Split into multiple managers (each <300 lines)

9. **No dependency injection**
   - ❌ `class Manager { constructor() { this.api = new API(); } }`
   - ✅ `class Manager { constructor(private api: IAPI) {} }`

### Pre-Review Checklist

Before submitting code for review, verify:

- [ ] **File sizes**: All files under soft limits
- [ ] **Dependency injection**: All dependencies passed via constructor
- [ ] **Private stores**: No external access to coordinator stores
- [ ] **Semantic events**: Events have clear, meaningful names
- [ ] **Public API**: Clear separation of public vs private methods
- [ ] **Type safety**: No `any` types without justification
- [ ] **Tests**: Black-box contract tests exist for public API
- [ ] **Documentation**: JSDoc comments on all public methods

---

## Common TypeScript Mistakes

### Mistake 1: Public Setters (Direct State Mutation)

❌ **WRONG**:
```typescript
class FeatureCoordinator {
  // Direct state mutation with no validation or business logic
  public setSomeValue(value: string): void {
    this.stores.someStore.updateState({ value });
  }
}

// External code can corrupt state
coordinator.setSomeValue(''); // No validation!
```

✅ **CORRECT**:
```typescript
class FeatureCoordinator {
  // Action method with validation, business logic, and side effects
  public async updateConfiguration(config: ConfigUpdate): Promise<void> {
    // Validate
    if (!this.isValidConfig(config)) {
      throw new Error('Invalid configuration');
    }

    // Process
    const processed = this.processConfig(config);

    // Update state (internal)
    this.stores.config.updateState(processed);

    // Side effects
    this.events.configChanged.emit({ config: processed });
  }
}

// External code uses validated actions
await coordinator.updateConfiguration({ theme: 'dark' });
```

**Exception: Message Handlers**

Public methods that handle IPC/realtime messages MAY update state directly, but should still validate:

```typescript
/**
 * Handle machine credentials from realtime API
 */
handleMachineCredentialsMessage(credentials: Credentials): void {
  // Validate message
  if (!this.isValidCredentials(credentials)) {
    console.error('[Coordinator] Invalid credentials');
    return;
  }

  // Update state
  this.stores.credentials.updateState(credentials);
}
```

### Mistake 2: Testing Implementation Details

❌ **WRONG**:
```typescript
it('calls manager.process exactly once', () => {
  const spy = jest.spyOn(manager, 'process');
  coordinator.doSomething();
  expect(spy).toHaveBeenCalledTimes(1);
});
```

✅ **CORRECT**:
```typescript
it('processes data correctly', () => {
  coordinator.doSomething();
  expect(coordinator.getProcessedData()).toBe(expected);
});
```

### Mistake 3: Breaking Encapsulation

❌ **WRONG**:
```typescript
// In another coordinator
const authState = identityCoordinator.stores.auth.currentState;
```

✅ **CORRECT**:
```typescript
// In another coordinator
const authId = identityCoordinator.getAuthId();
```

### Mistake 4: God Classes

❌ **WRONG**:
```typescript
// IdentityCoordinator.ts (1200 lines)
class IdentityCoordinator {
  // 400 lines of login logic
  // 300 lines of attestation logic
  // 250 lines of machine ID logic
  // 250 lines of credentials logic
}
```

✅ **CORRECT**:
```typescript
// IdentityCoordinator.ts (350 lines)
class IdentityCoordinator {
  private managers = {
    loginProfile: new LoginProfileManager(this.stores),
    attestation: new AttestationFlowManager(this.stores),
    machineId: new MachineIdManager(this.stores),
    credentials: new CredentialsManager(this.stores),
  };
}
```

### Mistake 5: Skipping Dependency Injection

❌ **WRONG**:
```typescript
class Manager {
  private api = new ApiService();  // Hard dependency
  
  constructor() {}
}
```

✅ **CORRECT**:
```typescript
class Manager {
  constructor(private api: IApiService) {}
}

// In coordinator
this.managers = {
  manager: new Manager(serviceContainer.api),
};
```

### Mistake 6: Generic Event Names

❌ **WRONG**:
```typescript
public events = {
  stateChanged: new CoordinatorEvent<void>(),  // What changed?
  updated: new CoordinatorEvent<void>(),       // What updated?
  data: new CoordinatorEvent<any>(),           // What data?
};
```

✅ **CORRECT**:
```typescript
public events = {
  authenticated: new CoordinatorEvent<{ authId: string }>(),
  machineIdSet: new CoordinatorEvent<{ machineId: string }>(),
  attestationComplete: new CoordinatorEvent<{ success: boolean }>(),
};
```

---

## Quick Wins

### Before You Start Coding

1. **Ask clarifying questions**: Don't assume - verify requirements and constraints
2. **Read the architecture spec**: [ARCHITECTURE.md](./ARCHITECTURE.md)
3. **Find a similar example**: Look at existing coordinators/controllers
4. **Sketch the structure**: What managers do you need? What's the public API?
5. **Check file sizes**: Will this fit in the limits? If not, plan to split

### While You're Coding

1. **Keep it focused**: One concern per class
2. **Use dependency injection**: Pass dependencies in constructor
3. **Make stores private**: Never expose them directly
4. **Emit semantic events**: Clear, meaningful names
5. **Write black-box tests**: Test public behavior, not implementation

### Before You Submit

1. **Run linter**: Fix all linting errors
2. **Check file sizes**: Split if over limits
3. **Review public API**: Is it clean and intuitive?
4. **Write tests**: Black-box contract tests for public API
5. **Add documentation**: JSDoc comments on all public methods

---

## Where to Find Examples

### Real Code Examples

1. **FeatureCoordinator**: `apps/host/host-frontend/src/coordinators/identity/IdentityCoordinator.ts`
2. **FeatureController**: `apps/marketing/src/features/quickstart/QuickstartCoordinator.ts`
3. **Managers**: `LoginProfileManager`, `MachineIdManager`, `TimerManager`
4. **Services**: `ServiceContainer`, `IpcService`, `RealtimeService`

### Documentation

- **Architecture Spec**: [ARCHITECTURE.md](./ARCHITECTURE.md) - Complete pattern definitions
- **General Guidelines**: [AGENTS.md](./AGENTS.md) - Cross-language principles

---

## Pre-Code Checklist (TypeScript)

Before writing TypeScript code:

- [ ] Have I asked clarifying questions? (See [AGENTS.md](./AGENTS.md))
- [ ] Have I read [ARCHITECTURE.md](./ARCHITECTURE.md)?
- [ ] Do I know which pattern to use (Coordinator, Controller, Manager, Service)?
- [ ] Have I defined the public contract (methods, events, getters)?
- [ ] Is this testable with black-box tests?
- [ ] Am I using dependency injection?
- [ ] Have I checked the file size limit (500 lines max)?
- [ ] Have I looked for similar examples in the codebase?

---

## Summary: TypeScript Golden Rules

1. **Pattern Selection**: Use Coordinator, Controller, Manager, Service appropriately
2. **Dependency Injection**: Inject stores/services via constructor
3. **Encapsulation**: Hide stores, expose methods
4. **Events for Communication**: Use semantic events between coordinators
5. **Black-Box Testing**: Test public contracts, not implementation
6. **Action Methods**: Avoid public setters, use action methods with validation
7. **File Size Limits**: Split coordinators/managers when files exceed limits

**When in doubt, reference [ARCHITECTURE.md](./ARCHITECTURE.md) or find a similar example in the codebase.**
