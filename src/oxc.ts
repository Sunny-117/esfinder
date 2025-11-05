import { promises as fs } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { globby } from 'globby'

// Check Node.js version for OXC compatibility
function checkNodeVersion(): void {
  const nodeVersion = process.version
  const majorVersion = Number.parseInt(nodeVersion.slice(1).split('.')[0])
  const minorVersion = Number.parseInt(nodeVersion.slice(1).split('.')[1])
  const patchVersion = Number.parseInt(nodeVersion.slice(1).split('.')[2])

  // Require Node.js >= 20.19.4
  if (majorVersion < 20 || (majorVersion === 20 && (minorVersion < 19 || (minorVersion === 19 && patchVersion < 4)))) {
    throw new Error(
      `OXC parser requires Node.js >= 20.19.4, but you are using ${nodeVersion}. `
      + `Please upgrade Node.js or use 'esfinder' (Babel) or 'esfinder/swc' instead.`,
    )
  }
}

// Lazy import OXC parser with version check
let parseSync: any = null
async function getOxcParser() {
  if (!parseSync) {
    try {
      checkNodeVersion()
      const oxcModule = await import('oxc-parser')
      parseSync = oxcModule.parseSync
    }
    catch (error) {
      if ((error as Error).message.includes('Cannot find native binding') || (error as Error).message.includes('Cannot find module')) {
        throw new Error(
          `OXC parser is not available on this platform (${process.platform}-${process.arch}). `
          + `Please use 'esfinder' (Babel) or 'esfinder/swc' instead.`,
        )
      }
      throw error
    }
  }
  return parseSync
}

// 缓存导出内容 { [filePath]: Set<exportName> }
const exportsCache = new Map<string, Set<string>>()

/**
 * 使用 oxc 解析文件的导出内容
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

  const oxcParseSync = await getOxcParser()
  const code = await fs.readFile(resolvedPath, 'utf-8')
  const result = oxcParseSync(resolvedPath, code, {
    sourceType: 'module',
  })

  if (!result.program) {
    throw new Error(`Failed to parse ${resolvedPath}: ${result.errors?.map((e: any) => e.message).join(', ')}`)
  }

  const exports = new Set<string>()

  function traverse(node: any): void {
    if (!node || typeof node !== 'object')
      return

    switch (node.type) {
      case 'ExportNamedDeclaration':
        // 处理 export const a = 1 或 export function b() {} 或 export class C {}
        if (node.declaration) {
          if (node.declaration.declarations) {
            // Variable declarations: export const a = 1
            node.declaration.declarations.forEach((d: any) => {
              if (d.id?.type === 'Identifier') {
                exports.add(d.id.name)
              }
            })
          }
          else if (node.declaration.id) {
            // Function/Class declarations: export function b() {} or export class C {}
            exports.add(node.declaration.id.name)
          }
        }
        // 处理 export { a as a1, b as b1 }
        if (node.specifiers && node.specifiers.length > 0) {
          node.specifiers.forEach((s: any) => {
            if (s.exported?.name) {
              exports.add(s.exported.name)
            }
          })
        }
        break

      case 'ExportDefaultDeclaration':
        exports.add('default')
        break

      case 'ExportAllDeclaration':
        // 处理 export * from './module'
        // 这里可以进一步解析被导出的模块
        break
    }

    // 递归遍历子节点
    for (const key in node) {
      if (key !== 'parent' && typeof node[key] === 'object') {
        if (Array.isArray(node[key])) {
          node[key].forEach(traverse)
        }
        else {
          traverse(node[key])
        }
      }
    }
  }

  traverse(result.program)
  exportsCache.set(resolvedPath, exports)
  return exports
}

// 默认支持的后缀列表
const DEFAULT_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs', '.vue']

// 路径解析缓存
const pathResolutionCache = new Map<string, string>()

/**
 * 获取与指定文件相关的文件列表
 * @param files 目标文件列表
 * @param importsDir 要搜索的目录
 * @param extensions 支持的文件扩展名
 * @returns 相关文件的路径数组
 */
/**
 * 解析文件路径，支持不带扩展名的文件
 */
async function resolveFilePath(
  filePath: string,
  extensions: string[] = DEFAULT_EXTENSIONS
): Promise<string | null> {
  const absolutePath = path.resolve(filePath)
  
  // 如果文件已经有扩展名，直接检查是否存在
  if (path.extname(filePath)) {
    try {
      await fs.access(absolutePath)
      return absolutePath
    } catch {
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
    } catch {
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
    } else {
      console.warn(`Warning: Could not resolve file path: ${f}`)
    }
  }

  // 获取所有测试文件绝对路径
  const testFiles = await globby([`${importsDir}/**/*.{js,ts,jsx,tsx,vue}`], {
    absolute: true,
    expandDirectories: false,
  })

  const results = new Set<string>()

  for (const testFile of testFiles) {
    try {
      const oxcParseSync = await getOxcParser()
      const code = await fs.readFile(testFile, 'utf-8')
      const result = oxcParseSync(testFile, code, {
        sourceType: 'module',
      })

      if (!result.program)
        continue

      let isRelated = false

      function traverse(node: any): void {
        if (!node || typeof node !== 'object' || isRelated)
          return

        switch (node.type) {
          case 'ImportDeclaration':
            if (node.source?.value) {
              processImport(node.source.value, testFile, node.specifiers)
            }
            break

          case 'CallExpression':
            // 处理动态 import()
            if (node.callee?.type === 'Import' && node.arguments?.[0]?.value) {
              processImport(node.arguments[0].value, testFile)
            }
            break
        }

        // 递归遍历子节点
        for (const key in node) {
          if (key !== 'parent' && typeof node[key] === 'object') {
            if (Array.isArray(node[key])) {
              node[key].forEach(traverse)
            }
            else {
              traverse(node[key])
            }
          }
        }
      }

      function processImport(importSource: string, testFile: string, specifiers?: any[]): void {
        const baseDir = path.dirname(testFile)
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

        // 检查所有可能的路径
        for (const tryPath of tryPaths) {
          const resolvedPath = pathResolutionCache.get(tryPath) || tryPath

          if (targetFiles.has(resolvedPath)) {
            isRelated = true
            return
          }

          // 检查具名引用（需要对应路径的导出缓存）
          if (exportsCache.has(resolvedPath) && specifiers) {
            const exports = exportsCache.get(resolvedPath)!
            for (const specifier of specifiers) {
              if (specifier.type === 'ImportSpecifier' && exports.has(specifier.imported.name)) {
                isRelated = true
                return
              }
              if (specifier.type === 'ImportDefaultSpecifier' && exports.has('default')) {
                isRelated = true
                return
              }
            }
          }
        }
      }

      traverse(result.program)
      if (isRelated) {
        results.add(testFile)
      }
    }
    catch (error) {
      // 忽略解析错误的文件
      console.warn(`Failed to parse ${testFile}:`, error)
    }
  }

  return Array.from(results)
}

/**
 * 清除缓存
 */
function clearCache(): void {
  exportsCache.clear()
  pathResolutionCache.clear()
}

/**
 * 获取缓存统计信息
 */
function getCacheStats(): { exportsCache: number, pathResolutionCache: number } {
  return {
    exportsCache: exportsCache.size,
    pathResolutionCache: pathResolutionCache.size,
  }
}

export {
  clearCache,
  DEFAULT_EXTENSIONS,
  getCacheStats,
  getRelatedFiles,
  parseExports,
}
