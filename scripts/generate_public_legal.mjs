import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = path.join(repositoryRoot, 'app', 'public', 'legal-notices.txt')
const writeMode = process.argv.includes('--write')
const sourceFiles = ['LICENSE', 'DATA_LICENSE.md', 'BRAND_LICENSE.md', 'THIRD_PARTY_NOTICES.md']

const sections = []
for (const filename of sourceFiles) {
  sections.push(`===== ${filename} =====\n\n${(await readFile(path.join(repositoryRoot, filename), 'utf8')).trim()}`)
}
const rendered = `WHAT WOULD WIN — LICENCES AND THIRD-PARTY NOTICES\n\n${sections.join('\n\n')}\n`

if (writeMode) {
  await writeFile(outputPath, rendered, 'utf8')
  console.log(`Wrote public legal notices to ${outputPath}`)
} else {
  const existing = await readFile(outputPath, 'utf8').catch(() => '')
  if (existing !== rendered) {
    console.error('app/public/legal-notices.txt is stale. Run: node scripts/generate_public_legal.mjs --write')
    process.exitCode = 1
  } else {
    console.log('Verified public legal notices')
  }
}
