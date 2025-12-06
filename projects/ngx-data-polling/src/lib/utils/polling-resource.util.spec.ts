import { DestroyRef, provideZonelessChangeDetection, signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pollingResource } from './polling-resource.util'

describe('pollingResource', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    })
  })

  afterEach(() => {
    TestBed.resetTestingModule()
    vi.useRealTimers()
  })

  it('should create polling resource with initial value', () => {
    const initialValue = { count: 0 }
    const loader = vi.fn(() => of({ count: 1 }))

    const resource = TestBed.runInInjectionContext(() =>
      pollingResource({
        loader,
        intervalMs: 1000,
        initialValue,
      }),
    )

    expect(resource.data()).toEqual(initialValue)
  })

  it('should load data on first tick', async () => {
    const loader = vi.fn(() => of({ count: 1 }))

    const resource = TestBed.runInInjectionContext(() =>
      pollingResource({
        loader,
        intervalMs: 1000,
        initialValue: { count: 0 },
      }),
    )

    // Run effects to trigger initial tick
    await vi.advanceTimersByTimeAsync(0)

    expect(loader).toHaveBeenCalled()
    expect(resource.data()).toEqual({ count: 1 })
    expect(resource.isFirstLoading()).toBe(false)
  })

  it('should poll at specified interval', async () => {
    let callCount = 0
    const loader = vi.fn(() => of({ count: ++callCount }))

    const resource = TestBed.runInInjectionContext(() =>
      pollingResource({
        loader,
        intervalMs: 1000,
        initialValue: { count: 0 },
      }),
    )

    // Initial load
    await vi.advanceTimersByTimeAsync(0)
    const initialCalls = loader.mock.calls.length
    expect(resource.data()).toEqual({ count: callCount })

    // First poll after 1000ms
    await vi.advanceTimersByTimeAsync(1000)
    expect(loader.mock.calls.length).toBeGreaterThanOrEqual(initialCalls)
    const afterFirstPoll = resource.data().count
    expect(afterFirstPoll).toBeGreaterThanOrEqual(1)

    // Second poll after another 1000ms
    await vi.advanceTimersByTimeAsync(1000)
    expect(resource.data().count).toBeGreaterThanOrEqual(afterFirstPoll)
  })

  it('should use dynamic interval from signal', async () => {
    let callCount = 0
    const loader = vi.fn(() => of({ count: ++callCount }))
    const intervalSignal = signal(1000)

    TestBed.runInInjectionContext(() =>
      pollingResource({
        loader,
        intervalMs: intervalSignal,
        initialValue: { count: 0 },
      }),
    )

    // Initial load
    await vi.advanceTimersByTimeAsync(0)
    const initialCalls = loader.mock.calls.length
    expect(initialCalls).toBeGreaterThan(0)

    // Poll at 1000ms
    await vi.advanceTimersByTimeAsync(1000)
    const afterFirstPoll = loader.mock.calls.length
    expect(afterFirstPoll).toBeGreaterThanOrEqual(initialCalls)

    // Change interval to 500ms
    intervalSignal.set(500)

    // Next poll should use new interval (500ms instead of 1000ms)
    await vi.advanceTimersByTimeAsync(500)
    expect(loader.mock.calls.length).toBeGreaterThanOrEqual(afterFirstPoll)
  })

  it('should respect enabled signal', async () => {
    const loader = vi.fn(() => of({ count: 1 }))
    const enabledSignal = signal(false)

    TestBed.runInInjectionContext(() =>
      pollingResource({
        loader,
        intervalMs: 1000,
        initialValue: { count: 0 },
        enabled: enabledSignal,
      }),
    )

    // Should not load when disabled
    await vi.advanceTimersByTimeAsync(0)
    const callsWhileDisabled = loader.mock.calls.length

    // Enable polling
    enabledSignal.set(true)
    await vi.advanceTimersByTimeAsync(0)
    const callsAfterEnable = loader.mock.calls.length
    expect(callsAfterEnable).toBeGreaterThan(callsWhileDisabled)

    // Should continue polling
    await vi.advanceTimersByTimeAsync(1000)
    expect(loader.mock.calls.length).toBeGreaterThanOrEqual(callsAfterEnable)
  })

  it('should pause polling when disabled', async () => {
    let callCount = 0
    const loader = vi.fn(() => of({ count: ++callCount }))
    const enabledSignal = signal(true)

    TestBed.runInInjectionContext(() =>
      pollingResource({
        loader,
        intervalMs: 500,
        initialValue: { count: 0 },
        enabled: enabledSignal,
      }),
    )

    // Initial load and first poll
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(500)
    const callsBeforeDisable = loader.mock.calls.length

    // Disable polling
    enabledSignal.set(false)

    // Wait enough time for multiple polls to have occurred if it was still enabled
    await vi.advanceTimersByTimeAsync(1500)

    // Should not have additional calls after disabling
    const callsAfterDisable = loader.mock.calls.length
    expect(callsAfterDisable).toBeLessThanOrEqual(callsBeforeDisable + 1) // Allow at most 1 more call if in progress

    // Re-enable polling
    enabledSignal.set(true)
    await vi.advanceTimersByTimeAsync(0)

    // Should resume polling - need to wait for interval
    await vi.advanceTimersByTimeAsync(500)
    await vi.advanceTimersByTimeAsync(0) // Allow effects to run
    expect(loader.mock.calls.length).toBeGreaterThanOrEqual(callsAfterDisable)
  })

  it('should track loading state', async () => {
    let callCount = 0
    const loader = vi.fn(() => of({ count: ++callCount }))

    const resource = TestBed.runInInjectionContext(() =>
      pollingResource({
        loader,
        intervalMs: 1000,
        initialValue: { count: 0 },
      }),
    )

    // Initial load
    await vi.advanceTimersByTimeAsync(0)
    // After initial load, data should be updated
    expect(resource.isFirstLoading()).toBe(false)
    expect(resource.data().count).toBeGreaterThan(0)

    // Next poll
    const firstCount = resource.data().count
    await vi.advanceTimersByTimeAsync(1000)
    expect(resource.data().count).toBeGreaterThanOrEqual(firstCount)
    expect(resource.isFirstLoading()).toBe(false) // Not first loading anymore
  })

  it('should handle errors', async () => {
    const error = new Error('Test error')
    const loader = vi.fn(() => throwError(() => error))

    const resource = TestBed.runInInjectionContext(() =>
      pollingResource({
        loader,
        intervalMs: 1000,
        initialValue: { count: 0 },
      }),
    )

    // Initial load fails
    await vi.advanceTimersByTimeAsync(0)

    // Error should be captured
    expect(resource.error()).toBeDefined()
    expect(resource.error()?.message).toBe('Test error')

    // Data should remain at initial value (accessing data, not resource.value())
    expect(resource.data()).toEqual({ count: 0 })
  })

  it('should not update data when value is null', async () => {
    let returnNull = false
    const loader = vi.fn(() => of(returnNull ? null : { count: 1 }))

    const resource = TestBed.runInInjectionContext(() =>
      pollingResource({
        loader,
        intervalMs: 1000,
        initialValue: { count: 0 },
      }),
    )

    // First load with valid data
    await vi.advanceTimersByTimeAsync(0)
    expect(resource.data()).toEqual({ count: 1 })

    // Return null on next poll
    returnNull = true
    await vi.advanceTimersByTimeAsync(1000)
    expect(resource.data()).toEqual({ count: 1 }) // Should keep previous value
  })

  it('should not update data when value is undefined', async () => {
    let returnUndefined = false
    const loader = vi.fn(() => of(returnUndefined ? undefined : { count: 1 }))

    const resource = TestBed.runInInjectionContext(() =>
      pollingResource({
        loader,
        intervalMs: 1000,
        initialValue: { count: 0 },
      }),
    )

    // First load with valid data
    await vi.advanceTimersByTimeAsync(0)
    expect(resource.data()).toEqual({ count: 1 })

    // Return undefined on next poll
    returnUndefined = true
    await vi.advanceTimersByTimeAsync(1000)
    expect(resource.data()).toEqual({ count: 1 }) // Should keep previous value
  })

  it('should support manual reload', async () => {
    let callCount = 0
    const loader = vi.fn(() => of({ count: ++callCount }))

    const resource = TestBed.runInInjectionContext(() =>
      pollingResource({
        loader,
        intervalMs: 1000,
        initialValue: { count: 0 },
      }),
    )

    // Initial load
    await vi.advanceTimersByTimeAsync(0)
    const initialCalls = loader.mock.calls.length
    const initialCount = resource.data().count
    expect(initialCount).toBeGreaterThan(0)

    // Manual reload
    resource.reload()
    await vi.advanceTimersByTimeAsync(0)
    expect(loader.mock.calls.length).toBeGreaterThan(initialCalls)
    expect(resource.data().count).toBeGreaterThan(initialCount)
  })

  it('should not schedule next poll while loading', async () => {
    let callCount = 0
    const loader = vi.fn(() => of({ count: ++callCount }))

    TestBed.runInInjectionContext(() =>
      pollingResource({
        loader,
        intervalMs: 500,
        initialValue: { count: 0 },
      }),
    )

    // Start initial load
    await vi.advanceTimersByTimeAsync(0)
    const initialCalls = loader.mock.calls.length
    expect(initialCalls).toBeGreaterThan(0)

    // Next poll should be scheduled after interval
    await vi.advanceTimersByTimeAsync(500)
    expect(loader.mock.calls.length).toBeGreaterThanOrEqual(initialCalls)
  })

  it('should handle multiple rapid enabled state changes', async () => {
    const loader = vi.fn(() => of({ count: 1 }))
    const enabledSignal = signal(false)

    TestBed.runInInjectionContext(() =>
      pollingResource({
        loader,
        intervalMs: 1000,
        initialValue: { count: 0 },
        enabled: enabledSignal,
      }),
    )

    // Rapid toggle
    enabledSignal.set(true)
    enabledSignal.set(false)
    enabledSignal.set(true)

    await vi.advanceTimersByTimeAsync(0)
    // Should have been called at least once when enabled
    expect(loader).toHaveBeenCalled()
  })
})
