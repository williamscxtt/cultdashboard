export class RequestTimeout extends Error {
  constructor() { super('Request timed out'); this.name = 'RequestTimeout' }
}

/** Bound the whole operation, including SDK waits and response-body parsing. */
export async function withDeadline<T>(work: (signal: AbortSignal) => Promise<T>, timeoutMs: number): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => { controller.abort(); reject(new RequestTimeout()) }, timeoutMs)
  })
  try { return await Promise.race([work(controller.signal), deadline]) }
  finally { clearTimeout(timer) }
}
