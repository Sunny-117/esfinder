# esfinder

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

English | <a href="./README-zh.md">简体中文</a>

A fast and powerful tool for analyzing module dependencies and finding related files in JavaScript and TypeScript projects. ESFinder supports multiple parsers (Babel, SWC, OXC) and provides comprehensive dependency analysis capabilities.

## ✨ Features

- 🚀 **Multiple Parsers**: Support for Babel, SWC, and OXC parsers
- ⚡ **High Performance**: Optimized with caching and efficient algorithms
- 🔍 **Comprehensive Analysis**: Find related files, circular dependencies, unused exports
- 📦 **Smart Resolution**: Automatic file extension resolution and path handling
- 🛠️ **Developer Friendly**: Rich API with TypeScript support
- 🎯 **Zero Config**: Works out of the box with sensible defaults

## 📦 Installation

```bash
npm install esfinder
```

## 🚀 Quick Start

```typescript
import { getRelatedFiles, parseExports } from 'esfinder'

// Parse file exports
const exports = await parseExports('./src/utils.ts')
console.log('Exports:', Array.from(exports))

// Find related files
const relatedFiles = await getRelatedFiles(['./src/utils.ts'], './src/components')
console.log('Related files:', relatedFiles)
```

## 🎯 Parser Options

ESFinder supports three different parsers, each optimized for different use cases:

### Babel Parser (Default)
```typescript
import { parseExports } from 'esfinder'
```
- **Best for**: Production analysis, complex syntax support
- **Pros**: Most complete feature set, excellent accuracy
- **Cons**: Slower performance, higher memory usage

### SWC Parser
```typescript
import { parseExports } from 'esfinder/swc'
```
- **Best for**: Development environments, balanced performance
- **Pros**: Fast parsing, good syntax support
- **Cons**: Limited plugin ecosystem

### OXC Parser
```typescript
import { parseExports } from 'esfinder/oxc'
```
- **Best for**: Large projects, CI/CD environments
- **Pros**: Fastest performance, lowest memory usage
- **Cons**: Basic feature set, limited syntax support

### Benchmark

```
➜  esfinder git:(main) ✗ node benchmark/compare-parsers.mjs
🚀 ESFinder Parser Performance Benchmark

📁 Test file: /Users/olive/Desktop/code/Sunny-117/esfinder/test/fixtures/source.ts
🔄 Iterations: 1000

📊 Babel Parser:
  ⏱️  Time: 192.92ms
  📈 Avg: 0.193ms per file

📊 SWC Parser:
  ⏱️  Time: 49.28ms
  📈 Avg: 0.049ms per file
  🚀 Speedup: 3.9x faster than Babel

📊 OXC Parser:
  ⏱️  Time: 28.79ms
  📈 Avg: 0.029ms per file
  🚀 Speedup: 6.7x faster than Babel
  🚀 Speedup: 1.7x faster than SWC

💾 Cache Effectiveness Test:
  🔥 First parse: 1.66ms
  ⚡ Cached parse: 0.04ms
  🚀 Cache speedup: 38x faster
  📊 Cache entries: 1

✨ Benchmark completed!
```
## 📚 Core API

### Basic Functions

#### `parseExports(filePath: string): Promise<Set<string>>`
Parse all exports from a file.

```typescript
const exports = await parseExports('./src/utils.ts')
// Returns: Set { 'formatDate', 'parseUrl', 'default' }
```

#### `parseImports(filePath: string): Promise<Set<string>>`
Parse all imports from a file.

```typescript
const imports = await parseImports('./src/app.ts')
// Returns: Set { '/path/to/utils.ts', '/path/to/config.ts' }
```

#### `getRelatedFiles(files: string[], importsDir: string, extensions?: string[]): Promise<string[]>`
Find files that import from the specified files.

```typescript
const relatedFiles = await getRelatedFiles(
  ['./src/utils.ts'],
  './src/components',
  ['.ts', '.tsx'] // optional
)
```

### Advanced Functions

#### `buildDependencyGraph(projectDir: string): Promise<Map<string, {imports: Set<string>, exports: Set<string>}>>`
Build a complete dependency graph for the project.

```typescript
const graph = await buildDependencyGraph('./src')
for (const [file, { imports, exports }] of graph) {
  console.log(`${file} imports ${imports.size} files, exports ${exports.size} items`)
}
```

#### `findCircularDependencies(projectDir: string): Promise<string[][]>`
Detect circular dependencies in your project.

```typescript
const cycles = await findCircularDependencies('./src')
cycles.forEach((cycle) => {
  console.log('Circular dependency:', cycle.join(' → '))
})
```

#### `getAllDependencies(filePath: string): Promise<Set<string>>`
Get all dependencies of a file recursively.

```typescript
const allDeps = await getAllDependencies('./src/app.ts')
console.log('All dependencies:', Array.from(allDeps))
```

#### `getReverseDependencies(targetFile: string, projectDir: string): Promise<string[]>`
Find all files that depend on the target file.

```typescript
const reverseDeps = await getReverseDependencies('./src/utils.ts', './src')
console.log('Files depending on utils.ts:', reverseDeps)
```

#### `findUnusedExports(projectDir: string): Promise<Map<string, Set<string>>>`
Find unused exports in your project.

```typescript
const unusedExports = await findUnusedExports('./src')
for (const [file, unused] of unusedExports) {
  console.log(`${file} has unused exports:`, Array.from(unused))
}
```

## 🛠️ Utility Functions

### Cache Management
```typescript
import { clearCache, getCacheStats } from 'esfinder'

// Get cache statistics
const stats = getCacheStats()
console.log('Cache stats:', stats)

// Clear all caches
clearCache()
```

