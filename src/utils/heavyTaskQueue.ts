type QueuedTask = {
  id: string
  run: () => void
}

const queue: QueuedTask[] = []
let pumping = false
let taskCounter = 0

const YIELD_MS = 32

const pump = () => {
  if (pumping || queue.length === 0) return

  pumping = true
  const task = queue.shift()!

  try {
    task.run()
  } catch (err) {
    console.error(`[heavyTaskQueue] ${task.id} failed:`, err)
  }

  pumping = false

  if (queue.length > 0) {
    window.setTimeout(pump, YIELD_MS)
  }
}

/** Run heavy init one task at a time, yielding between each. */
export const enqueueHeavyTask = (
  id: string,
  run: () => void,
  delayMs = 0
): number => {
  const handle = taskCounter++
  window.setTimeout(() => {
    queue.push({ id: `${id}-${handle}`, run })
    pump()
  }, delayMs)
  return handle
}

export const yieldToMain = (fn: () => void) => {
  window.setTimeout(fn, 0)
}
