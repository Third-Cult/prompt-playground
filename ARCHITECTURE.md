# TypeScript Architecture Specification

## Overview

This document defines the architectural patterns for TypeScript applications in this codebase. The architecture is built on **Object-Oriented Programming (OOP)** principles with a focus on **separation of concerns**, **dependency injection**, **event-driven communication**, and **black-box testability**.

### Core Philosophy

- **Single Responsibility**: Every class does one thing well
- **Composition over Inheritance**: Build complex behaviors by composing simple components
- **Encapsulation**: Hide implementation details, expose clean public APIs
- **Dependency Injection**: Inject dependencies explicitly, avoid hidden coupling
- **Event-Driven**: Coordinators communicate through semantic events, not direct calls
- **Testability**: Write code that can be tested without knowing internal implementation

---

## File Structure

All TypeScript applications should follow this standardized folder structure:

```
src/
├── coordinators/              # Feature coordinators (domain orchestrators)
│   ├── identity/
│   │   ├── IdentityCoordinator.ts
│   │   ├── IdentityCoordinator.test.ts
│   │   └── managers/          # Managers for this coordinator
│   │       ├── LoginProfileManager.ts
│   │       └── AttestationFlowManager.ts
│   ├── session/
│   │   ├── SessionCoordinator.ts
│   │   └── managers/
│   ├── pavilion/
│   │   ├── PavilionCoordinator.ts
│   │   ├── PavilionCoordinator.test.ts
│   │   └── managers/
│   └── _base/                 # Base classes (optional)
│       └── FeatureCoordinator.ts
│
├── services/                  # Infrastructure services
│   ├── MessageRouter.ts       # Message routing infrastructure
│   ├── MessageRouter.test.ts
│   ├── RealtimeService.ts     # Websocket service
│   ├── PlayjectorService.ts   # IPC service
│   └── interfaces/            # Service interfaces
│       ├── IRealtimeService.ts
│       └── IPlayjectorService.ts
│
├── config/                    # Application configuration
│   └── featureFlags.ts        # Feature flags
│
├── api/                       # Legacy API code (being refactored)
│   ├── stores/
│   └── modules/
│
└── tests/                     # Shared test utilities
    └── math.test.ts           # Sanity tests
```

### Key Principles

1. **Coordinators** go in `src/coordinators/[feature]/`
   - Each coordinator gets its own folder
   - Tests live alongside coordinators
   - Managers are nested in `managers/` subfolder

2. **Services** (infrastructure) go in `src/services/`
   - Services are infrastructure, not domain logic
   - Interfaces go in `services/interfaces/`
   - Example: `MessageRouter`, `RealtimeService`, `PlayjectorService`

3. **Config** goes in `src/config/`
   - Feature flags, environment config, constants
   - Not domain logic, just configuration

4. **Legacy code** stays in `src/api/` during migration
   - Will be gradually removed via strangler-fig pattern
   - Don't add new code here

---

## Core Patterns

### 1. Coordinator Pattern

**Definition**: A Coordinator is a root-level orchestrator that manages a complete feature domain. It delegates work to managers, exposes a public API, and emits semantic events for other coordinators to consume.

**When to Use**:
- You're building a **root-level feature** that spans multiple concerns (e.g., Identity, Session, Streaming)
- The feature needs to **coordinate multiple managers** working together
- Other parts of the application need to **read state** or **listen to events** from this feature
- The feature has a **long lifecycle** (initialized at app start, lives for the entire session)

**Characteristics**:
- Extends `FeatureCoordinator<TState>` base class
- Owns private `StateStore` instances (stores)
- Delegates work to **Managers** (composition)
- Exposes **public API methods** (getters, setters, actions)
- Emits **semantic events** via `CoordinatorEvent<T>`
- Often a **singleton** (global instance for cross-coordinator access)
- Never calls services directly (goes through managers)

**Example Structure**:

