import { computed, effect, Signal, signal } from '@angular/core'
import { rxResource } from '@angular/core/rxjs-interop'
import { Observable } from 'rxjs'

export function pollingResource<T>({
  loader,
  intervalMs,
  initialValue,
  enabled,
}: {
  loader: () => Observable<T>
  intervalMs: number | Signal<number>
  initialValue: T
  enabled?: Signal<boolean>
}) {
  const data = signal<T>(initialValue)
  const tick = signal(0)
  const firstLoading = signal(true)

  const resource = rxResource({
    params: () => ({ tick: tick() }),
    stream: () => loader(),
  })

  const getIntervalMs = () => (typeof intervalMs === 'number' ? intervalMs : intervalMs())
  const isEnabled = () => (enabled ? enabled() : true)

  // Wait for loading to complete, then schedule next tick
  effect(() => {
    const ms = getIntervalMs()
    const isLoading = resource.isLoading()
    const pollingEnabled = isEnabled()

    // When loading completes and polling is enabled, schedule next tick after intervalMs
    if (!isLoading && tick() > 0 && pollingEnabled) {
      const timeoutId = setTimeout(() => {
        tick.update((v) => v + 1)
      }, ms)

      return () => clearTimeout(timeoutId)
    }

    return undefined
  })

  // Initial tick to start the first load when enabled
  effect(() => {
    const pollingEnabled = isEnabled()
    if (tick() === 0 && pollingEnabled) {
      tick.set(1)
    }
  })

  effect(() => {
    try {
      const value = resource.value()
      if (value !== undefined && value !== null) {
        firstLoading.set(false)
        data.set(value)
      }
    } catch {
      // Ignore errors, they are available via resource.error()
    }
  })

  return {
    data: data.asReadonly(),
    isLoading: resource.isLoading,
    isFirstLoading: computed(() => firstLoading() && resource.isLoading()),
    error: resource.error,
    reload: () => resource.reload(),
  }
}
