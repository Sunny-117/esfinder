import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parse as babelParse } from '@babel/parser'
import traverseModule from '@babel/traverse'
import { globby } from 'globby'

// Handle both CommonJS and ES module exports
const traverse = (traverseModule as any).default || traverseModule

// 缓存导出内容 { [filePath]: Set<exportName> }
const exportsCache = new Map<string, Set<string>>()

// 导入关系缓存 { [filePath]: Set<importedFilePath> }
const importsCache = new Map<string, Set<string>>()

// 依赖图缓存 { [filePath]: { imports: Set<string>, exports: Set<string> } }
const dependencyGraph = new Map<string, { imports: Set<string>, exports: Set<string> }>()

/**
 * 使用 Babel 解析文件的导出内容
 * @param filePath 文件路径
 * @returns 导出名称的集合
 */
async function parseExports(filePath: string): Promise<Set<string>> {
  // 解析文件路径，支持不带扩展名的文件
  const resolvedPath = await resolveFilePath(filePath)
  if (!resolvedPath) {
    throw new Error(`Could not resolve file path: ${filePath}`)
  }

  if (exportsCache.has(resolvedPath)) {
    return exportsCache.get(resolvedPath)!
  }

  const code = await fs.readFile(resolvedPath, 'utf-8')
  const ast = babelParse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'decorators-legacy'],
  })

  const exports = new Set<string>()

  traverse(ast as any, {
    ExportNamedDeclaration({ node }: any) {
      // 处理 export const a = 1 或 export function b() {}
      if (node.declaration) {
        if (node.declaration.declarations) {
          node.declaration.declarations.forEach((d: any) => {
            if (d.id?.type === 'Identifier') {
              exports.add(d.id.name)
            }
          })
        }
        else if (node.declaration.id) {
          exports.add(node.declaration.id.name)
        }
      }
      // 处理 export { a, b as c }
      if (node.specifiers) {
        node.specifiers.forEach((s: any) => {
          if (s.exported?.name) {
            exports.add(s.exported.name)
          }
        })
      }
    },
    ExportDefaultDeclaration() {
      exports.add('default')
    },
    ExportAllDeclaration() {
      // 处理 export * from './module'
      // 这里可以进一步解析被导出的模块
    },
  })

  exportsCache.set(resolvedPath, exports)
  return exports
}

/**
 * 解析文件的导入内容
 * @param filePath 文件路径
 * @returns 导入的文件路径集合
 */
async function parseImports(filePath: string): Promise<Set<string>> {
  // 解析文件路径，支持不带扩展名的文件
  const resolvedPath = await resolveFilePath(filePath)
  if (!resolvedPath) {
    throw new Error(`Could not resolve file path: ${filePath}`)
  }

  if (importsCache.has(resolvedPath)) {
    return importsCache.get(resolvedPath)!
  }

  const code = await fs.readFile(resolvedPath, 'utf-8')
  const ast = babelParse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript', 'decorators-legacy'],
  })

  const imports = new Set<string>()
  const baseDir = path.dirname(resolvedPath)

  traverse(ast as any, {
    ImportDeclaration({ node }: any) {
      if (node.source?.value) {
        const importPath = resolveImportPath(node.source.value, baseDir)
        if (importPath) {
          imports.add(importPath)
        }
      }
    },
    CallExpression({ node }: any) {
      // 处理动态 import()
      if (node.callee.type === 'Import' && node.arguments?.[0]?.value) {
        const importPath = resolveImportPath(node.arguments[0].value, baseDir)
        if (importPath) {
          imports.add(importPath)
        }
      }
    },
  })

  importsCache.set(resolvedPath, imports)
  return imports
}
// 默认支持的后缀列表
const DEFAULT_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.vue']

// 路径解析缓存
const pathResolutionCache = new Map<string, string>()

/**
 * 解析导入路径为绝对路径
 * @param importSource 导入源路径
 * @param baseDir 基础目录
 * @param extensions 支持的扩展名
 * @returns 解析后的绝对路径，如果无法解析则返回null
 */
function resolveImportPath(
  importSource: string,
  baseDir: string,
  extensions: string[] = DEFAULT_EXTENSIONS,
): string | null {
  // 跳过 node_modules 包
  if (!importSource.startsWith('.') && !path.isAbsolute(importSource)) {
    return null
  }

  const cacheKey = `${baseDir}:${importSource}`
  if (pathResolutionCache.has(cacheKey)) {
    return pathResolutionCache.get(cacheKey)!
  }

  const tryPaths = [path.resolve(baseDir, importSource)]

  // 如果路径没有后缀，尝试添加所有可能的后缀
  if (!path.extname(importSource)) {
    extensions.forEach((ext) => {
      tryPaths.push(path.resolve(baseDir, `${importSource}${ext}`))
    })
    // 尝试 index 文件
    extensions.forEach((ext) => {
      tryPaths.push(path.resolve(baseDir, importSource, `index${ext}`))
    })
  }

  // 检查文件是否存在
  for (const tryPath of tryPaths) {
    try {
      const { existsSync } = eval('require')('node:fs')
      if (existsSync(tryPath)) {
        pathResolutionCache.set(cacheKey, tryPath)
        return tryPath
      }
    }
    catch {
      // 忽略错误
    }
  }

  return null
}

