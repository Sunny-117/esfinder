# ESFinder API Documentation

ESFinder 是一个基于多种解析器（Babel、SWC、OXC）的 JavaScript/TypeScript 项目依赖分析工具。

## 安装

```bash
npm install esfinder
```

## 基础用法

```typescript
import { getRelatedFiles, parseExports } from 'esfinder' // Babel 解析器
// 或者
import { getRelatedFiles, parseExports } from 'esfinder/oxc' // OXC 解析器
// 或者
import { getRelatedFiles, parseExports } from 'esfinder/swc' // SWC 解析器
```

## 解析器对比

| 特性 | Babel | SWC | OXC |
|------|-------|-----|-----|
| 解析速度 | 慢 | 快 | 最快 |
| 功能完整性 | 最完整 | 完整 | 基础 |
| 内存占用 | 高 | 中 | 低 |
| 插件支持 | 丰富 | 有限 | 无 |

## 核心 API

### parseExports(filePath: string): Promise<Set<string>>

解析文件的所有导出内容。

**参数:**
- `filePath` (string): 要解析的文件路径（绝对或相对路径）

**返回值:**
- `Promise<Set<string>>`: 包含所有导出名称的 Set

**示例:**
```typescript
const exports = await parseExports('./src/utils.ts')
console.log(exports) // Set { 'formatDate', 'parseUrl', 'default' }
```

### parseImports(filePath: string): Promise<Set<string>>

解析文件的所有导入内容。

**参数:**
- `filePath` (string): 要解析的文件路径

**返回值:**
- `Promise<Set<string>>`: 包含所有导入文件路径的 Set

**示例:**
```typescript
const imports = await parseImports('./src/app.ts')
console.log(imports) // Set { '/path/to/utils.ts', '/path/to/config.ts' }
```

### getRelatedFiles(files: string[], importsDir: string, extensions?: string[]): Promise<string[]>

查找与指定文件相关的所有文件。

**参数:**
- `files` (string[]): 目标文件路径数组
- `importsDir` (string): 要搜索的目录
- `extensions` (string[], 可选): 支持的文件扩展名，默认为 `['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.vue']`

**返回值:**
- `Promise<string[]>`: 相关文件的路径数组

**示例:**
```typescript
const files = ['./src/utils.ts', './src/config.ts']
const relatedFiles = await getRelatedFiles(files, './src/components')
console.log(relatedFiles) // ['/path/to/components/Button.tsx', '/path/to/components/Modal.tsx']
```

## 高级 API

### buildDependencyGraph(projectDir: string, extensions?: string[]): Promise<Map<string, {imports: Set<string>, exports: Set<string>}>>

构建整个项目的依赖图。

**参数:**
- `projectDir` (string): 项目根目录
- `extensions` (string[], 可选): 支持的文件扩展名

**返回值:**
- `Promise<Map<string, {imports: Set<string>, exports: Set<string>}>>`: 依赖图

**示例:**
```typescript
const graph = await buildDependencyGraph('./src')
for (const [file, { imports, exports }] of graph) {
  console.log(`${file} imports:`, imports)
  console.log(`${file} exports:`, exports)
}
```

### findCircularDependencies(projectDir: string): Promise<string[][]>

查找项目中的循环依赖。

**参数:**
- `projectDir` (string): 项目根目录

**返回值:**
- `Promise<string[][]>`: 循环依赖路径的数组

**示例:**
```typescript
const cycles = await findCircularDependencies('./src')
cycles.forEach((cycle, index) => {
  console.log(`Circular dependency ${index + 1}:`, cycle.join(' -> '))
})
```

### getAllDependencies(filePath: string, visited?: Set<string>): Promise<Set<string>>

获取文件的所有依赖（递归）。

**参数:**
- `filePath` (string): 文件路径
- `visited` (Set<string>, 可选): 已访问的文件集合（用于避免循环依赖）

**返回值:**
- `Promise<Set<string>>`: 所有依赖文件的路径集合

