import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lock = JSON.parse(await readFile(path.join(repositoryRoot, 'app', 'package-lock.json'), 'utf8'))
const notices = await readFile(path.join(repositoryRoot, 'THIRD_PARTY_NOTICES.md'), 'utf8')
const missing = []

for (const [packagePath, metadata] of Object.entries(lock.packages)) {
  if (!packagePath.startsWith('node_modules/') || metadata.dev || metadata.optional) continue
  const name = packagePath.slice('node_modules/'.length)
  const marker = `${name} ${metadata.version}`
  if (!notices.includes(marker)) missing.push(marker)
}

if (missing.length) {
  console.error(`Runtime packages missing from THIRD_PARTY_NOTICES.md:\n- ${missing.join('\n- ')}`)
  process.exitCode = 1
} else {
  console.log('Verified runtime dependency notices')
}
