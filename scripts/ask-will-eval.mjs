#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import OpenAI from 'openai'

function parseArgs(argv) {
  const args = { dataset: 'evals/ask-will/retrieval.jsonl', vectorStoreId: '' }
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index]
    if (value === '--dataset') args.dataset = argv[++index] ?? args.dataset
    else if (value === '--vector-store-id') args.vectorStoreId = argv[++index] ?? ''
    else throw new Error(`Unknown argument: ${value}`)
  }
  return args
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const vectorStoreId = args.vectorStoreId || process.env.ASK_WILL_VECTOR_STORE_ID
  if (!vectorStoreId) throw new Error('Pass --vector-store-id or set ASK_WILL_VECTOR_STORE_ID')
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required')

  const datasetPath = path.resolve(args.dataset)
  const cases = fs.readFileSync(datasetPath, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line))
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  const results = []

  for (const item of cases) {
    const page = await openai.vectorStores.search(vectorStoreId, {
      query: item.query,
      max_num_results: 8,
      rewrite_query: true,
      filters: {
        type: 'and',
        filters: [
          { type: 'eq', key: 'visibility', value: 'member_safe' },
          { type: 'eq', key: 'status', value: 'current' },
        ],
      },
      ranking_options: { ranker: 'auto', score_threshold: 0.08 },
    })
    const paths = (page.data ?? []).map(result => String(result.attributes?.source_path ?? ''))
    const matched = paths.some(resultPath => item.expected_paths.some(expected => resultPath.includes(expected)))
    results.push({ id: item.id, category: item.category, passed: matched, paths: paths.slice(0, 5) })
  }

  const passed = results.filter(result => result.passed).length
  const report = {
    dataset: datasetPath,
    vector_store_id: vectorStoreId,
    passed,
    total: results.length,
    recall_at_8: results.length ? passed / results.length : 0,
    required_recall: 0.9,
    results,
  }
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
  if (report.recall_at_8 < report.required_recall) process.exitCode = 1
}

main().catch(error => {
  process.stderr.write(`Ask Will evaluation failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
