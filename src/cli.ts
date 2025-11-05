#!/usr/bin/env node

import path from 'node:path'
import process from 'node:process'
import { program } from 'commander'

program
  .name('esfinder')
  .description('A fast and powerful tool for analyzing module dependencies')
  .version('0.0.2-alpha.5')

program
  .command('exports <file>')
  .description('Parse and display exports from a file')
  .option('-p, --parser <parser>', 'Parser to use (babel|swc|oxc)', 'babel')
  .action(async (file: string, options: { parser: string }) => {
    try {
      let parseExports

      switch (options.parser) {
        case 'swc':
          parseExports = (await import('./swc.js')).parseExports
          break
        case 'oxc':
          try {
            parseExports = (await import('./oxc.js')).parseExports
          }
          catch (error) {
            console.error('OXC parser not available on this platform')
            process.exit(1)
          }
          break
        default:
          parseExports = (await import('./index.js')).parseExports
      }

      const filePath = path.resolve(file)
      const exports = await parseExports(filePath)

      console.log(`📦 Exports from ${file}:`)
      if (exports.size === 0) {
        console.log('  No exports found')
      }
      else {
        Array.from(exports).forEach((exp) => {
          console.log(`  • ${exp}`)
        })
      }
    }
    catch (error) {
      console.error('Error:', (error as Error).message)
      process.exit(1)
    }
  })

program
  .command('related <files...>')
  .description('Find files related to the given files')
  .option('-d, --dir <dir>', 'Directory to search in', './src')
  .option('-p, --parser <parser>', 'Parser to use (babel|swc|oxc)', 'babel')
  .action(async (files: string[], options: { dir: string, parser: string }) => {
    try {
      let getRelatedFiles, parseExports

      switch (options.parser) {
        case 'swc':
          const swcModule = await import('./swc.js')
          getRelatedFiles = swcModule.getRelatedFiles
          parseExports = swcModule.parseExports
          break
        case 'oxc':
          try {
            const oxcModule = await import('./oxc.js')
            getRelatedFiles = oxcModule.getRelatedFiles
            parseExports = oxcModule.parseExports
          }
          catch (error) {
            console.error('OXC parser not available on this platform')
            process.exit(1)
          }
          break
        default:
          const babelModule = await import('./index.js')
          getRelatedFiles = babelModule.getRelatedFiles
          parseExports = babelModule.parseExports
      }

      // Pre-cache exports
      console.log('🔍 Analyzing files...')
      await Promise.all(files.map(f => parseExports(path.resolve(f))))

      const relatedFiles = await getRelatedFiles(files, options.dir)

      console.log(`🔗 Files related to ${files.join(', ')}:`)
      if (relatedFiles.length === 0) {
        console.log('  No related files found')
      }
      else {
        relatedFiles.forEach((file) => {
          console.log(`  • ${path.relative(process.cwd(), file)}`)
        })
      }
    }
    catch (error) {
      console.error('Error:', (error as Error).message)
      process.exit(1)
    }
  })

program
  .command('check <dir>')
  .description('Run health checks on a project directory')
  .action(async (dir: string) => {
    try {
      const {
        findCircularDependencies,
        findUnusedExports,
        buildDependencyGraph,
        getCacheStats,
      } = await import('./index.js')

      console.log(`🏥 Running health checks on ${dir}...`)

      // Check circular dependencies
      console.log('\n🔄 Checking for circular dependencies...')
      const cycles = await findCircularDependencies(dir)
      if (cycles.length === 0) {
        console.log('  ✅ No circular dependencies found')
      }
      else {
        console.log(`  ❌ Found ${cycles.length} circular dependencies:`)
        cycles.forEach((cycle, index) => {
          console.log(`    ${index + 1}. ${cycle.join(' → ')}`)
        })
      }

      // Check unused exports
      console.log('\n📤 Checking for unused exports...')
      const unusedExports = await findUnusedExports(dir)
      if (unusedExports.size === 0) {
        console.log('  ✅ No unused exports found')
      }
      else {
        console.log(`  ❌ Found unused exports in ${unusedExports.size} files:`)
        for (const [file, unused] of unusedExports) {
          const relativePath = path.relative(process.cwd(), file)
          console.log(`    ${relativePath}: ${Array.from(unused).join(', ')}`)
        }
      }

      // Generate statistics
      console.log('\n📊 Project statistics...')
      const graph = await buildDependencyGraph(dir)
      const totalFiles = graph.size
      const avgImports = Array.from(graph.values()).reduce((sum, { imports }) => sum + imports.size, 0) / totalFiles
      const avgExports = Array.from(graph.values()).reduce((sum, { exports }) => sum + exports.size, 0) / totalFiles

      console.log(`  📁 Total files: ${totalFiles}`)
      console.log(`  📥 Average imports per file: ${avgImports.toFixed(2)}`)
      console.log(`  📤 Average exports per file: ${avgExports.toFixed(2)}`)

      const stats = getCacheStats()
      console.log(`  💾 Cache entries: ${stats.exportsCache} exports, ${stats.importsCache} imports`)
    }
    catch (error) {
      console.error('Error:', (error as Error).message)
      process.exit(1)
    }
  })

program
  .command('graph <dir>')
  .description('Build and display dependency graph')
  .option('-f, --format <format>', 'Output format (json|text)', 'text')
  .action(async (dir: string, options: { format: string }) => {
    try {
      const { buildDependencyGraph } = await import('./index.js')

      console.log(`📊 Building dependency graph for ${dir}...`)
      const graph = await buildDependencyGraph(dir)

      if (options.format === 'json') {
        const jsonGraph: Record<string, { imports: string[], exports: string[] }> = {}
        for (const [file, { imports, exports }] of graph) {
          jsonGraph[file] = {
            imports: Array.from(imports),
            exports: Array.from(exports),
          }
        }
        console.log(JSON.stringify(jsonGraph, null, 2))
      }
      else {
        console.log(`\n📈 Dependency Graph (${graph.size} files):\n`)
        for (const [file, { imports, exports }] of graph) {
          const relativePath = path.relative(process.cwd(), file)
          console.log(`📄 ${relativePath}`)
          console.log(`  📥 Imports (${imports.size}): ${Array.from(imports).map(f => path.relative(process.cwd(), f)).join(', ') || 'none'}`)
          console.log(`  📤 Exports (${exports.size}): ${Array.from(exports).join(', ') || 'none'}`)
          console.log()
        }
      }
    }
    catch (error) {
      console.error('Error:', (error as Error).message)
      process.exit(1)
    }
  })

program
  .command('cache')
  .description('Manage cache')
  .option('-c, --clear', 'Clear all caches')
  .option('-s, --stats', 'Show cache statistics')
  .action(async (options: { clear?: boolean, stats?: boolean }) => {
    const { clearCache, getCacheStats } = await import('./index.js')

    if (options.clear) {
      clearCache()
      console.log('✅ Cache cleared')
    }

    if (options.stats || (!options.clear && !options.stats)) {
      const stats = getCacheStats()
      console.log('💾 Cache Statistics:')
      console.log(`  Exports cache: ${stats.exportsCache} entries`)
      console.log(`  Imports cache: ${stats.importsCache} entries`)
      console.log(`  Path resolution cache: ${stats.pathResolutionCache} entries`)
      console.log(`  Dependency graph cache: ${stats.dependencyGraph} entries`)
    }
  })

// Parse command line arguments
program.parse()