/**
 * 解析文件路径，支持不带扩展名的文件
 * @param filePath 文件路径
 * @param extensions 支持的扩展名
 * @returns 解析后的绝对路径，如果无法解析则返回null
 */
async function resolveFilePath(
  filePath: string,
  extensions: string[] = DEFAULT_EXTENSIONS,
): Promise<string | null> {
  const absolutePath = path.resolve(filePath)

  // 如果文件已经有扩展名，直接检查是否存在
  if (path.extname(filePath)) {
    try {
      await fs.access(absolutePath)
      return absolutePath
    }
    catch {
      // 文件不存在
    }
    return null
  }

  // 如果没有扩展名，尝试添加各种扩展名
  const tryPaths = [absolutePath]
  extensions.forEach((ext) => {
    tryPaths.push(`${absolutePath}${ext}`)
  })

  // 尝试 index 文件
  extensions.forEach((ext) => {
    tryPaths.push(path.join(absolutePath, `index${ext}`))
  })

  for (const tryPath of tryPaths) {
    try {
      await fs.access(tryPath)
      return tryPath
    }
    catch {
      // 文件不存在，继续尝试下一个
    }
  }

  return null
}

async function getRelatedFiles(
  files: string[],
  importsDir: string,
  extensions: string[] = DEFAULT_EXTENSIONS,
): Promise<string[]> {
  // 将输入文件转为绝对路径，支持不带后缀的文件
  const targetFiles = new Set<string>()

  for (const f of files) {
    const resolvedPath = await resolveFilePath(f, extensions)
    if (resolvedPath) {
      targetFiles.add(resolvedPath)
      // 缓存原始路径和所有可能的后缀组合
      extensions.forEach((ext) => {
        pathResolutionCache.set(resolvedPath + ext, resolvedPath)
      })
    }
    else {
      console.warn(`Warning: Could not resolve file path: ${f}`)
    }
  }

  // 获取所有测试文件绝对路径
  const testFiles = await globby([`${importsDir}/**/*.{js,ts,jsx,tsx}`], {
    absolute: true,
    expandDirectories: false,
  })

  const results = new Set<string>()

  for (const testFile of testFiles) {
    const code = await fs.readFile(testFile, 'utf-8')
    const ast = babelParse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    })

    let isRelated = false

    traverse(ast as any, {
      ImportDeclaration({ node }: any) {
        if (isRelated)
          return

        const importSource = node.source.value
        const baseDir = path.dirname(testFile)

        // 新增：带后缀的智能解析
        const tryPaths = [
          path.resolve(baseDir, importSource), // 原始路径
        ]

        // 如果路径没有后缀，尝试添加所有可能的后缀
        if (!path.extname(importSource)) {
          extensions.forEach((ext) => {
            tryPaths.push(path.resolve(baseDir, `${importSource}${ext}`))
          })
        }

        // 检查所有可能的路径
        for (const tryPath of tryPaths) {
          // 优先检查缓存映射
          const resolvedPath = pathResolutionCache.get(tryPath) || tryPath

          if (targetFiles.has(resolvedPath)) {
            isRelated = true
            return
          }

          // 检查具名引用（需要对应路径的导出缓存）
          if (exportsCache.has(resolvedPath)) {
            const exports = exportsCache.get(resolvedPath)!
            for (const specifier of node.specifiers) {
              if (specifier.type === 'ImportSpecifier'
                && exports.has(specifier.imported.name)) {
                isRelated = true
                return
              }
            }
          }
        }
      },
      // 处理动态 import()
      CallExpression({ node }: any) {
        if (isRelated)
          return

        // 检查是否是动态的 import()
        if (node.callee.type === 'Import') {
          const importSource = node.arguments[0].value // 获取动态 import 的路径
          const baseDir = path.dirname(testFile)

          const tryPaths = [
            path.resolve(baseDir, importSource), // 原始路径
          ]

          if (!path.extname(importSource)) {
            extensions.forEach((ext) => {
              tryPaths.push(path.resolve(baseDir, `${importSource}${ext}`))
            })
          }

          // 检查所有可能的路径
          for (const tryPath of tryPaths) {
            // 优先检查缓存映射
            const resolvedPath = pathResolutionCache.get(tryPath) || tryPath

            if (targetFiles.has(resolvedPath)) {
              isRelated = true
              return
            }

            // 检查具名引用（需要对应路径的导出缓存）
            if (exportsCache.has(resolvedPath)) {
              isRelated = true
              return
            }
          }
        }
      },
    })

    if (isRelated)
      results.add(testFile)
  }

  return Array.from(results)
}

/**
 * 构建项目的依赖图
 * @param projectDir 项目目录
 * @param extensions 支持的文件扩展名
 * @returns 依赖图对象
 */
