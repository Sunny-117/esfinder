#!/usr/bin/env node

import { parseExports, getRelatedFiles, findCircularDependencies } from '../dist/index.mjs'
import path from 'node:path'

async function demo() {
  console.log('🚀 ESFinder CLI Demo\n')
  
  // Demo 1: Parse exports
  console.log('📦 Demo 1: Parsing exports from source.ts')
  const sourcePath = path.resolve('./test/fixtures/source.ts')
  const exports = await parseExports(sourcePath)
  console.log('Exports found:', Array.from(exports))
  console.log()
  
  // Demo 2: Find related files
  console.log('🔗 Demo 2: Finding files related to source.ts')
  const relatedFiles = await getRelatedFiles([sourcePath], './test/fixtures/tests')
  console.log('Related files:')
  relatedFiles.forEach(file => {
    console.log(`  • ${path.relative(process.cwd(), file)}`)
  })
  console.log()
  
  // Demo 3: Check for circular dependencies
  console.log('🔄 Demo 3: Checking for circular dependencies')
  const cycles = await findCircularDependencies('./test/fixtures')
  if (cycles.length === 0) {
    console.log('✅ No circular dependencies found')
  } else {
    console.log(`❌ Found ${cycles.length} circular dependencies:`)
    cycles.forEach((cycle, index) => {
      console.log(`  ${index + 1}. ${cycle.join(' → ')}`)
    })
  }
  console.log()
  
  console.log('✨ Demo completed!')
}

demo().catch(console.error)