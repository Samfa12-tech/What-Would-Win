import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = path.join(repositoryRoot, 'app', 'public', 'legal-notices.txt')
const writeMode = process.argv.includes('--write')
const sourceFiles = ['LICENSE', 'DATA_LICENSE.md', 'BRAND_LICENSE.md', 'THIRD_PARTY_NOTICES.md']

export function renderPublicLegalNotices(sources) {
  const sections = sources.map(({ filename, contents }) => {
    // Git can materialise text as CRLF on Windows. The public artifact is
    // canonical LF, so compare rendered text rather than checkout-specific bytes.
    const normalized = contents.replace(/\r\n?/g, '\n').trim()
    return `===== ${filename} =====\n\n${normalized}`
  })
  return `WHAT WOULD WIN — LICENCES AND THIRD-PARTY NOTICES\n\n${sections.join('\n\n')}\n`
}

async function main() {
  const sources = await Promise.all(sourceFiles.map(async (filename) => ({
    filename,
    contents: await readFile(path.join(repositoryRoot, filename), 'utf8'),
  })))
  const rendered = renderPublicLegalNotices(sources)

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
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