```typescript
import { FeatureCoordinator } from '../_types/coordinator';
import { CoordinatorEvent } from '../_types/events';
import type { FeatureStores } from './stores';
import { createFeatureStores } from './stores';
import { FirstManager } from './managers/FirstManager';
import { SecondManager } from './managers/SecondManager';

/**
 * FeatureCoordinator - Manages [feature domain]
 *
 * Responsibilities:
 * - [Responsibility 1]
 * - [Responsibility 2]
 * - [Responsibility 3]
 *
 * Pattern: Root-level coordinator
 * Other coordinators read from this coordinator for [domain] info
 */
class FeatureCoordinator extends FeatureCoordinator<FeatureState> {
  private readonly stores: FeatureStores;
  private managers: {
    first: FirstManager;
    second: SecondManager;
  };

  /**
   * Public events that other coordinators can listen to
   */
  public events = {
    /** Emitted when [event description] */
    someEventHappened: new CoordinatorEvent<{ data: string }>(),
    
    /** Emitted when [event description] */
    anotherEventHappened: new CoordinatorEvent<void>(),
  };

  constructor() {
    super('FeatureCoordinator', {} as FeatureState);
    this.stores = createFeatureStores();

    // Initialize managers with dependency injection
    this.managers = {
      first: new FirstManager(this.stores),
      second: new SecondManager(this.stores, someService),
    };
  }

  protected async onInit(): Promise<void> {
    console.log('[FeatureCoordinator] Initializing...');

    // Set up event emitters
    this.setupEventEmitters();

    // Initialize managers
    this.managers.first.init();
    this.managers.second.init();

    console.log('[FeatureCoordinator] Initialized');
  }

  /**
   * Set up event emitters that convert store changes into semantic events
   */
  private setupEventEmitters(): void {
    // Track previous state to detect changes
    let previousValue = this.stores.someStore.currentState;

    this.stores.someStore.addListener((state) => {
      if (state !== previousValue) {
        this.events.someEventHappened.emit({ data: state });
        previousValue = state;
      }
    });
  }

  // ========================================
  // Public API - Getters (READ)
  // ========================================

  /**
   * Get current [state description]
   */
  getSomeValue(): string {
    return this.stores.someStore.currentState;
  }

  /**
   * Check if [condition]
   */
  isSomeCondition(): boolean {
    return !!this.stores.someStore.currentState;
  }

  // ========================================
  // Public API - Actions (WRITE)
  // ========================================

  /**
   * Update configuration with validation and business logic
   * 
   * NOTE: Prefer action methods over direct setters.
   * Action methods encapsulate validation, business logic, and side effects.
   */
  async updateConfiguration(config: ConfigUpdate): Promise<void> {
    // Validate input
    if (!this.isValidConfig(config)) {
      throw new Error('Invalid configuration');
    }

    // Process and update state
    const processedConfig = this.processConfig(config);
    this.stores.someStore.updateState({
      ...this.stores.someStore.currentState,
      ...processedConfig,
    });

    // Emit semantic event
    this.events.someEventHappened.emit({ data: processedConfig });
  }

  /**
   * Delegate complex operation to manager
   */
  async performComplexOperation(param: string): Promise<void> {
    return this.managers.first.performOperation(param);
  }

  // ========================================
  // Message Handlers (for IPC/Realtime)
  // ========================================

  /**
   * Handle incoming message from external system
   * 
   * NOTE: These are acceptable for IPC/realtime message handling,
   * but should still encapsulate validation and business logic.
   */
  handleExternalMessage(data: ExternalData): void {
    // Validate message
    if (!this.isValidMessage(data)) {
      console.error('[FeatureCoordinator] Invalid message:', data);
      return;
    }

    // Update state based on external data
    this.stores.someStore.updateState(data);
  }
}

/**
 * Global singleton instance
 * Use this for cross-coordinator access
 */
export const featureCoordinator = new FeatureCoordinator();
```

**Real Example**: `IdentityCoordinator` manages authentication, machine ID, and attestation

---

### 2. Controller Pattern (State Machine)

**Definition**: A Controller is a state machine-based coordinator for linear user flows or journeys. It manages phase transitions, timers, and cleanup for scoped, ephemeral features.

**When to Use**:
- You're building a **user flow** with distinct phases (e.g., onboarding, quickstart, checkout)
- The flow has **state transitions** with clear entry/exit conditions
- The flow is **ephemeral** (created when user enters, destroyed when user exits)
- You need **timer management** (timeouts, countdowns)
- You need **cleanup on unmount** (React component lifecycle)

**Characteristics**:
- Extends `FeatureController<TState>` base class
- Manages **phase transitions** (`transitionTo(phase)`)
- Uses **scoped StateStore** (not replicated across IPC)
- Manages **timers** and **cleanup functions**
- Typically instantiated by a React hook (`useFeatureFlow()`)
- Short-lived (created on mount, destroyed on unmount)
- Delegates to **managers** for specific concerns (analytics, timers, API calls)

**Example Structure**:

