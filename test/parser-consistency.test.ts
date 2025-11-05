import { describe, expect, it } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('Parser Consistency', () => {
  const sourcePath = path.resolve(__dirname, './fixtures/source.ts')

  it('should produce consistent results across all parsers', async () => {
    // Babel results
    const { parseExports: babelParseExports } = await import('esfinder')
    const babelExports = await babelParseExports(sourcePath)
    const babelExportsArray = Array.from(babelExports).sort()

    // SWC results
    const { parseExports: swcParseExports } = await import('esfinder/swc')
    const swcExports = await swcParseExports(sourcePath)
    const swcExportsArray = Array.from(swcExports).sort()

    // 验证 Babel 和 SWC 结果一致
    expect(swcExportsArray).toEqual(babelExportsArray)

    // OXC results (if available)
    try {
      const { parseExports: oxcParseExports } = await import('esfinder/oxc')
      const oxcExports = await oxcParseExports(sourcePath)
      const oxcExportsArray = Array.from(oxcExports).sort()

      // 验证 OXC 和其他解析器结果一致
      expect(oxcExportsArray).toEqual(babelExportsArray)
      
      console.log('✅ All parsers produce consistent results:', babelExportsArray)
    } catch (error) {
      // @ts-expect-error
      if (error.message.includes('OXC parser') || error.message.includes('Node.js')) {
        console.warn('OXC parser not available, skipping consistency check')
      } else {
        throw error
      }
    }
  })

  it('should handle getRelatedFiles consistently', async () => {
    const testsDir = path.resolve(__dirname, './fixtures/tests')

    // Babel results
    const { getRelatedFiles: babelGetRelatedFiles, parseExports: babelParseExports } = await import('esfinder')
    await babelParseExports(sourcePath)
    const babelRelated = await babelGetRelatedFiles([sourcePath], testsDir)
    const babelRelatedSorted = babelRelated.sort()

    // SWC results
    const { getRelatedFiles: swcGetRelatedFiles, parseExports: swcParseExports } = await import('esfinder/swc')
    await swcParseExports(sourcePath)
    const swcRelated = await swcGetRelatedFiles([sourcePath], testsDir)
    const swcRelatedSorted = swcRelated.sort()

    // 验证结果一致
    expect(swcRelatedSorted).toEqual(babelRelatedSorted)

    // OXC results (if available)
    try {
      const { getRelatedFiles: oxcGetRelatedFiles, parseExports: oxcParseExports } = await import('esfinder/oxc')
      await oxcParseExports(sourcePath)
      const oxcRelated = await oxcGetRelatedFiles([sourcePath], testsDir)
      const oxcRelatedSorted = oxcRelated.sort()

      expect(oxcRelatedSorted).toEqual(babelRelatedSorted)
      
      console.log('✅ All parsers find same related files:', babelRelatedSorted.length, 'files')
    } catch (error) {
      // @ts-expect-error
      if (error.message.includes('OXC parser') || error.message.includes('Node.js')) {
        console.warn('OXC parser not available, skipping related files consistency check')
      } else {
        throw error
      }
    }
  })
})