### Path Resolution
```typescript
import { DEFAULT_EXTENSIONS, resolveImportPath } from 'esfinder'

const resolved = resolveImportPath('./utils', '/src/components', DEFAULT_EXTENSIONS)
```

## 📖 Usage Examples

### Test File Discovery
Find which test files need to run when source files change:

```typescript
import { getRelatedFiles, parseExports } from 'esfinder'

async function findTestsToRun(changedFiles: string[]) {
  // Pre-cache exports
  await Promise.all(changedFiles.map(file => parseExports(file)))

  // Find related test files
  const testFiles = await getRelatedFiles(changedFiles, './src/__tests__')
  return testFiles
}
```

### Project Health Check
Analyze your project for potential issues:

```typescript
import { findCircularDependencies, findUnusedExports } from 'esfinder'

async function healthCheck(projectDir: string) {
  const [cycles, unusedExports] = await Promise.all([
    findCircularDependencies(projectDir),
    findUnusedExports(projectDir)
  ])

  console.log(`Found ${cycles.length} circular dependencies`)
  console.log(`Found ${unusedExports.size} files with unused exports`)
}
```

### Refactoring Impact Analysis
Understand the impact of code changes:

```typescript
import { getAllDependencies, getReverseDependencies } from 'esfinder'

async function analyzeRefactorImpact(targetFile: string, projectDir: string) {
  const [affectedFiles, dependencies] = await Promise.all([
    getReverseDependencies(targetFile, projectDir),
    getAllDependencies(targetFile)
  ])

  return { affectedFiles, dependencies: Array.from(dependencies) }
}
```

## ⚡ Performance Tips

1. **Choose the right parser** for your use case
2. **Use caching** effectively - ESFinder automatically caches results
3. **Batch operations** instead of processing files individually
4. **Limit scope** by specifying file extensions
5. **Monitor cache** usage in long-running processes

## 📊 Performance Comparison

| Parser | Speed | Memory | Features | Best For |
|--------|-------|--------|----------|----------|
| Babel  | Slow  | High   | Complete | Production |
| SWC    | Fast  | Medium | Good     | Development |
| OXC    | Fastest | Low  | Basic    | CI/CD |

## 🔧 Configuration

ESFinder works with zero configuration, but you can customize:

```typescript
// Custom file extensions
const relatedFiles = await getRelatedFiles(
  files,
  searchDir,
  ['.vue', '.svelte', '.ts'] // custom extensions
)

// Custom project structure
const graph = await buildDependencyGraph('./src', ['.ts', '.tsx'])
```

## 🖥️ CLI Usage

ESFinder comes with a powerful CLI tool:

```bash
# Install globally
npm install -g esfinder

# Or use with npx
npx esfinder <command>
```

### Commands

#### `exports` - Parse exports from a file

```bash
esfinder exports <file> [options]

# Options:
#   -p, --parser <parser>  Parser to use (babel|swc|oxc) (default: "babel")

# Examples:
esfinder exports src/utils.ts
esfinder exports src/utils.ts --parser swc
esfinder exports src/utils.ts -p oxc
```

#### `related` - Find files related to given files

```bash
esfinder related <files...> [options]

# Options:
#   -d, --dir <dir>        Directory to search in (default: "./src")
#   -p, --parser <parser>  Parser to use (babel|swc|oxc) (default: "babel")

# Examples:
esfinder related src/utils.ts --dir src/components
esfinder related src/utils.ts src/config.ts -d ./src
esfinder related src/api.ts --parser swc
```

#### `check` - Run health checks on a project

```bash
esfinder check <dir>

# Examples:
esfinder check ./src
esfinder check .
```

This command will:
- Check for circular dependencies
- Find unused exports
- Display project statistics (total files, average imports/exports per file)

#### `graph` - Build and display dependency graph

```bash
esfinder graph <dir> [options]

# Options:
#   -f, --format <format>  Output format (json|text) (default: "text")

# Examples:
esfinder graph ./src
esfinder graph ./src --format json
esfinder graph ./src -f json > graph.json
```

#### `cache` - Manage cache

```bash
esfinder cache [options]

# Options:
#   -c, --clear  Clear all caches
#   -s, --stats  Show cache statistics

# Examples:
esfinder cache --stats
esfinder cache --clear
esfinder cache -s
```

## 📚 Documentation

- [API Documentation](./docs/API.md) - Complete API reference
- [Usage Guide](./docs/GUIDE.md) - Detailed usage examples and best practices
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute to the project

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./CONTRIBUTING.md) and [Code of Conduct](./CODE_OF_CONDUCT.md).

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Sunny-117/esfinder.git

# Install dependencies
pnpm install

# Run tests
pnpm test

# Build the project
pnpm build
```

## 📄 License

[MIT](./LICENSE) License © [Sunny-117](https://github.com/Sunny-117)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/esfinder?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/esfinder
[npm-downloads-src]: https://img.shields.io/npm/dm/esfinder?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/esfinder
[bundle-src]: https://img.shields.io/bundlephobia/minzip/esfinder?style=flat&colorA=080f12&colorB=1fa669&label=minzip
[bundle-href]: https://bundlephobia.com/result?p=esfinder
[license-src]: https://img.shields.io/github/license/Sunny-117/esfinder.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/Sunny-117/esfinder/blob/main/LICENSE
[jsdocs-src]: https://img.shields.io/badge/jsdocs-reference-080f12?style=flat&colorA=080f12&colorB=1fa669
[jsdocs-href]: https://www.jsdocs.io/package/esfinder
