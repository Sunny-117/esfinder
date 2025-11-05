# ESFinder 使用指南

## 快速开始

### 1. 安装

```bash
npm install esfinder
```

### 2. 基础使用

```typescript
import { getRelatedFiles, parseExports } from 'esfinder'

// 分析单个文件的导出
const exports = await parseExports('./src/utils.ts')
console.log('Exports:', Array.from(exports))

// 查找相关文件
const relatedFiles = await getRelatedFiles(['./src/utils.ts'], './src/components')
console.log('Related files:', relatedFiles)
```

## 使用场景

### 1. 测试文件自动发现

当你修改了某个模块，想知道哪些测试文件需要重新运行：

```typescript
import path from 'node:path'
import { getRelatedFiles, parseExports } from 'esfinder'

async function findTestsToRun(changedFiles: string[]) {
  // 预缓存导出信息
  await Promise.all(
    changedFiles.map(file => parseExports(path.resolve(file)))
  )

  // 查找相关的测试文件
  const testFiles = await getRelatedFiles(changedFiles, './src/__tests__')

  console.log('需要运行的测试文件:', testFiles)
  return testFiles
}

// 使用示例
findTestsToRun(['./src/utils.ts', './src/api.ts'])
```

### 2. 代码重构影响分析

在重构代码前，了解哪些文件会受到影响：

```typescript
import { getAllDependencies, getReverseDependencies } from 'esfinder'

async function analyzeRefactorImpact(targetFile: string, projectDir: string) {
  // 找出所有依赖于目标文件的文件
  const affectedFiles = await getReverseDependencies(targetFile, projectDir)

  // 找出目标文件的所有依赖
  const dependencies = await getAllDependencies(targetFile)

  console.log('受影响的文件:', affectedFiles)
  console.log('依赖的文件:', Array.from(dependencies))

  return { affectedFiles, dependencies }
}
```

### 3. 项目健康检查

定期检查项目的代码质量：

```typescript
import {
  buildDependencyGraph,
  findCircularDependencies,
  findUnusedExports
} from 'esfinder'

async function projectHealthCheck(projectDir: string) {
  console.log('🔍 开始项目健康检查...')

  // 1. 检查循环依赖
  console.log('检查循环依赖...')
  const cycles = await findCircularDependencies(projectDir)
  if (cycles.length > 0) {
    console.warn(`❌ 发现 ${cycles.length} 个循环依赖:`)
    cycles.forEach((cycle, index) => {
      console.log(`  ${index + 1}. ${cycle.join(' → ')}`)
    })
  }
  else {
    console.log('✅ 未发现循环依赖')
  }

  // 2. 检查未使用的导出
  console.log('检查未使用的导出...')
  const unusedExports = await findUnusedExports(projectDir)
  if (unusedExports.size > 0) {
    console.warn(`❌ 发现 ${unusedExports.size} 个文件有未使用的导出:`)
    for (const [file, unused] of unusedExports) {
      console.log(`  ${file}: ${Array.from(unused).join(', ')}`)
    }
  }
  else {
    console.log('✅ 未发现未使用的导出')
  }

  // 3. 生成依赖统计
  console.log('生成依赖统计...')
  const graph = await buildDependencyGraph(projectDir)
  const stats = {
    totalFiles: graph.size,
    avgImports: Array.from(graph.values()).reduce((sum, { imports }) => sum + imports.size, 0) / graph.size,
    avgExports: Array.from(graph.values()).reduce((sum, { exports }) => sum + exports.size, 0) / graph.size,
  }

  console.log('📊 项目统计:')
  console.log(`  总文件数: ${stats.totalFiles}`)
  console.log(`  平均导入数: ${stats.avgImports.toFixed(2)}`)
  console.log(`  平均导出数: ${stats.avgExports.toFixed(2)}`)
}

// 运行健康检查
projectHealthCheck('./src')
```

### 4. 构建优化

分析模块依赖关系来优化打包：

```typescript
import { buildDependencyGraph } from 'esfinder'

async function analyzeBundleOptimization(projectDir: string) {
  const graph = await buildDependencyGraph(projectDir)

  // 找出被大量导入的模块（可能适合作为公共模块）
  const importCounts = new Map<string, number>()

  for (const [file, { imports }] of graph) {
    for (const importedFile of imports) {
      importCounts.set(importedFile, (importCounts.get(importedFile) || 0) + 1)
    }
  }

  // 按导入次数排序
  const popularModules = Array.from(importCounts.entries())
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)

  console.log('最受欢迎的模块 (适合作为公共模块):')
  popularModules.forEach(([file, count]) => {
    console.log(`  ${file}: 被导入 ${count} 次`)
  })

  return popularModules
}
```

## 解析器选择指南

### Babel 解析器 (默认)

```typescript
import { parseExports } from 'esfinder'
```

**优点:**
- 功能最完整，支持最新的 JavaScript/TypeScript 语法
- 插件生态丰富
- 解析结果最准确

**缺点:**
- 解析速度较慢
- 内存占用较高