```typescript
import { FeatureController, BaseFeatureState } from '../_base/FeatureController';
import { TimerManager } from './managers/TimerManager';
import { AnalyticsManager } from './managers/AnalyticsManager';

/**
 * Flow phases (state machine)
 */
export type FlowPhase =
  | 'initial'
  | 'loading'
  | 'ready'
  | 'processing'
  | 'success'
  | 'error';

export interface FlowState extends BaseFeatureState {
  phase: FlowPhase;
  // Additional state fields
  data?: string;
  errorMessage?: string;
  timerActive: boolean;
  timeRemaining: number;
}

export class FlowController extends FeatureController<FlowState> {
  private timerManager: TimerManager;
  private analyticsManager: AnalyticsManager;

  constructor() {
    super({
      status: 'idle',
      phase: 'initial',
      timerActive: false,
      timeRemaining: 60,
    });

    // Initialize managers
    this.timerManager = new TimerManager(
      this.state,
      this.onTimerExpired.bind(this)
    );
    
    this.analyticsManager = new AnalyticsManager(this.state);
  }

  protected async onInit(): Promise<void> {
    console.log('[FlowController] Initializing...');
    
    // Start initial phase
    this.transitionTo('loading');
    
    // Load data
    await this.loadInitialData();
  }

  /**
   * Transition to a new phase (state machine)
   */
  private transitionTo(phase: FlowPhase): void {
    const previousPhase = this.state.currentState.phase;
    console.log(`[FlowController] ${previousPhase} → ${phase}`);

    this.state.updateState({ 
      ...this.state.currentState, 
      phase 
    });

    // Trigger analytics
    this.analyticsManager.trackPhaseTransition(previousPhase, phase);

    // Handle phase-specific logic
    if (phase === 'ready') {
      this.timerManager.startTimer(60);
    }

    if (phase === 'success' || phase === 'error') {
      this.timerManager.stopTimer();
    }
  }

  /**
   * Public action: User clicks continue
   */
  public async continue(): Promise<void> {
    this.transitionTo('processing');
    
    try {
      await this.performAction();
      this.transitionTo('success');
    } catch (error) {
      this.state.updateState({ 
        errorMessage: error.message 
      });
      this.transitionTo('error');
    }
  }

  /**
   * Timer expired callback
   */
  private onTimerExpired(): void {
    console.log('[FlowController] Timer expired');
    this.transitionTo('error');
  }

  /**
   * Private helper: Perform async action
   */
  private async performAction(): Promise<void> {
    // Implementation
  }

  /**
   * Private helper: Load initial data
   */
  private async loadInitialData(): Promise<void> {
    // Implementation
    this.transitionTo('ready');
  }

  // ========================================
  // Debug Helpers (for testing)
  // ========================================

  /**
   * Jump to a specific phase (testing only)
   */
  public debugJumpToPhase(phase: FlowPhase): void {
    if (process.env.NODE_ENV !== 'development') {
      throw new Error('debugJumpToPhase only available in development');
    }
    this.transitionTo(phase);
  }
}
```

**Real Example**: `QuickstartCoordinator` manages the quickstart demo flow with phases like `creating_lobby`, `matchmaking`, `playing_active`

---

### 3. Manager Pattern

**Definition**: A Manager is a focused class that handles a single responsibility within a coordinator. It receives dependencies via constructor injection and implements specific business logic.

**When to Use**:
- A coordinator has **multiple distinct concerns** that should be separated
- You want to **test business logic** independently from the coordinator
- The logic is **complex enough** to warrant its own class (>50 lines)
- The concern is **reusable** across multiple coordinators

**Characteristics**:
- Plain TypeScript class (no base class required)
- Receives dependencies via **constructor injection** (stores, services, other managers)
- Focused on **one responsibility** (login flow, attestation, analytics, timers)
- Never accesses global state directly
- Never calls services outside its domain
- Returns results to coordinator via **callbacks**, **promises**, or **store updates**

**Example Structure**:

```typescript
import type { FeatureStores } from '../stores';
import type { SomeService } from '../../../services/interfaces';

/**
 * SpecificManager
 *
 * Responsibilities:
 * - Handle [specific concern]
 * - Manage [specific resource]
 *
 * Pattern: Single-responsibility manager
 */
export class SpecificManager {
  constructor(
    private stores: FeatureStores,
    private someService: SomeService
  ) {}

  /**
   * Initialize the manager - set up listeners
   */
  init(): void {
    this.stores.someStore.addListener(this.onStoreChange.bind(this));
    console.log('[SpecificManager] Initialized');
  }

  /**
   * Public method: Perform specific operation
   */
  async performOperation(param: string): Promise<void> {
    console.log('[SpecificManager] Starting operation:', param);

    // Update state
    this.stores.someStore.updateState({ loading: true });

    try {
      // Call service
      const result = await this.someService.doSomething(param);

      // Update state with result
      this.stores.someStore.updateState({ 
        loading: false,
        data: result 
      });
    } catch (error) {
      console.error('[SpecificManager] Operation failed:', error);
      this.stores.someStore.updateState({ 
        loading: false,
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Public method: Check if condition is met
   */
  shouldPerformAction(): boolean {
    const state = this.stores.someStore.currentState;
    return state.data !== null && !state.loading;
  }

  /**
   * Private method: Handle store changes
   */
  private onStoreChange(state: SomeState): void {
    // React to state changes
    if (state.data && !state.processed) {
      this.processData(state.data);
    }
  }

  /**
   * Private method: Process data
   */
  private processData(data: string): void {
    // Implementation
  }
}
```

