import { enqueueHeavyTask } from "./heavyTaskQueue"

type DeferHandle = number

/** @deprecated Prefer enqueueHeavyTask for heavy work */
export const deferToIdle = (fn: () => void, timeout = 2000): DeferHandle => {
  return enqueueHeavyTask("deferToIdle", fn, timeout)
}

export const cancelDefer = (_handle: DeferHandle) => {
  /* queue tasks are not cancellable by handle yet */
}
