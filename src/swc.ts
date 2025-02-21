/* eslint-disable ts/explicit-function-return-type */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parseSync } from '@swc/core'
import { globby } from 'globby'

// 缓存导出内容 { [filePath]: Set<exportName> }
const exportsCache = new Map()

async function parseExports(filePath: string): Promise<Set<string>> {
  if (exportsCache.has(filePath))
    return exportsCache.get(filePath)

  const code = await fs.readFile(filePath, 'utf-8')
  const ast = parseSync(code, {
    syntax: 'typescript',
    tsx: true,
    dynamicImport: true,
  })

  const exports = new Set<string>()

  function traverse(node: any) {
    if (!node)
      return

    if (node.type === 'ExportNamedDeclaration') {
      if (node.declaration) {
        if (node.declaration.declarations) {
          node.declaration.declarations.forEach((d: any) => {
            if (d.id?.type === 'Identifier')
              exports.add(d.id.value)
          })
        }
        else if (node.declaration.id) {
          exports.add(node.declaration.id.value)
        }
      }
      if (node.specifiers) {
        node.specifiers.forEach((s: any) => {
          if (s.exported?.value)
            exports.add(s.exported.value)
        })
      }
    }
    else if (node.type === 'ExportDefaultDeclaration') {
      exports.add('default')
    }

    for (const key in node) {
      if (typeof node[key] === 'object')
        traverse(node[key])
    }
  }

  traverse(ast)
  exportsCache.set(filePath, exports)
  return exports
}

const DEFAULT_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']
const pathResolutionCache = new Map()

async function getRelatedFiles(files: string[], importsDir: string, extensions: string[] = DEFAULT_EXTENSIONS): Promise<string[]> {
  const targetFiles = new Set(files.map((f) => {
    const resolved = path.resolve(f)
    extensions.forEach((ext) => {
      pathResolutionCache.set(resolved + ext, resolved)
    })
    return resolved
  }))

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
