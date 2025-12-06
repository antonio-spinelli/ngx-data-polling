import { Directive, inject, input, TemplateRef, ViewContainerRef } from '@angular/core'
import { DataPollingContext } from '../components'

@Directive({
  selector: 'ng-template[npxDataPollingTyped]',
})
export class DataPollingTypedDirective<T> {
  // This input is used only for type inference
  readonly appPollingWrapperTyped = input<T>()

  static ngTemplateContextGuard<T>(_dir: DataPollingTypedDirective<T>, _ctx: unknown): _ctx is DataPollingContext<T> {
    return true
  }

  constructor() {
    inject(TemplateRef<DataPollingContext<T>>)
    inject(ViewContainerRef)
  }
}