**示例:**
```typescript
const allDeps = await getAllDependencies('./src/app.ts')
console.log('All dependencies:', Array.from(allDeps))
```

### getReverseDependencies(targetFile: string, projectDir: string): Promise<string[]>

获取依赖于指定文件的所有文件（反向依赖）。

**参数:**
- `targetFile` (string): 目标文件路径
- `projectDir` (string): 项目目录

**返回值:**
- `Promise<string[]>`: 依赖于目标文件的文件路径数组

**示例:**
```typescript
const reverseDeps = await getReverseDependencies('./src/utils.ts', './src')
console.log('Files that depend on utils.ts:', reverseDeps)
```

### findUnusedExports(projectDir: string): Promise<Map<string, Set<string>>>

分析项目中未使用的导出。

**参数:**
- `projectDir` (string): 项目目录

**返回值:**
- `Promise<Map<string, Set<string>>>`: 未使用的导出信息

**示例:**
```typescript
const unusedExports = await findUnusedExports('./src')
for (const [file, unused] of unusedExports) {
  console.log(`${file} has unused exports:`, Array.from(unused))
}
```

## 工具函数

### resolveImportPath(importSource: string, baseDir: string, extensions?: string[]): string | null

解析导入路径为绝对路径。

**参数:**
- `importSource` (string): 导入源路径
- `baseDir` (string): 基础目录
- `extensions` (string[], 可选): 支持的扩展名

**返回值:**
- `string | null`: 解析后的绝对路径，如果无法解析则返回 null

### clearCache(): void

清除所有缓存。

**示例:**
```typescript
clearCache()
```

### getCacheStats(): object

获取缓存统计信息。

**返回值:**
```typescript
{
  exportsCache: number
  importsCache: number
  pathResolutionCache: number
  dependencyGraph: number
}
```

## 常量

### DEFAULT_EXTENSIONS

默认支持的文件扩展名数组：
```typescript
['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.vue']
```

## 使用示例

### 基础依赖分析

```typescript
import path from 'node:path'
import { getRelatedFiles, parseExports } from 'esfinder'

async function analyzeProject() {
  const files = ['./src/utils.ts', './src/config.ts']
  const testsDir = './src/__tests__'

  // 预缓存目标文件的导出内容
  await Promise.all(files.map(f => parseExports(path.resolve(f))))

  // 查找相关的测试文件
  const relatedTests = await getRelatedFiles(files, testsDir)
  console.log('Related test files:', relatedTests)
}
```

### 项目健康检查

```typescript
import { findCircularDependencies, findUnusedExports } from 'esfinder'

async function healthCheck(projectDir: string) {
  // 检查循环依赖
  const cycles = await findCircularDependencies(projectDir)
  if (cycles.length > 0) {
    console.warn('Found circular dependencies:')
    cycles.forEach(cycle => console.log(cycle.join(' -> ')))
  }

  // 检查未使用的导出
  const unusedExports = await findUnusedExports(projectDir)
  if (unusedExports.size > 0) {
    console.warn('Found unused exports:')
    for (const [file, unused] of unusedExports) {
      console.log(`${file}: ${Array.from(unused).join(', ')}`)
    }
  }
}
```

### 性能优化建议

1. **使用缓存**: 对于重复分析的文件，ESFinder 会自动缓存结果
2. **选择合适的解析器**:
   - 开发环境推荐使用 OXC（最快）
   - 生产环境推荐使用 Babel（最稳定）
   - 平衡选择 SWC
3. **批量操作**: 尽量批量处理文件而不是逐个处理
4. **定期清理缓存**: 在长时间运行的进程中定期调用 `clearCache()`

## 错误处理

ESFinder 会优雅地处理解析错误，对于无法解析的文件会输出警告并跳过。建议在生产环境中添加适当的错误处理：

```typescript
try {
  const exports = await parseExports(filePath)
  // 处理结果
}
catch (error) {
  console.error(`Failed to parse ${filePath}:`, error.message)
  // 降级处理或跳过
}
```
