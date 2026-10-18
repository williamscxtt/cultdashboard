#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'

function parseArgs(argv) {
  const args = { apply: false, activate: false, prune: true, bundle: '', vectorStoreId: '' }
  for (let index = 0; index < argv.length; index++) {
    const value = argv[index]
    if (value === '--apply') args.apply = true
    else if (value === '--activate') args.activate = true
    else if (value === '--no-prune') args.prune = false
    else if (value === '--bundle') args.bundle = argv[++index] ?? ''
    else if (value === '--vector-store-id') args.vectorStoreId = argv[++index] ?? ''
    else throw new Error(`Unknown argument: ${value}`)
  }
  if (!args.bundle) throw new Error('Pass --bundle /absolute/path/to/operations/ask-will-ai/build')
  if (args.activate && !args.apply) throw new Error('--activate requires --apply')
  return args
}

async function pooled(items, concurrency, task) {
  let cursor = 0
  const results = []
  async function worker() {
    while (cursor < items.length) {
      const index = cursor++
      results[index] = await task(items[index], index)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length || 1) }, worker))
  return results
}

async function listVectorFiles(openai, vectorStoreId) {
  const files = []
  for await (const file of openai.vectorStores.files.list(vectorStoreId, { limit: 100 })) files.push(file)
  return files
}

async function removeFile(openai, vectorStoreId, fileId) {
  await openai.vectorStores.files.delete(fileId, { vector_store_id: vectorStoreId })
  await openai.files.delete(fileId).catch(() => undefined)
}

async function uploadDocument(openai, vectorStoreId, bundleDir, document) {
  const absolute = path.join(bundleDir, 'documents', document.output_file)
  const uploaded = await openai.files.create({
    file: fs.createReadStream(absolute),
    purpose: 'assistants',
  })
  try {
    const attached = await openai.vectorStores.files.createAndPoll(vectorStoreId, {
      file_id: uploaded.id,
      attributes: {
        document_id: document.document_id,
        content_hash: document.content_hash,
        title: String(document.title).slice(0, 512),
        source_path: String(document.source_path).slice(0, 512),
        knowledge_type: document.knowledge_type,
        authority: document.authority,
        visibility: 'member_safe',
        status: 'current',
        topics: document.topics.join(',').slice(0, 512),
      },
      chunking_strategy: {
        type: 'static',
        static: { max_chunk_size_tokens: 1000, chunk_overlap_tokens: 180 },
      },
    })
    if (attached.status !== 'completed') {
      throw new Error(attached.last_error?.message || `File ${document.source_path} finished with ${attached.status}`)
    }
    return attached
  } catch (error) {
    await openai.files.delete(uploaded.id).catch(() => undefined)
    throw error
  }
}

async function smokeTest(openai, vectorStoreId) {
  const queries = [
    'How should a coach diagnose why the first seconds of a Reel lose viewers?',
    'How should content connect to a paid offer and produce better enquiries?',
    'How should an Instagram Story sequence build trust and lead to a clear call to action?',
  ]
  const outcomes = []
  for (const query of queries) {
    const page = await openai.vectorStores.search(vectorStoreId, {
      query,
      max_num_results: 3,
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
    const results = page.data ?? []
    outcomes.push({
      query,
      passed: results.length > 0,
      results: results.slice(0, 3).map(result => ({
        filename: result.filename,
        score: result.score,
        title: result.attributes?.title,
        source_path: result.attributes?.source_path,
      })),
    })
  }
  return outcomes
}

async function activateVersion(bundle, vectorStoreId) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY are required for --activate')
  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const archived = await supabase.from('ask_will_knowledge_versions').update({ status: 'archived' }).eq('status', 'active')
  if (archived.error) throw archived.error
  const activatedAt = new Date().toISOString()
  const saved = await supabase.from('ask_will_knowledge_versions').upsert({
    version: bundle.knowledge_version,
    vector_store_id: vectorStoreId,
    document_count: bundle.document_count,
    total_words: bundle.total_words,
    manifest: {
      schema_version: bundle.schema_version,
      manifest_path: bundle.manifest_path,
      rejected_count: bundle.rejected_count,
      total_characters: bundle.total_characters,
    },
    status: 'active',
    activated_at: activatedAt,
  }, { onConflict: 'version' })
  if (saved.error) throw saved.error
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const bundleDir = path.resolve(args.bundle)
  const bundlePath = path.join(bundleDir, 'bundle.json')
  const bundle = JSON.parse(fs.readFileSync(bundlePath, 'utf8'))
  const report = {
    knowledge_version: bundle.knowledge_version,
    document_count: bundle.document_count,
    dry_run: !args.apply,
    vector_store_id: args.vectorStoreId || process.env.ASK_WILL_VECTOR_STORE_ID || null,
    added: [],
    changed: [],
    unchanged: [],
    removed: [],
    smoke_tests: [],
    activated: false,
  }

  if (!args.apply) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
    return
  }
  if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is required for --apply')

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  let vectorStoreId = args.vectorStoreId || process.env.ASK_WILL_VECTOR_STORE_ID || ''
  if (!vectorStoreId) {
    const store = await openai.vectorStores.create({
      name: `Ask Will member knowledge ${bundle.knowledge_version}`,
      metadata: { product: 'ask-will', knowledge_version: bundle.knowledge_version },
    })
    vectorStoreId = store.id
    report.vector_store_id = vectorStoreId
  }

  const existingFiles = await listVectorFiles(openai, vectorStoreId)
  const existingByDocument = new Map(existingFiles
    .filter(file => file.attributes?.document_id)
    .map(file => [String(file.attributes.document_id), file]))
  const desiredIds = new Set(bundle.documents.map(document => document.document_id))
  const toUpload = []

  for (const document of bundle.documents) {
    const existing = existingByDocument.get(document.document_id)
    if (!existing) {
      report.added.push(document.source_path)
      toUpload.push({ document, replaces: null })
    } else if (existing.attributes?.content_hash !== document.content_hash) {
      report.changed.push(document.source_path)
      toUpload.push({ document, replaces: existing.id })
    } else {
      report.unchanged.push(document.source_path)
    }
  }

  await pooled(toUpload, 4, async ({ document, replaces }) => {
    await uploadDocument(openai, vectorStoreId, bundleDir, document)
    if (replaces) await removeFile(openai, vectorStoreId, replaces)
  })

  if (args.prune) {
    const stale = existingFiles.filter(file => {
      const documentId = file.attributes?.document_id
      return documentId && !desiredIds.has(String(documentId))
    })
    await pooled(stale, 4, async file => {
      report.removed.push(String(file.attributes?.source_path ?? file.id))
      await removeFile(openai, vectorStoreId, file.id)
    })
  }

  report.smoke_tests = await smokeTest(openai, vectorStoreId)
  if (report.smoke_tests.some(test => !test.passed)) throw new Error('At least one retrieval smoke test returned no results')
  if (args.activate) {
    await activateVersion(bundle, vectorStoreId)
    report.activated = true
  }

  const reportPath = path.join(bundleDir, 'sync-report.json')
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`)
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
}

main().catch(error => {
  process.stderr.write(`Ask Will sync failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
