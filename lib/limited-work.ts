/** Each item is claimed once; the time budget is checked before starting more work. */
export async function limitedWork<T>(items: T[], concurrency: number, work: (item: T) => Promise<void>, canStart = () => true) {
  let next = 0
  const worker = async () => {
    while (next < items.length && canStart()) {
      const item = items[next++]
      await work(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(Math.max(1, concurrency), items.length) }, worker))
}