**Real Examples**: 
- `LoginProfileManager` handles authentication flow and service connections
- `MachineIdManager` handles machine ID attestation and validation
- `TimerManager` handles AFK timeout and ad timer logic
- `AnalyticsManager` handles event tracking and ordering

---

### 4. Service Pattern

**Definition**: A Service is an interface-based abstraction for external integrations (APIs, databases, IPC, WebSockets). Services are injected into managers and provide a clean boundary between application logic and infrastructure.

**When to Use**:
- You need to **communicate with external systems** (REST API, WebSocket, database)
- You need to **abstract platform-specific code** (Electron IPC, browser APIs)
- You want to **mock external dependencies** in tests
- Multiple coordinators/managers need to use the same integration

**Characteristics**:
- Defined as **TypeScript interface** (`IServiceName`)
- Implemented as a **concrete class** that implements the interface
- Registered in **ServiceContainer** (dependency injection container)
- **Stateless** (or manages its own internal state)
- Never imports coordinators or managers
- Focuses on **data access** or **communication protocol**

**Example Structure**:

```typescript
// ========================================
// interfaces/ISomeService.ts
// ========================================

/**
 * Service interface for [external system]
 */
export interface ISomeService {
  /**
   * Fetch data from external system
   */
  fetchData(id: string): Promise<SomeData>;

  /**
   * Send data to external system
   */
  sendData(data: SomeData): Promise<void>;

  /**
   * Subscribe to updates
   */
  subscribe(callback: (data: SomeData) => void): () => void;
}

// ========================================
// services/SomeService.ts
// ========================================

import type { ISomeService } from './interfaces/ISomeService';

/**
 * Implementation of ISomeService
 * Handles communication with [external system]
 */
export class SomeService implements ISomeService {
  private connection: WebSocket | null = null;
  private listeners: Array<(data: SomeData) => void> = [];

  constructor(private apiUrl: string) {}

  async fetchData(id: string): Promise<SomeData> {
    const response = await fetch(`${this.apiUrl}/data/${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.statusText}`);
    }
    return response.json();
  }

  async sendData(data: SomeData): Promise<void> {
    const response = await fetch(`${this.apiUrl}/data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send data: ${response.statusText}`);
    }
  }

  subscribe(callback: (data: SomeData) => void): () => void {
    this.listeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(data: SomeData): void {
    this.listeners.forEach((listener) => {
      try {
        listener(data);
      } catch (error) {
        console.error('[SomeService] Listener error:', error);
      }
    });
  }
}

// ========================================
// services/ServiceContainer.ts
// ========================================

import type { ISomeService } from './interfaces/ISomeService';
import { SomeService } from './SomeService';

class ServiceContainer {
  private _someService: ISomeService | null = null;

  get someService(): ISomeService {
    if (!this._someService) {
      throw new Error('SomeService not initialized');
    }
    return this._someService;
  }

  initializeServices(apiUrl: string): void {
    this._someService = new SomeService(apiUrl);
  }
}

export const serviceContainer = new ServiceContainer();
```

**Real Examples**:
- `IIpcService` abstracts Electron IPC communication
- `IRealtimeService` abstracts WebSocket connection to realtime API
- `IAnalyticsService` abstracts analytics event tracking
- DynamoDB service abstracts database operations

---

## Component Boundaries

### Hierarchy

```
┌─────────────────────────────────────────┐
│           Application Layer             │
│         (React Components, UI)          │
└──────────────┬──────────────────────────┘
               │
               │ subscribes to state
               │ calls public methods
               ▼
┌─────────────────────────────────────────┐
│        Coordinator/Controller           │
│   - Orchestrates managers               │
│   - Exposes public API                  │
│   - Emits semantic events               │
│   - Owns state stores                   │
└──────────┬────────────┬─────────────────┘
           │            │
           │ delegates  │ delegates
           ▼            ▼
    ┌──────────┐  ┌──────────┐
    │ Manager  │  │ Manager  │
    │  (Logic) │  │  (Logic) │
    └────┬─────┘  └────┬─────┘
         │             │
         │ calls       │ calls
         ▼             ▼
    ┌─────────────────────────┐
    │       Service           │
    │  (External Integration) │
    └─────────────────────────┘
```

### When to Create Each Layer

| Component | Create When... | Example |
|-----------|---------------|---------|
| **Coordinator** | Managing a root-level feature domain with multiple concerns | `IdentityCoordinator`, `SessionCoordinator` |
| **Controller** | Managing a user flow with distinct phases | `QuickstartController`, `OnboardingController` |
| **Manager** | Splitting a coordinator's concern into focused logic | `LoginProfileManager`, `TimerManager` |
| **Service** | Integrating with external systems or platform APIs | `IpcService`, `RealtimeService` |

