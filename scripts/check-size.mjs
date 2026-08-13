#!/usr/bin/env node
/**
 * Asserts the budget documented in CONTRIBUTING.md: the JavaScript a
 * first-time visitor downloads must stay under BUDGET_KB once gzipped.
 *
 * The target audience uses school tablets on shared wifi. A budget that is not
 * enforced by the build is a budget that quietly disappears, so this runs as
 * part of `npm run verify`.
 */
import { gzipSync } from 'node:zlib'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const BUDGET_KB = 200
const DIST = 'dist'

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : [full]
  })
}

let files
try {
  files = walk(DIST).filter((f) => f.endsWith('.js'))
} catch {
  console.error(`✗ ${DIST}/ not found — run \`npm run build\` first.`)
  process.exit(1)
}

if (files.length === 0) {
  console.error(`✗ no JavaScript found in ${DIST}/ — the build produced nothing to measure.`)
  process.exit(1)
}

const measured = files
  .map((file) => ({ file, gzip: gzipSync(readFileSync(file)).length }))
  .toSorted((a, b) => b.gzip - a.gzip)

const total = measured.reduce((sum, m) => sum + m.gzip, 0)
const totalKb = total / 1024

for (const { file, gzip } of measured) {
  console.log(`  ${(gzip / 1024).toFixed(1).padStart(7)} KB  ${file}`)
}
console.log(`  ${'—'.repeat(7)}`)
console.log(`  ${totalKb.toFixed(1).padStart(7)} KB  total (gzip), budget ${BUDGET_KB} KB`)

if (totalKb > BUDGET_KB) {
  console.error(`\n✗ over budget by ${(totalKb - BUDGET_KB).toFixed(1)} KB.`)
  process.exit(1)
}

console.log(`\n✓ ${(BUDGET_KB - totalKb).toFixed(1)} KB of headroom.`)
