import { NgTemplateOutlet } from '@angular/common'
import { Component, computed, contentChild, input, TemplateRef } from '@angular/core'
import { Observable } from 'rxjs'
import { pollingResource } from '../utils'

export type DataPollingContext<T> = {
  $implicit: T | undefined
  data: T | undefined
  isFirstLoading: boolean
  isLoading: boolean
  error: unknown
}

@Component({
  selector: 'npx-data-polling',
  imports: [NgTemplateOutlet],
  template: `
    <ng-container
      [ngTemplateOutlet]="template()"
      [ngTemplateOutletContext]="{
        $implicit: data(),
        data: data(),
        isFirstLoading: isFirstLoading(),
        isLoading: isLoading(),
        error: error(),
      }"
    />
  `,
})
export class DataPollingComponent<T> {
  readonly intervalMs = input.required<number>()
  readonly loader = input.required<() => Observable<T>>()
  readonly initialValue = input<T | undefined>(undefined)
  readonly template = contentChild.required<TemplateRef<DataPollingContext<T>>>(TemplateRef)
  readonly enabled = input<boolean>(true)

  readonly data = computed(() => this.resource.data())
  readonly isFirstLoading = computed(() => this.resource.isFirstLoading())
  readonly isLoading = computed(() => this.resource.isLoading())
  readonly error = computed(() => this.resource.error())
  private readonly resource = pollingResource({
    loader: () => this.loader()(),
    intervalMs: this.intervalMs,
    initialValue: this.initialValue(),
    enabled: this.enabled,
  })

  reload() {
    this.resource.reload()
  }
}