### Anti-Patterns to Avoid

❌ **Public Setters (Direct State Mutation)**
```typescript
// BAD: Exposes internal state structure, no validation or business logic
class FeatureCoordinator {
  public setSomeValue(value: string): void {
    this.stores.someStore.updateState({ value }); // ❌ Don't do this
  }
}

// External code can now corrupt state
coordinator.setSomeValue('invalid data'); // No validation!
```

✅ **Action Methods (Encapsulated Business Logic)**
```typescript
// GOOD: Validation, business logic, side effects
class FeatureCoordinator {
  public async updateConfiguration(config: ConfigUpdate): Promise<void> {
    // Validation
    if (!this.isValidConfig(config)) {
      throw new Error('Invalid configuration');
    }

    // Business logic
    const processed = this.processConfig(config);

    // Update state (internal)
    this.stores.config.updateState(processed);

    // Side effects
    this.events.configChanged.emit({ config: processed });
  }
}

// External code uses semantic actions
await coordinator.updateConfiguration({ theme: 'dark' }); // ✅ Validated!
```

❌ **Coordinator calling Service directly**
```typescript
// BAD: Breaks manager abstraction
class FeatureCoordinator {
  async doSomething() {
    await serviceContainer.api.callEndpoint(); // ❌ Don't do this
  }
}
```

✅ **Coordinator delegates to Manager, Manager calls Service**
```typescript
// GOOD: Proper delegation
class FeatureCoordinator {
  async doSomething() {
    await this.managers.api.performAction(); // ✅ Delegate to manager
  }
}

class ApiManager {
  async performAction() {
    await this.apiService.callEndpoint(); // ✅ Manager uses service
  }
}
```

❌ **Manager containing orchestration logic**
```typescript
// BAD: Manager doing coordinator's job
class ApiManager {
  async complexFlow() {
    await this.step1();
    await this.step2();
    if (condition) {
      await this.step3();
    } else {
      await this.step4();
    }
    // Too much orchestration! This belongs in coordinator
  }
}
```

✅ **Coordinator orchestrates, Manager executes**
```typescript
// GOOD: Clear separation
class FeatureCoordinator {
  async complexFlow() {
    await this.managers.api.step1();
    await this.managers.api.step2();
    
    if (this.shouldDoStep3()) {
      await this.managers.api.step3();
    } else {
      await this.managers.api.step4();
    }
  }
}
```

---

## Dependency Injection

### Constructor Injection Pattern

All managers and services receive their dependencies through constructor parameters:

```typescript
// ✅ CORRECT: Direct store injection
class Manager {
  constructor(
    private stores: FeatureStores,
    private someService: ISomeService
  ) {}
}

// Usage in coordinator
this.managers = {
  manager: new Manager(this.stores, serviceContainer.someService),
};
```

### Anti-Pattern: Lambda Getters

❌ **NEVER use lambda getters for state access**

```typescript
// ❌ WRONG: Lambda getters create hidden dependencies
class Manager {
  constructor(
    private getState: () => State,  // ❌ Don't do this
    private setState: (s: State) => void  // ❌ Don't do this
  ) {}
}
```

