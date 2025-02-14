import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parse as babelParse } from '@babel/parser'
// @ts-expect-error todo
import babelTraverse from '@babel/traverse'
import { globby } from 'globby'

const traverse = babelTraverse.default

// 缓存导出内容 { [filePath]: Set<exportName> }
const exportsCache = new Map()

async function parseExports(filePath: string): Promise<Set<unknown>> {
  if (exportsCache.has(filePath))
    return exportsCache.get(filePath)

  const code = await fs.readFile(filePath, 'utf-8')
  const ast = babelParse(code, {
    sourceType: 'module',
    plugins: ['jsx', 'typescript'],
  })

  const exports = new Set()

  traverse(ast, {
    ExportNamedDeclaration({ node }: any) {
      // 处理 export const a = 1 或 export function b() {}
      if (node.declaration) {
        if (node.declaration.declarations) {
          node.declaration.declarations.forEach((d: any) => {
            if (d.id?.type === 'Identifier')
              exports.add(d.id.name)
          })
        }
        else if (node.declaration.id) {
          exports.add(node.declaration.id.name)
        }
      }
      // 处理 export { a, b as c }
      if (node.specifiers) {
        node.specifiers.forEach((s: any) => {
          if (s.exported?.name)
            exports.add(s.exported.name)
        })
      }
    },
    ExportDefaultDeclaration() {
      exports.add('default')
    },
  })

  exportsCache.set(filePath, exports)
  return exports
}

async function getRelatedFiles(files: string[], importsDir: string): Promise<unknown[]> {
  // 将输入文件转为绝对路径
  const targetFiles = new Set(files.map(f => path.resolve(f)))

  // 获取所有测试文件绝对路径
  const testFiles = await globby([`${importsDir}/**/*.{js,ts,jsx,tsx}`], {
    absolute: true,
  })

  const results = new Set()

  for (const testFile of testFiles) {
    const code = await fs.readFile(testFile, 'utf-8')
    const ast = babelParse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    })

    let isRelated = false

    traverse(ast, {
      ImportDeclaration({ node }: { node: any }) {
        if (isRelated)
          return

        // 解析导入路径为绝对路径
        const importPath = path.resolve(
          path.dirname(testFile),
          node.source.value,
        )

        if (targetFiles.has(importPath)) {
          // 只要存在直接引用就标记为相关
          isRelated = true
          return
        }

        // 检查具名引用
        if (exportsCache.has(importPath)) {
          const exports = exportsCache.get(importPath)
          for (const specifier of node.specifiers) {
            if (specifier.type === 'ImportSpecifier'
              && exports.has(specifier.imported.name)) {
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

// 使用示例
const files = ['./src/a.js', './src/c.js']
const importsDir = './src/__tests__'

// 预缓存目标文件的导出内容
Promise.all(files.map(f => parseExports(path.resolve(f))))
  .then(() => getRelatedFiles(files, importsDir))
  // eslint-disable-next-line no-console
  .then(console.log)
  .catch(console.error)
