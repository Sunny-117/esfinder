import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('Performance Comparison', () => {
  const sourcePath = path.resolve(__dirname, './fixtures/source.ts')
  const iterations = 100

  it('should compare parsing performance between parsers', async () => {
    // Babel performance
    const babelStart = performance.now()
    const { parseExports: babelParseExports } = await import('esfinder')
    
    for (let i = 0; i < iterations; i++) {
      await babelParseExports(sourcePath)
    }
    const babelEnd = performance.now()
    const babelTime = babelEnd - babelStart

    // SWC performance
    const swcStart = performance.now()
    const { parseExports: swcParseExports } = await import('esfinder/swc')
    
    for (let i = 0; i < iterations; i++) {
      await swcParseExports(sourcePath)
    }
    const swcEnd = performance.now()
    const swcTime = swcEnd - swcStart

    // OXC performance
    let oxcTime = 0
    try {
      const oxcStart = performance.now()
      const { parseExports: oxcParseExports } = await import('esfinder/oxc')
      
      for (let i = 0; i < iterations; i++) {
        await oxcParseExports(sourcePath)
      }
      const oxcEnd = performance.now()
      oxcTime = oxcEnd - oxcStart
    } catch (error) {
      // @ts-expect-error
      if (error.message.includes('Cannot find native binding')) {
        console.warn('OXC parser not available on this platform')
        oxcTime = -1 // Mark as unavailable
      } else {
        throw error
      }
    }

    console.log(`Performance Results (${iterations} iterations):`)
    console.log(`Babel: ${babelTime.toFixed(2)}ms`)
    console.log(`SWC: ${swcTime.toFixed(2)}ms`)
    if (oxcTime >= 0) {
      console.log(`OXC: ${oxcTime.toFixed(2)}ms`)
    } else {
      console.log(`OXC: Not available on this platform`)
    }

    // 所有可用的解析器都应该能正常工作
    expect(babelTime).toBeGreaterThan(0)
    expect(swcTime).toBeGreaterThan(0)
    if (oxcTime >= 0) {
      expect(oxcTime).toBeGreaterThan(0)
    }
  })

  it('should compare cache effectiveness', async () => {
    const { parseExports, getCacheStats, clearCache } = await import('esfinder')
    
    // 清除缓存
    clearCache()
    
    // 第一次解析（无缓存）
    const start1 = performance.now()
    await parseExports(sourcePath)
    const end1 = performance.now()
    const firstTime = end1 - start1
    
    // 第二次解析（有缓存）
    const start2 = performance.now()
    await parseExports(sourcePath)
    const end2 = performance.now()
    const secondTime = end2 - start2
    
    const stats = getCacheStats()
    
    console.log(`Cache Performance:`)
    console.log(`First parse: ${firstTime.toFixed(2)}ms`)
    console.log(`Cached parse: ${secondTime.toFixed(2)}ms`)
    console.log(`Cache entries: ${stats.exportsCache}`)
    
    // 缓存应该显著提高性能
    expect(secondTime).toBeLessThan(firstTime)
    expect(stats.exportsCache).toBeGreaterThan(0)
  })
})