**Why is this bad?**
- Hidden dependencies (unclear what the manager needs)
- Hard to test (need to mock functions instead of objects)
- Tight coupling (manager depends on coordinator's internal API)
- Unclear ownership (who owns the state?)

---

## State Management

### StateStore Pattern

State is managed through `StateStore<T>` instances that provide:
- Reactive updates (listeners are notified on state change)
- Current state snapshot (`currentState` property)
- Type-safe updates (`updateState(newState)`)
- Optional IPC replication (for Electron multi-process sync)

### Creating Stores

```typescript
import { makeStateStore } from '@playcastdotio/StateStore';
import type { StateStore } from '@playcastdotio/CoreTypes';

export type FeatureStores = {
  someStore: StateStore<SomeState>;
  anotherStore: StateStore<AnotherState>;
};

export function createFeatureStores(): FeatureStores {
  const someStore = makeStateStore<SomeState>(
    { value: '', loading: false },
    {
      // Optional: Replicate across IPC
      replicate: { channel: 'someState', targets: ['nodeService'] },
    }
  );

  const anotherStore = makeStateStore<AnotherState>(
    { data: null }
  );

  return {
    someStore,
    anotherStore,
  };
}
```

### Registering Stores (For IPC Replication)

Coordinators register their stores with `AppCoordinator` for IPC replication:

```typescript
constructor() {
  super('FeatureCoordinator', {} as FeatureState);
  this.stores = createFeatureStores();

  // Register stores for IPC replication
  appCoordinator.registerStores({
    'someState': this.stores.someStore,
    'anotherState': this.stores.anotherStore,
  });
}
```

### Reading State

```typescript
// In coordinator
getSomeValue(): string {
  return this.stores.someStore.currentState.value;
}

// In manager
performAction(): void {
  const state = this.stores.someStore.currentState;
  if (state.loading) return;
  // ... use state
}
```

### Updating State

```typescript
// In manager
async fetchData(): Promise<void> {
  this.stores.someStore.updateState({ 
    ...this.stores.someStore.currentState,
    loading: true 
  });

  const data = await this.service.fetch();

  this.stores.someStore.updateState({ 
    ...this.stores.someStore.currentState,
    loading: false,
    value: data 
  });
}
```

### Listening to Changes

```typescript
// In manager init()
init(): void {
  this.stores.someStore.addListener((state) => {
    if (state.value) {
      this.onValueChanged(state.value);
    }
  });
}

// In coordinator setupEventEmitters()
private setupEventEmitters(): void {
  let previousValue = this.stores.someStore.currentState.value;
  
  this.stores.someStore.addListener((state) => {
    if (state.value !== previousValue) {
      this.events.valueChanged.emit({ value: state.value });
      previousValue = state.value;
    }
  });
}
```

---

## Event-Driven Communication

### CoordinatorEvent Pattern

Coordinators emit semantic events that other coordinators can subscribe to. This creates loose coupling and clear boundaries.

### Defining Events

```typescript
import { CoordinatorEvent } from '../_types/events';

class FeatureCoordinator extends FeatureCoordinator<FeatureState> {
  /**
   * Public events that other coordinators can listen to
   */
  public events = {
    /** Emitted when user authenticates */
    authenticated: new CoordinatorEvent<{ authId: string }>(),

    /** Emitted when data is loaded */
    dataLoaded: new CoordinatorEvent<{ data: SomeData }>(),

    /** Emitted when operation completes (no payload) */
    operationComplete: new CoordinatorEvent<void>(),
  };
}
```

### Emitting Events

```typescript
private setupEventEmitters(): void {
  // Track previous state to avoid duplicate emissions
  let previousAuthId = this.stores.auth.currentState.authId;

  this.stores.auth.addListener((state) => {
    if (state.authId && state.authId !== previousAuthId) {
      this.events.authenticated.emit({ authId: state.authId });
      previousAuthId = state.authId;
    }
  });
}
```

### Listening to Events

```typescript
// In another coordinator
protected async onInit(): Promise<void> {
  // Subscribe to events from other coordinators
  identityCoordinator.events.authenticated.addListener((data) => {
    console.log('User authenticated:', data.authId);
    this.onUserAuthenticated(data.authId);
  });
}
```

### Event Naming Conventions

✅ **Good event names** (semantic, action-oriented):
- `authenticated` - Clear action that happened
- `machineIdSet` - Specific state change
- `allPlayersLeft` - Meaningful business event
- `matchFound` - User-facing milestone

❌ **Bad event names** (too generic):
- `stateChanged` - What changed?
- `updated` - Too vague
- `data` - What data?

### Event vs Method Call

**Use Events When:**
- Multiple coordinators need to react to the same change
- The emitter doesn't need to know who's listening
- The reaction is "fire and forget" (no return value needed)
- You want loose coupling between features

**Use Method Calls When:**
- You need a return value or result
- There's a clear request/response pattern
- The caller needs to know if the operation succeeded
- The operation is synchronous and immediate

---

## Lifecycle Management

### Coordinator Lifecycle

```typescript
class FeatureCoordinator extends FeatureCoordinator<FeatureState> {
  /**
   * Constructor: Set up dependencies (synchronous)
   * - Create stores
   * - Instantiate managers
   * - Register stores for IPC replication
   */
  constructor() {
    super('FeatureCoordinator', {} as FeatureState);
    this.stores = createFeatureStores();
    this.managers = {
      manager: new Manager(this.stores),
    };
  }

  /**
   * onInit: Async initialization
   * - Set up event emitters
   * - Initialize managers
   * - Load initial data
   */
  protected async onInit(): Promise<void> {
    this.setupEventEmitters();
    this.managers.manager.init();
    await this.loadInitialData();
  }

  /**
   * cleanup: Teardown (if needed)
   * - Stop timers
   * - Remove listeners
   * - Close connections
   */
  cleanup(): void {
    // Most coordinators are singletons and don't need cleanup
    // Controllers need cleanup (see below)
  }
}
```

### Controller Lifecycle

```typescript
class FlowController extends FeatureController<FlowState> {
  /**
   * Constructor: Set up dependencies (synchronous)
   */
  constructor() {
    super(initialState);
    this.timerManager = new TimerManager(this.state, this.onTimeout.bind(this));
  }

  /**
   * onInit: Start the flow
   */
  protected async onInit(): Promise<void> {
    this.transitionTo('loading');
    await this.loadData();
  }

  /**
   * cleanup: CRITICAL for controllers
   * - Stop all timers
   * - Remove all listeners
   * - Cancel pending requests
   * - Reset state
   */
  public cleanup(): void {
    if (this.isDestroyed) return;

    console.log('[FlowController] Cleanup started');
    this.isDestroyed = true;

    // Run all cleanup functions
    this.cleanupFunctions.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        console.error('[FlowController] Cleanup error:', error);
      }
    });

    // Reset state
    this.state.reset(true);

    console.log('[FlowController] Cleanup complete');
  }

  /**
   * Helper to register cleanup functions
   */
  protected addCleanup(fn: () => void): void {
    this.cleanupFunctions.push(fn);
  }
}
```

### React Integration

```typescript
// For Coordinators (singleton, long-lived)
export function useFeature() {
  useEffect(() => {
    if (!featureCoordinator.isInitialized()) {
      featureCoordinator.init();
    }
  }, []);

  return useStateStore(featureCoordinator.getState());
}

// For Controllers (ephemeral, scoped to component)
export function useFeatureFlow() {
  const [controller] = useState(() => new FlowController());

  useEffect(() => {
    controller.init();
    return () => controller.cleanup(); // ✅ CRITICAL: Cleanup on unmount
  }, []);

  return useStateStore(controller.getState());
}
```

---

## Testing Philosophy

### Black-Box Contract Testing

This architecture is designed for **black-box contract testing**: tests that verify public behavior without knowing internal implementation.

**Principles:**
1. **Test the contract, not the implementation**
2. **Test public methods, events, and state changes**
3. **Mock all dependencies (managers, services)**
4. **Verify analytics events fire in correct order**
5. **Test state machine transitions (for controllers)**

### What TO TEST

✅ **Public API methods**
```typescript
describe('FeatureCoordinator', () => {
  it('getSomeValue returns current value', () => {
    expect(coordinator.getSomeValue()).toBe('expected value');
  });

  it('setSomeValue updates state', () => {
    coordinator.setSomeValue('new value');
    expect(coordinator.getSomeValue()).toBe('new value');
  });
});
```

✅ **Event emissions**
```typescript
describe('FeatureCoordinator events', () => {
  it('emits authenticated event when user logs in', () => {
    let emittedAuthId: string | null = null;
    
    coordinator.events.authenticated.addListener((data) => {
      emittedAuthId = data.authId;
    });

    coordinator.setAuthId('user123');
    
    expect(emittedAuthId).toBe('user123');
  });
});
```

✅ **State transitions (controllers)**
```typescript
describe('FlowController phases', () => {
  it('transitions from loading to ready when data loads', async () => {
    const controller = new FlowController();
    await controller.init();
    
    expect(controller.getState().currentState.phase).toBe('ready');
  });

  it('transitions to error on failure', async () => {
    const controller = new FlowController();
    // Mock service to fail
    await controller.init();
    
    expect(controller.getState().currentState.phase).toBe('error');
  });
});
```

✅ **Analytics event order**
```typescript
describe('FlowController analytics', () => {
  it('fires events in correct order', async () => {
    const events: string[] = [];
    
    mockAnalytics.on('event', (name: string) => {
      events.push(name);
    });

    const controller = new FlowController();
    await controller.init();
    await controller.continue();
    
    expect(events).toEqual([
      'Flow Started',
      'Flow Loading',
      'Flow Ready',
      'Continue Clicked',
      'Flow Complete',
    ]);
  });
});
```

### What NOT TO TEST

❌ **Private methods**
```typescript
// ❌ DON'T TEST THIS
it('_internalHelper does something', () => {
  const result = (coordinator as any)._internalHelper();
  expect(result).toBe(something);
});
```

❌ **Manager/Service internals in coordinator tests**
```typescript
// ❌ DON'T TEST THIS in coordinator tests
it('LoginProfileManager connects to realtime', () => {
  // This belongs in LoginProfileManager tests, not coordinator tests
});
```

❌ **Implementation details**
```typescript
// ❌ DON'T TEST THIS
it('stores.auth is updated', () => {
  coordinator.setAuthId('user123');
  expect(coordinator.stores.auth.currentState.authId).toBe('user123');
  // Accessing internal stores breaks encapsulation
});
```

### Testing Pyramid

```
      ▲
     ╱ ╲
    ╱ E2E ╲        Few (5%)  - Full system with infrastructure
   ╱───────╲
  ╱  Integ. ╲      Some (15%) - Event wiring, multi-coordinator
 ╱───────────╲
╱  Contract   ╲    Many (80%) - Individual coordinators/managers
╲─────────────╱
```

**Contract Tests (80%)**:
- Test individual coordinators in isolation
- Mock all managers and services
- Verify public API contracts
- Fast, focused, deterministic

**Integration Tests (15%)**:
- Test event wiring between coordinators
- Test multi-coordinator flows
- Verify state synchronization
- Real managers, mocked services

**E2E Tests (5%)**:
- Test full user flows end-to-end
- Real infrastructure (or close to it)
- Verify system works together
- Slow, fragile, expensive

---

## Examples

### Example 1: FeatureCoordinator (IdentityCoordinator)

**What it does**: Manages host authentication, machine ID, and attestation

**Structure**:
- **Coordinators**: `IdentityCoordinator`
- **Managers**: `LoginProfileManager`, `MachineIdManager`, `AttestationFlowManager`
- **Stores**: `auth`, `machineId`, `loginProfile`, `machineIdAttestation`
- **Events**: `authenticated`, `machineIdSet`, `machineAttested`

**Key Pattern**: Root-level singleton that other coordinators read from

```typescript
// Other coordinators access identity info
const authId = identityCoordinator.getAuthId();
const isAuthenticated = identityCoordinator.isAuthenticated();

// Other coordinators listen to identity events
identityCoordinator.events.authenticated.addListener((data) => {
  console.log('User authenticated:', data.authId);
});
```

### Example 2: FeatureController (QuickstartCoordinator)

**What it does**: Manages quickstart demo flow with matchmaking, timers, and phases

**Structure**:
- **Controller**: `QuickstartCoordinator` (extends `FeatureController`)
- **Managers**: `TimerManager`, `AnalyticsManager`, `AuthFlowManager`, `MatchmakingManager`, `BroadcastConnectionManager`
- **State**: `QuickstartState` with `phase` field for state machine
- **Phases**: `page_viewed`, `creating_lobby`, `matchmaking`, `playing_active`, etc.

**Key Pattern**: State machine with phase transitions, ephemeral lifecycle

```typescript
// React component usage
export function QuickstartPage() {
  const { state, actions } = useQuickstartFlow('demo-slug');
  
  return (
    <div>
      {state.phase === 'playing_active' && <GameStream />}
      {state.phase === 'matchmaking' && <LoadingSpinner />}
    </div>
  );
}
```

### Example 3: Manager (LoginProfileManager)

**What it does**: Initializes services when user authenticates, handles remote control

**Structure**:
- **Dependencies**: `IdentityStores` (injected via constructor)
- **Responsibilities**: Connect to realtime API, enable remote control, trigger attestation
- **Pattern**: Listens to store changes, performs side effects

```typescript
// Coordinator usage
constructor() {
  this.managers = {
    loginProfile: new LoginProfileManager(this.stores),
  };
}

protected async onInit(): Promise<void> {
  this.managers.loginProfile.init();
}
```

---

## Quick Reference

### When Creating New Code

**Ask yourself:**
1. Is this a root-level feature? → **Coordinator**
2. Is this a user flow with phases? → **Controller**
3. Is this a focused concern within a feature? → **Manager**
4. Is this an external integration? → **Service**

**Checklist:**
- [ ] Have I defined the public contract (methods, events, getters)?
- [ ] Am I using dependency injection (constructor parameters)?
- [ ] Are stores private (not exposed directly)?
- [ ] Am I emitting semantic events (not generic `stateChanged`)?
- [ ] Can this be tested with black-box tests?

### File Size Guidelines

- **Coordinator**: 300-500 lines max (if >500, split into more managers)
- **Controller**: 400-800 lines max (more complex due to state machine)
- **Manager**: 100-300 lines max (if >300, split into multiple managers)
- **Service**: 200-400 lines max

---

## Anti-Patterns & Red Flags

🚨 **Red flags that indicate architectural drift:**

1. **Public setters that directly mutate state** → Use action methods with validation
2. **Coordinator calling services directly** → Should go through managers
3. **Manager containing orchestration logic** → Belongs in coordinator
4. **Public methods only used internally** → Should be private
5. **Complex logic in constructors** → Move to `onInit()`
6. **Tight coupling between unrelated features** → Use events
7. **Accessing internal stores from outside** → Use public methods
8. **God classes (>1000 lines)** → Split responsibilities
9. **No dependency injection** → Can't test or mock

---

## Conclusion

This architecture enables:
- ✅ **Maintainability**: Clear boundaries, easy to find code
- ✅ **Testability**: Black-box contract tests, easy mocking
- ✅ **Scalability**: Add features without touching existing code
- ✅ **Discoverability**: IntelliSense shows public API
- ✅ **Type Safety**: Full TypeScript coverage
- ✅ **Encapsulation**: Internal state is hidden

**Always reference this document before creating new components.**
