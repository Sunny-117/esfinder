#!/usr/bin/env node

import path from 'node:path'
import { performance } from 'node:perf_hooks'

async function benchmarkParsers() {
  console.log('🚀 ESFinder Parser Performance Benchmark\n')

  const testFile = path.resolve('./test/fixtures/source.ts')
  const iterations = 1000

  console.log(`📁 Test file: ${testFile}`)
  console.log(`🔄 Iterations: ${iterations}\n`)

  // Babel benchmark
  console.log('📊 Babel Parser:')
  const babelStart = performance.now()
  const { parseExports: babelParseExports } = await import('../dist/index.mjs')

  for (let i = 0; i < iterations; i++) {
    await babelParseExports(testFile)
  }
  const babelEnd = performance.now()
  const babelTime = babelEnd - babelStart
  console.log(`  ⏱️  Time: ${babelTime.toFixed(2)}ms`)
  console.log(`  📈 Avg: ${(babelTime / iterations).toFixed(3)}ms per file`)

  // SWC benchmark
  console.log('\n📊 SWC Parser:')
  const swcStart = performance.now()
  const { parseExports: swcParseExports } = await import('../dist/swc.mjs')

  for (let i = 0; i < iterations; i++) {
    await swcParseExports(testFile)
  }
  const swcEnd = performance.now()
  const swcTime = swcEnd - swcStart
  console.log(`  ⏱️  Time: ${swcTime.toFixed(2)}ms`)
  console.log(`  📈 Avg: ${(swcTime / iterations).toFixed(3)}ms per file`)
  console.log(`  🚀 Speedup: ${(babelTime / swcTime).toFixed(1)}x faster than Babel`)

  // OXC benchmark (if available)
  console.log('\n📊 OXC Parser:')
  try {
    const oxcStart = performance.now()
    const { parseExports: oxcParseExports } = await import('../dist/oxc.mjs')

    for (let i = 0; i < iterations; i++) {
      await oxcParseExports(testFile)
    }
    const oxcEnd = performance.now()
    const oxcTime = oxcEnd - oxcStart
    console.log(`  ⏱️  Time: ${oxcTime.toFixed(2)}ms`)
    console.log(`  📈 Avg: ${(oxcTime / iterations).toFixed(3)}ms per file`)
    console.log(`  🚀 Speedup: ${(babelTime / oxcTime).toFixed(1)}x faster than Babel`)
    console.log(`  🚀 Speedup: ${(swcTime / oxcTime).toFixed(1)}x faster than SWC`)
  }
  catch (error) {
    console.log('  ❌ Not available on this platform')
  }

  // Cache effectiveness test
  console.log('\n💾 Cache Effectiveness Test:')
  const { clearCache, getCacheStats } = await import('../dist/index.mjs')

  clearCache()

  // First parse (no cache)
  const firstStart = performance.now()
  await babelParseExports(testFile)
  const firstEnd = performance.now()
  const firstTime = firstEnd - firstStart

  // Second parse (with cache)
  const secondStart = performance.now()
  await babelParseExports(testFile)
  const secondEnd = performance.now()
  const secondTime = secondEnd - secondStart

  const stats = getCacheStats()

  console.log(`  🔥 First parse: ${firstTime.toFixed(2)}ms`)
  console.log(`  ⚡ Cached parse: ${secondTime.toFixed(2)}ms`)
  console.log(`  🚀 Cache speedup: ${(firstTime / secondTime).toFixed(0)}x faster`)
  console.log(`  📊 Cache entries: ${stats.exportsCache}`)

  console.log('\n✨ Benchmark completed!')
}

benchmarkParsers().catch(console.error)
