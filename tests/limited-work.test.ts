import assert from 'node:assert/strict'
import test from 'node:test'
import { limitedWork } from '../lib/limited-work.ts'

test('bounded transcription workers process each item once without exceeding three in flight', async () => {
  let active = 0, peak = 0
  const done: number[] = []
  await limitedWork(Array.from({ length: 30 }, (_, index) => index), 3, async item => {
    peak = Math.max(peak, ++active)
    await new Promise(resolve => setTimeout(resolve, 1))
    done.push(item)
    active--
  })
  assert.equal(peak, 3)
  assert.equal(new Set(done).size, 30)
  assert.equal(active, 0)
})

test('the time budget stops new work while allowing in-flight saves to finish', async () => {
  let allowed = true
  const done: number[] = []
  await limitedWork([1, 2, 3, 4, 5, 6], 3, async item => {
    await Promise.resolve()
    allowed = false
    done.push(item)
  }, () => allowed)
  assert.deepEqual(done, [1, 2, 3])
})