**适用场景:**
- 生产环境的代码分析
- 需要处理复杂语法的项目
- 对准确性要求很高的场景

### SWC 解析器

```typescript
import { parseExports } from 'esfinder/swc'
```

**优点:**
- 解析速度快
- 内存占用适中
- 支持大部分现代语法

**缺点:**
- 某些边缘语法可能不支持
- 插件生态有限

**适用场景:**
- 开发环境的快速分析
- 中大型项目的日常分析
- 性能敏感的场景

### OXC 解析器

```typescript
import { parseExports } from 'esfinder/oxc'
```

**优点:**
- 解析速度最快
- 内存占用最低
- 基于 Rust，性能优异

**缺点:**
- 功能相对基础
- 可能不支持某些高级语法

**适用场景:**
- 大型项目的快速扫描
- CI/CD 环境的性能优化
- 基础依赖分析

## 性能优化技巧

### 1. 合理使用缓存

```typescript
import { clearCache, getCacheStats, parseExports } from 'esfinder'

// 在长时间运行的进程中，定期清理缓存
setInterval(() => {
  const stats = getCacheStats()
  if (stats.exportsCache > 1000) {
    console.log('清理缓存...')
    clearCache()
  }
}, 60000) // 每分钟检查一次
```

### 2. 批量处理

```typescript
// ❌ 不推荐：逐个处理
for (const file of files) {
  await parseExports(file)
}

// ✅ 推荐：批量处理
await Promise.all(files.map(file => parseExports(file)))
```

### 3. 限制扫描范围

```typescript
// 只扫描特定类型的文件
const relatedFiles = await getRelatedFiles(
  targetFiles,
  searchDir,
  ['.ts', '.tsx'] // 只扫描 TypeScript 文件
)
```

### 4. 使用合适的解析器

```typescript
// 根据场景选择解析器
const parser = process.env.NODE_ENV === 'production' ? 'babel' : 'oxc'

let parseExports
switch (parser) {
  case 'babel':
    parseExports = (await import('esfinder')).parseExports
    break
  case 'swc':
    parseExports = (await import('esfinder/swc')).parseExports
    break
  case 'oxc':
    parseExports = (await import('esfinder/oxc')).parseExports
    break
}
```

## 集成到构建工具

### Webpack 插件示例

```typescript
class ESFinderPlugin {
  apply(compiler) {
    compiler.hooks.watchRun.tapAsync('ESFinderPlugin', async (compilation, callback) => {
      const changedFiles = Array.from(compilation.modifiedFiles || [])

      if (changedFiles.length > 0) {
        const { getRelatedFiles } = await import('esfinder')
        const testFiles = await getRelatedFiles(changedFiles, './src/__tests__')

        console.log('需要重新运行的测试:', testFiles)
      }

      callback()
    })
  }
}
```

### Vite 插件示例

```typescript
import { getRelatedFiles } from 'esfinder'

function esfinderPlugin() {
  return {
    name: 'esfinder',
    handleHotUpdate(ctx) {
      const { file } = ctx

      // 当文件变化时，分析相关文件
      getRelatedFiles([file], './src').then((relatedFiles) => {
        console.log('相关文件:', relatedFiles)
      })
    }
  }
}
```

## 命令行工具

创建一个简单的 CLI 工具：

```typescript
#!/usr/bin/env node
import { program } from 'commander'
import {
  findCircularDependencies,
  findUnusedExports,
  getRelatedFiles
} from 'esfinder'

program
  .command('check <dir>')
  .description('检查项目健康状况')
  .action(async (dir) => {
    console.log(`检查目录: ${dir}`)

    const cycles = await findCircularDependencies(dir)
    const unused = await findUnusedExports(dir)

    console.log(`循环依赖: ${cycles.length}`)
    console.log(`未使用导出: ${unused.size}`)
  })

program
  .command('related <files...>')
  .option('-d, --dir <dir>', '搜索目录', './src')
  .description('查找相关文件')
  .action(async (files, options) => {
    const related = await getRelatedFiles(files, options.dir)
    console.log('相关文件:')
    related.forEach(file => console.log(`  ${file}`))
  })

program.parse()
```

## 最佳实践

1. **选择合适的解析器**: 根据项目大小和性能要求选择
2. **合理使用缓存**: 在长时间运行的进程中管理缓存
3. **批量处理**: 避免逐个处理文件
4. **错误处理**: 优雅处理解析失败的文件
5. **定期检查**: 将健康检查集成到 CI/CD 流程中
6. **监控性能**: 在大型项目中监控解析性能

## 故障排除

### 常见问题

1. **解析失败**: 检查文件语法是否正确
2. **路径解析错误**: 确保使用正确的相对路径或绝对路径
3. **性能问题**: 考虑使用更快的解析器或限制扫描范围
4. **内存占用过高**: 定期清理缓存

### 调试技巧

```typescript
import { getCacheStats } from 'esfinder'

// 监控缓存使用情况
setInterval(() => {
  const stats = getCacheStats()
  console.log('缓存统计:', stats)
}, 10000)
```
