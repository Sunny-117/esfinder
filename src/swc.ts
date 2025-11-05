/* eslint-disable ts/explicit-function-return-type */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseSync } from '@swc/core'
import { globby } from 'globby'

// 缓存导出内容 { [filePath]: Set<exportName> }
const exportsCache = new Map()

async function parseExports(filePath: string): Promise<Set<string>> {
  // 解析文件路径，支持不带扩展名的文件
  const resolvedPath = await resolveFilePath(filePath)
  if (!resolvedPath) {
    throw new Error(`Could not resolve file path: ${filePath}`)
  }

  if (exportsCache.has(resolvedPath))
    return exportsCache.get(resolvedPath)

  const code = await fs.readFile(resolvedPath, 'utf-8')
  const ast = parseSync(code, {
    syntax: 'typescript',
    tsx: true,
    dynamicImport: true,
  })

  const exports = new Set<string>()

  function traverse(node: any) {
    if (!node)
      return

    // SWC uses different node types
    if (node.type === 'ExportDeclaration') {
      // Handle export const a = 1, export function b() {}, export class C {}
      if (node.declaration) {
        if (node.declaration.declarations) {
          // Variable declarations
          node.declaration.declarations.forEach((d: any) => {
            if (d.id?.type === 'Identifier') {
              exports.add(d.id.value)
            }
          })
        } else if (node.declaration.identifier) {
          // Function/Class declarations
          exports.add(node.declaration.identifier.value)
        }
      }
    } else if (node.type === 'ExportNamedDeclaration') {
      // Handle export { a as a1, b as b1 }
      if (node.specifiers) {
        node.specifiers.forEach((s: any) => {
          if (s.exported?.value) {
            exports.add(s.exported.value)
          }
        })
      }
    } else if (node.type === 'ExportDefaultDeclaration') {
      exports.add('default')
    }

    // Recursively traverse
    if (Array.isArray(node)) {
      node.forEach(traverse)
    } else if (typeof node === 'object') {
      for (const key in node) {
        if (key !== 'parent' && typeof node[key] === 'object') {
          traverse(node[key])
        }
      }
    }
  }

  traverse(ast)
  exportsCache.set(resolvedPath, exports)
  return exports
}

const DEFAULT_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']
const pathResolutionCache = new Map()

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

async function getRelatedFiles(files: string[], importsDir: string, extensions: string[] = DEFAULT_EXTENSIONS): Promise<string[]> {
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

  const testFiles = await globby([`${importsDir}/**/*.{js,ts,jsx,tsx}`], { absolute: true, expandDirectories: false })
  const results = new Set<string>()

  for (const testFile of testFiles) {
    const code = await fs.readFile(testFile, 'utf-8')
    const ast = parseSync(code, {
      syntax: 'typescript',
      tsx: true,
      dynamicImport: true,
    })

    let isRelated = false

    function traverse(node: any) {
      if (!node || isRelated)
        return

      if (node.type === 'ImportDeclaration') {
        const importSource = node.source?.value
        processImport(importSource, testFile)
      }
      else if (node.type === 'CallExpression' && node.callee?.type === 'Import') {
        if (node.arguments?.length && node.arguments[0]?.expression?.value) {
          const importSource = node.arguments[0].expression.value
          processImport(importSource, testFile)
        }
      }

      for (const key in node) {
        if (typeof node[key] === 'object')
          traverse(node[key])
      }
    }

    function processImport(importSource: string | undefined, testFile: string) {
      if (!importSource)
        return

      const baseDir = path.dirname(testFile)
      const tryPaths = [path.resolve(baseDir, importSource)]
      if (!path.extname(importSource)) {
        extensions.forEach(ext => tryPaths.push(path.resolve(baseDir, `${importSource}${ext}`)))
      }

      for (const tryPath of tryPaths) {
        const resolvedPath = pathResolutionCache.get(tryPath) || tryPath
        if (targetFiles.has(resolvedPath)) {
          isRelated = true
          return
        }
        if (exportsCache.has(resolvedPath)) {
          isRelated = true
          return
        }
      }
    }

    traverse(ast)
    if (isRelated)
      results.add(testFile)
  }

  return Array.from(results)
}

export { getRelatedFiles, parseExports }
