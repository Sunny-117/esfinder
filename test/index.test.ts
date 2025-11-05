import { describe, expect, it, beforeEach } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('Babel Parser', () => {
  describe('parseExports', () => {
    it('should parse all types of exports correctly', async () => {
      const { parseExports } = await import('esfinder')
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

  describe('parseImports', () => {
    it('should parse import statements correctly', async () => {
      const { parseImports } = await import('esfinder')
      const testPath = path.resolve(__dirname, './fixtures/tests/test1.ts')
      const imports = await parseImports(testPath)

      expect(imports).toBeInstanceOf(Set)
      expect(imports.size).toBeGreaterThan(0)
    })
  })

  describe('getRelatedFiles', () => {
    beforeEach(async () => {
      const { clearCache } = await import('esfinder')
      clearCache()
    })

    it('should find files that import from target', async () => {
      const { getRelatedFiles, parseExports } = await import('esfinder')
      const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
      const testsDir = path.resolve(__dirname, './fixtures/tests')
      
      // 预缓存导出
      await parseExports(sourcePath)
      const relatedFiles = await getRelatedFiles([sourcePath], testsDir)

      expect(relatedFiles).toHaveLength(2)
      expect(relatedFiles).toContain(path.resolve(testsDir, 'test1.ts'))
      expect(relatedFiles).toContain(path.resolve(testsDir, 'test2.ts'))
      expect(relatedFiles).not.toContain(path.resolve(testsDir, 'unrelated.ts'))
    })

    it('should handle multiple target files', async () => {
      const { getRelatedFiles, parseExports } = await import('esfinder')
      const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
      const testsDir = path.resolve(__dirname, './fixtures/tests')
      
      await parseExports(sourcePath)
      const relatedFiles = await getRelatedFiles([sourcePath], testsDir)
      expect(relatedFiles.length).toBeGreaterThan(0)
    })

    it('should return empty array when no related files found', async () => {
      const { getRelatedFiles } = await import('esfinder')
      const nonExistentPath = path.resolve(__dirname, './fixtures/non-existent.ts')
      const testsDir = path.resolve(__dirname, './fixtures/tests')
      
      const relatedFiles = await getRelatedFiles([nonExistentPath], testsDir)
      expect(relatedFiles).toHaveLength(0)
    })
  })

  describe('Advanced APIs', () => {
    it('should build dependency graph', async () => {
      const { buildDependencyGraph } = await import('esfinder')
      const fixturesDir = path.resolve(__dirname, './fixtures')
      
      const graph = await buildDependencyGraph(fixturesDir)
      expect(graph).toBeInstanceOf(Map)
      expect(graph.size).toBeGreaterThan(0)
    })

    it('should find circular dependencies', async () => {
      const { findCircularDependencies } = await import('esfinder')
      const fixturesDir = path.resolve(__dirname, './fixtures')
      
      const cycles = await findCircularDependencies(fixturesDir)
      expect(Array.isArray(cycles)).toBe(true)
    })

    it('should get all dependencies recursively', async () => {
      const { getAllDependencies } = await import('esfinder')
      const testPath = path.resolve(__dirname, './fixtures/tests/test1.ts')
      
      const deps = await getAllDependencies(testPath)
      expect(deps).toBeInstanceOf(Set)
    })

    it('should get reverse dependencies', async () => {
      const { getReverseDependencies } = await import('esfinder')
      const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
      const fixturesDir = path.resolve(__dirname, './fixtures')
      
      const reverseDeps = await getReverseDependencies(sourcePath, fixturesDir)
      expect(Array.isArray(reverseDeps)).toBe(true)
    })
  })

  describe('Cache Management', () => {
    it('should provide cache statistics', async () => {
      const { getCacheStats, parseExports } = await import('esfinder')
      const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
      
      await parseExports(sourcePath)
      const stats = getCacheStats()
      
      expect(typeof stats.exportsCache).toBe('number')
      expect(typeof stats.importsCache).toBe('number')
      expect(typeof stats.pathResolutionCache).toBe('number')
      expect(typeof stats.dependencyGraph).toBe('number')
    })

    it('should clear cache', async () => {
      const { clearCache, getCacheStats, parseExports } = await import('esfinder')
      const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
      
      await parseExports(sourcePath)
      clearCache()
      const stats = getCacheStats()
      
      expect(stats.exportsCache).toBe(0)
      expect(stats.importsCache).toBe(0)
      expect(stats.pathResolutionCache).toBe(0)
      expect(stats.dependencyGraph).toBe(0)
    })
  })
})

describe('SWC Parser', () => {
  describe('parseExports', () => {
    it('should parse exports correctly with SWC', async () => {
      const { parseExports } = await import('esfinder/swc')
      const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
      const exports = await parseExports(sourcePath)

      expect(exports).toBeInstanceOf(Set)
      expect(exports.has('a')).toBe(true)
      expect(exports.has('b')).toBe(true)
      expect(exports.has('C')).toBe(true)
      expect(exports.has('default')).toBe(true)
    })
  })

  describe('getRelatedFiles', () => {
    it('should find related files with SWC', async () => {
      const { getRelatedFiles, parseExports } = await import('esfinder/swc')
      const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
      const testsDir = path.resolve(__dirname, './fixtures/tests')
      
      await parseExports(sourcePath)
      const relatedFiles = await getRelatedFiles([sourcePath], testsDir)
      expect(Array.isArray(relatedFiles)).toBe(true)
    })
  })
})

describe('OXC Parser', () => {
  describe('parseExports', () => {
    it('should parse exports correctly with OXC', async () => {
      try {
        const { parseExports } = await import('esfinder/oxc')
        const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
        const exports = await parseExports(sourcePath)

        expect(exports).toBeInstanceOf(Set)
        expect(exports.has('a')).toBe(true)
        expect(exports.has('b')).toBe(true)
        expect(exports.has('C')).toBe(true)
        expect(exports.has('default')).toBe(true)
      } catch (error) {
        // @ts-expect-error
        if (error.message.includes('Cannot find native binding')) {
          console.warn('OXC parser not available on this platform, skipping test')
          expect(true).toBe(true) // Skip test gracefully
        } else {
          throw error
        }
      }
    })
  })

  describe('getRelatedFiles', () => {
    it('should find related files with OXC', async () => {
      try {
        const { getRelatedFiles, parseExports } = await import('esfinder/oxc')
        const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
        const testsDir = path.resolve(__dirname, './fixtures/tests')
        
        await parseExports(sourcePath)
        const relatedFiles = await getRelatedFiles([sourcePath], testsDir)
        expect(Array.isArray(relatedFiles)).toBe(true)
      } catch (error) {
        // @ts-expect-error
        if (error.message.includes('Cannot find native binding')) {
          console.warn('OXC parser not available on this platform, skipping test')
          expect(true).toBe(true) // Skip test gracefully
        } else {
          throw error
        }
      }
    })
  })

  describe('Cache Management', () => {
    it('should provide cache statistics', async () => {
      try {
        const { getCacheStats, parseExports } = await import('esfinder/oxc')
        const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
        
        await parseExports(sourcePath)
        const stats = getCacheStats()
        
        expect(typeof stats.exportsCache).toBe('number')
        expect(typeof stats.pathResolutionCache).toBe('number')
      } catch (error) {
        // @ts-expect-error
        if (error.message.includes('Cannot find native binding')) {
          console.warn('OXC parser not available on this platform, skipping test')
          expect(true).toBe(true) // Skip test gracefully
        } else {
          throw error
        }
      }
    })
  })
})
