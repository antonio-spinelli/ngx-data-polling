# ngx-data-polling

Angular 20 library with utilities to handle data polling in a declarative and type-safe way.

## Installation

```bash
npm install ngx-data-polling
```

## Utilities

### `pollingResource` (Utility Function)

A utility function that manages data polling from an Observable, ensuring that subsequent calls only occur after the previous one completes.

#### Features

- Controlled polling: subsequent requests start only after the previous one completes
- Configurable interval (static or reactive via Signal)
- Start/stop polling control via Signal
- Separate handling of first load vs subsequent loads
- Automatic error detection

#### Usage Example

```typescript
import { Component, inject, signal } from '@angular/core';
import { pollingResource } from 'npx-data-polling';

@Component({
  selector: 'app-my-component',
  template: `
    <div>Data: {{ resource.data() }}</div>
    <div>Loading: {{ resource.isLoading() }}</div>
    <div>First Loading: {{ resource.isFirstLoading() }}</div>
    @if (resource.error()) {
    <div>Error: {{ resource.error() }}</div>
    }
    <button (click)="togglePolling()">Toggle Polling</button>
    <button (click)="resource.reload()">Reload Now</button>
  `,
})
export class MyComponent {
  private readonly pollingEnabled = signal(true);

  readonly resource = pollingResource({
    loader: () => this.myService.getData(),
    intervalMs: 5000, // Poll every 5 seconds
    initialValue: [],
    enabled: this.pollingEnabled, // Optional: start/stop control
  });

  togglePolling() {
    this.pollingEnabled.update((v) => !v);
  }
}
```

#### Reactive Interval

```typescript
readonly interval = signal(5000)

readonly resource = pollingResource({
  loader: () => this.myService.getData(),
  intervalMs: this.interval, // Use a Signal for dynamic interval
  initialValue: [],
})

// Change interval dynamically
changeInterval(newInterval: number) {
  this.interval.set(newInterval)
}
```

## Components

### `DataPollingComponent`

A wrapper component that uses `pollingResource` internally and provides a declarative interface via template projection.

#### Inputs

- `intervalMs` (required): Polling interval in milliseconds
- `loader` (required): Function that returns an Observable with the data
- `initialValue` (optional): Initial value before first load (default: `undefined`)
- `enabled` (optional): Boolean to enable/disable polling (default: `true`)

#### Template Context

The projected template receives a context with the following properties:

- `$implicit`: The data (generic type `T | undefined`)
- `data`: The same data (alias of `$implicit`)
- `isFirstLoading`: `boolean` - true during first load
- `isLoading`: `boolean` - true during any load
- `error`: `unknown` - any error that occurred during loading

#### Basic Usage Example

```typescript
import { Component } from '@angular/core';
import { DataPollingComponent } from 'npx-data-polling';

@Component({
  selector: 'app-my-component',
  imports: [DataPollingComponent],
  template: `
    <npx-data-polling [intervalMs]="5000" [loader]="loadData">
      <ng-template let-data let-isLoading="isLoading" let-error="error">
        @if (isLoading) {
        <div>Loading...</div>
        } @if (error) {
        <div>Error: {{ error }}</div>
        } @if (data) {
        <div>{{ data | json }}</div>
        }
      </ng-template>
    </npx-data-polling>
  `,
})
export class MyComponent {
  readonly loadData = () => this.myService.getData();
}
```

#### With Initial Value

```typescript
<npx-data-polling
  [intervalMs]="5000"
  [loader]="loadData"
  [initialValue]="[]">
  <ng-template let-data>
    <div>Items: {{ data.length }}</div>
  </ng-template>
</npx-data-polling>
```

#### With Polling Control

```typescript
@Component({
  template: `
    <button (click)="togglePolling()">{{ isPollingEnabled() ? 'Stop' : 'Start' }} Polling</button>

    <npx-data-polling [intervalMs]="5000" [loader]="loadData" [enabled]="isPollingEnabled()">
      <ng-template let-data>
        <div>{{ data | json }}</div>
      </ng-template>
    </npx-data-polling>
  `,
})
export class MyComponent {
  readonly isPollingEnabled = signal(true);

  togglePolling() {
    this.isPollingEnabled.update((v) => !v);
  }
}
```

#### Example with ref for typed variables

A ref to DataPollingComponent can be used to access typed data in the component class and avoid use DataPollingTypedDirective.

```typescript
<npx-data-polling #dataPolling [intervalMs]="5000" [loader]="loadData">
  <ng-template>
    <div>Items: {{ dataPolling.data().length }}</div>
  </ng-template>
</npx-data-polling>
```

## Directives

### `DataPollingTypedDirective`

A structural directive that provides full type safety for template variables when using `DataPollingComponent`.

#### Why is it needed?

By default, Angular cannot infer the generic type `T` from template variables, resulting in `any` types. This directive solves the problem by providing a type guard that allows TypeScript to correctly infer the types.

#### Usage Example