async function buildDependencyGraph(
  projectDir: string,
  extensions: string[] = DEFAULT_EXTENSIONS,
): Promise<Map<string, { imports: Set<string>, exports: Set<string> }>> {
  const files = await globby([`${projectDir}/**/*.{js,ts,jsx,tsx,vue}`], {
    absolute: true,
    expandDirectories: false,
  })

  const graph = new Map<string, { imports: Set<string>, exports: Set<string> }>()

  for (const file of files) {
    try {
      const [imports, exports] = await Promise.all([
        parseImports(file),
        parseExports(file),
      ])
      graph.set(file, { imports, exports })
    }
    catch (error) {
      console.warn(`Failed to parse ${file}:`, error)
    }
  }

  return graph
}

/**
 * 查找循环依赖
 * @param projectDir 项目目录
 * @returns 循环依赖的文件路径数组
 */
async function findCircularDependencies(projectDir: string): Promise<string[][]> {
  const graph = await buildDependencyGraph(projectDir)
  const visited = new Set<string>()
  const recursionStack = new Set<string>()
  const cycles: string[][] = []

  function dfs(file: string, path: string[]): void {
    if (recursionStack.has(file)) {
      // 找到循环依赖
      const cycleStart = path.indexOf(file)
      cycles.push(path.slice(cycleStart).concat(file))
      return
    }

    if (visited.has(file))
      return

    visited.add(file)
    recursionStack.add(file)

    const node = graph.get(file)
    if (node) {
      for (const importedFile of node.imports) {
        dfs(importedFile, [...path, file])
      }
    }

    recursionStack.delete(file)
  }

  for (const file of graph.keys()) {
    if (!visited.has(file)) {
      dfs(file, [])
    }
  }

  return cycles
}

/**
 * 获取文件的所有依赖（递归）
 * @param filePath 文件路径
 * @param visited 已访问的文件集合（用于避免循环依赖）
 * @returns 所有依赖文件的路径集合
 */
async function getAllDependencies(
  filePath: string,
  visited: Set<string> = new Set(),
): Promise<Set<string>> {
  if (visited.has(filePath)) {
    return new Set()
  }

  visited.add(filePath)
  const dependencies = new Set<string>()

  try {
    const imports = await parseImports(filePath)

    for (const importPath of imports) {
      dependencies.add(importPath)
      const subDependencies = await getAllDependencies(importPath, visited)
      subDependencies.forEach(dep => dependencies.add(dep))
    }
  }
  catch (error) {
    console.warn(`Failed to get dependencies for ${filePath}:`, error)
  }

  visited.delete(filePath)
  return dependencies
}

/**
 * 获取依赖于指定文件的所有文件（反向依赖）
 * @param targetFile 目标文件路径
 * @param projectDir 项目目录
 * @returns 依赖于目标文件的文件路径数组
 */
async function getReverseDependencies(
  targetFile: string,
  projectDir: string,
): Promise<string[]> {
  const graph = await buildDependencyGraph(projectDir)
  const reverseDeps: string[] = []
  const targetPath = path.resolve(targetFile)

  for (const [file, { imports }] of graph) {
    if (imports.has(targetPath)) {
      reverseDeps.push(file)
    }
  }

  return reverseDeps
}

/**
 * 分析未使用的导出
 * @param projectDir 项目目录
 * @returns 未使用的导出信息
 */
async function findUnusedExports(projectDir: string): Promise<Map<string, Set<string>>> {
  const graph = await buildDependencyGraph(projectDir)
  const unusedExports = new Map<string, Set<string>>()

  // 收集所有被导入的符号
  const usedExports = new Map<string, Set<string>>()

  for (const [_file, { imports }] of graph) {
    for (const importPath of imports) {
      // 这里需要更详细的分析来确定具体导入了哪些符号
      // 暂时标记整个文件为被使用
      if (!usedExports.has(importPath)) {
        usedExports.set(importPath, new Set())
      }
    }
  }

  // 找出未被使用的导出
  for (const [file, { exports }] of graph) {
    const used = usedExports.get(file) || new Set()
    const unused = new Set<string>()

    for (const exportName of exports) {
      if (!used.has(exportName) && exportName !== 'default') {
        unused.add(exportName)
      }
    }

    if (unused.size > 0) {
      unusedExports.set(file, unused)
    }
  }

  return unusedExports
}

/**
 * 清除所有缓存
 */
function clearCache(): void {
  exportsCache.clear()
  importsCache.clear()
  pathResolutionCache.clear()
  dependencyGraph.clear()
}

/**
 * 获取缓存统计信息
 */
function getCacheStats(): {
  exportsCache: number
  importsCache: number
  pathResolutionCache: number
  dependencyGraph: number
} {
  return {
    exportsCache: exportsCache.size,
    importsCache: importsCache.size,
    pathResolutionCache: pathResolutionCache.size,
    dependencyGraph: dependencyGraph.size,
  }
}

export {
  // 高级API
  buildDependencyGraph,
  // 工具函数
  clearCache,
  // 常量
  DEFAULT_EXTENSIONS,

  findCircularDependencies,
  findUnusedExports,
  getAllDependencies,
  getCacheStats,
  getRelatedFiles,

  getReverseDependencies,
  // 基础API
  parseExports,
  parseImports,
  resolveFilePath,

  resolveImportPath,
}
