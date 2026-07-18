import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const appRoot = fileURLToPath(new URL('../', import.meta.url))
const distRoot = join(appRoot, 'dist')

const budgets = {
  // 0.2 intentionally adds 34 validated profiles and share-v3 methodology data.
  // These raw-file ceilings preserve static-host discipline while retaining headroom.
  javascript: 575_000,
  css: 25_000,
  total: 700_000,
}

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await filesUnder(path))
    else if (entry.isFile()) files.push(path)
  }
  return files
}

const files = await filesUnder(distRoot)
const sizes = await Promise.all(files.map(async (path) => ({
  path,
  bytes: (await stat(path)).size,
})))

const javascript = sizes.filter((file) => file.path.endsWith('.js')).reduce((sum, file) => sum + file.bytes, 0)
const css = sizes.filter((file) => file.path.endsWith('.css')).reduce((sum, file) => sum + file.bytes, 0)
const total = sizes.reduce((sum, file) => sum + file.bytes, 0)

const measurements = { javascript, css, total }
let failed = false
for (const [name, bytes] of Object.entries(measurements)) {
  const limit = budgets[name]
  const status = bytes <= limit ? 'PASS' : 'FAIL'
  console.log(`${status} ${name}: ${bytes.toLocaleString()} / ${limit.toLocaleString()} bytes`)
  failed ||= bytes > limit
}

for (const file of sizes.sort((a, b) => b.bytes - a.bytes)) {
  console.log(`  ${relative(appRoot, file.path)}: ${file.bytes.toLocaleString()} bytes`)
}

if (failed) process.exitCode = 1