```typescript
import { Component } from '@angular/core';
import { DataPollingComponent, DataPollingTypedDirective } from 'npx-data-polling';

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-users',
  imports: [DataPollingComponent, DataPollingTypedDirective],
  template: `
    <npx-data-polling [intervalMs]="5000" [loader]="loadUsers" [initialValue]="[]">
      <ng-template
        [npxDataPollingTyped]="userTypeHint"
        let-users
        let-isFirstLoading="isFirstLoading"
        let-isLoading="isLoading"
        let-error="error"
      >
        @if (isFirstLoading) {
        <div>First loading...</div>
        } @if (isLoading) {
        <div>Loading...</div>
        } @if (error) {
        <div>Error occurred</div>
        } @if (users) { @for (user of users; track user.id) {
        <!-- users is typed as User[] | undefined -->
        <!-- user is typed as User -->
        <div>{{ user.name }}</div>
        } }
      </ng-template>
    </npx-data-polling>
  `,
})
export class UsersComponent {
  // Type hint for the directive (used only at compile-time)
  readonly userTypeHint: User[] = [];

  readonly loadUsers = () => this.userService.getUsers();
}
```

#### Important Notes

1. The `[npxDataPollingTyped]` parameter must be a typed value that matches the type of data you expect
2. This value is used **only for type inference** at compile-time, it has no runtime effects
3. Without this directive, template variables will be of type `any`
4. With the directive, all variables (`$implicit`, `isFirstLoading`, `isLoading`, `error`) will have the correct types

## Best Practices

1. **Use `pollingResource` for component internal logic**: When you need polling within the TypeScript logic of the component

2. **Use `DataPollingComponent` for declarative UI**: When polling is tightly coupled to data presentation

3. **Use `DataPollingTypedDirective`**: To get full type safety in template variables or use template refs

4. **Handle `isFirstLoading` separately from `isLoading`**: Allows showing skeleton loaders only on first load and more discrete indicators for subsequent updates

5. **Set a sensible `initialValue`**: Avoids rendering issues when data is not yet available

6. **Use `enabled` to control polling**: Avoid polling when data is not needed (e.g., hidden tab, closed modal)

## Complete Example

### With template ref

```typescript
import { Component, inject, signal } from '@angular/core';
import { DataPollingComponent } from 'npx-data-polling';
import { RaceService } from '@app/api';

interface Race {
  id: string;
  nome: string;
  ora: string;
}

@Component({
  selector: 'app-live-races',
  imports: [DataPollingComponent],
  template: `
    <div class="live-races">
      <h2>Live Races</h2>

      <button (click)="togglePolling()">
        {{ isPollingActive() ? 'Pause' : 'Resume' }}
      </button>

      <npx-data-polling
        #racesPolling
        [intervalMs]="pollingInterval()"
        [loader]="loadRaces"
        [initialValue]="[]"
        [enabled]="isPollingActive()"
      >
        <ng-template>
          @if (racesPolling.isFirstLoading()) {
          <div class="skeleton-loader">
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
          </div>
          } @else {
          <div class="races-container">
            @if (racesPolling.isLoading()) {
            <div class="loading-indicator">Updating...</div>
            } @else (racesPolling.error()) {
            <div class="error-message">Error loading races</div>
            } @else { @for (race of racesPolling.data(); track race.id) {
            <div class="race-card">
              <h3>{{ race.name }}</h3>
              <p>Time: {{ race.time }}</p>
            </div>
            } @empty {
            <p>No races scheduled</p>
            } }
          </div>
          }
        </ng-template>
      </npx-data-polling>
    </div>
  `,
})
export class LiveRacesComponent {
  private readonly raceService = inject(RaceService);

  readonly isPollingActive = signal(true);
  readonly pollingInterval = signal(3000);

  readonly loadRaces = () => this.raceService.getLiveRaces();

  togglePolling() {
    this.isPollingActive.update((v) => !v);
  }

  changeInterval(newInterval: number) {
    this.pollingInterval.set(newInterval);
  }
}
```

### With `DataPollingTypedDirective`

```typescript
import { Component, inject, signal } from '@angular/core';
import { DataPollingComponent, DataPollingTypedDirective } from 'npx-data-polling';
import { RaceService } from '@app/api';

interface Race {
  id: string;
  nome: string;
  ora: string;
}

@Component({
  selector: 'app-live-races',
  imports: [DataPollingComponent, DataPollingTypedDirective],
  template: `
    <div class="live-races">
      <h2>Live Races</h2>

      <button (click)="togglePolling()">
        {{ isPollingActive() ? 'Pause' : 'Resume' }}
      </button>

      <npx-data-polling
        [intervalMs]="pollingInterval()"
        [loader]="loadRaces"
        [initialValue]="[]"
        [enabled]="isPollingActive()"
      >
        <ng-template
          [npxDataPollingTyped]="racesTypeHint"
          let-races
          let-isFirstLoading="isFirstLoading"
          let-isLoading="isLoading"
          let-error="error"
        >
          @if (isFirstLoading) {
          <div class="skeleton-loader">
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
          </div>
          } @else {
          <div class="races-container">
            @if (isLoading) {
            <div class="loading-indicator">Updating...</div>
            } @else (error) {
            <div class="error-message">Error loading races</div>
            } @else { @for (race of races; track race.id) {
            <div class="race-card">
              <h3>{{ race.name }}</h3>
              <p>Time: {{ race.time }}</p>
            </div>
            } @empty {
            <p>No races scheduled</p>
            } }
          </div>
          }
        </ng-template>
      </npx-data-polling>
    </div>
  `,
})
export class LiveRacesComponent {
  private readonly raceService = inject(RaceService);

  readonly racesTypeHint: Race[] = [];
  readonly isPollingActive = signal(true);
  readonly pollingInterval = signal(3000);

  readonly loadRaces = () => this.raceService.getLiveRaces();

  togglePolling() {
    this.isPollingActive.update((v) => !v);
  }

  changeInterval(newInterval: number) {
    this.pollingInterval.set(newInterval);
  }
}
```
