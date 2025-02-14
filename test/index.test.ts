import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('parseExports', () => {
  it('should parse all types of exports correctly', async () => {
    const { parseExports } = await import('../src/index')
    const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
    const exports = await parseExports(sourcePath)

    expect(exports).toBeInstanceOf(Set)
    expect(exports.size).toBe(6) // a, b, C, a1, b1, default
    expect(exports.has('a')).toBe(true)
    expect(exports.has('b')).toBe(true)
    expect(exports.has('C')).toBe(true)
    expect(exports.has('a1')).toBe(true)
    expect(exports.has('b1')).toBe(true)
    expect(exports.has('default')).toBe(true)
  })
})

describe('getRelatedFiles', () => {
  it('should find files that import from target', async () => {
    const { getRelatedFiles } = await import('../src/index')
    const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
    const testsDir = path.resolve(__dirname, './fixtures/tests')
    
    const relatedFiles = await getRelatedFiles([sourcePath], testsDir)

    expect(relatedFiles).toHaveLength(2)
    expect(relatedFiles).toContain(path.resolve(testsDir, 'test1.ts'))
    expect(relatedFiles).toContain(path.resolve(testsDir, 'test2.ts'))
    expect(relatedFiles).not.toContain(path.resolve(testsDir, 'unrelated.ts'))
  })

  it('should handle multiple target files', async () => {
    const { getRelatedFiles } = await import('../src/index')
    const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
    const testsDir = path.resolve(__dirname, './fixtures/tests')
    
    const relatedFiles = await getRelatedFiles([sourcePath], testsDir)
    expect(relatedFiles.length).toBeGreaterThan(0)
  })

  it('should return empty array when no related files found', async () => {
    const { getRelatedFiles } = await import('../src/index')
    const nonExistentPath = path.resolve(__dirname, './fixtures/non-existent.ts')
    const testsDir = path.resolve(__dirname, './fixtures/tests')
    
    const relatedFiles = await getRelatedFiles([nonExistentPath], testsDir)
    expect(relatedFiles).toHaveLength(0)
  })
})
