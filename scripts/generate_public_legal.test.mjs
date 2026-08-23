import assert from 'node:assert/strict'
import test from 'node:test'
import { renderPublicLegalNotices } from './generate_public_legal.mjs'

test('public legal rendering is stable when checked-out Markdown sources use CRLF', () => {
  const sources = [
    { filename: 'LICENSE', contents: 'First line\nSecond line\n' },
    { filename: 'DATA_LICENSE.md', contents: 'Data line\n' },
    { filename: 'BRAND_LICENSE.md', contents: 'Brand line\n' },
    { filename: 'THIRD_PARTY_NOTICES.md', contents: 'Third-party line\n' },
  ]
  const lf = renderPublicLegalNotices(sources)
  const crlf = renderPublicLegalNotices(sources.map(({ filename, contents }) => ({
    filename,
    contents: contents.replaceAll('\n', '\r\n'),
  })))

  assert.equal(crlf, lf)
})
