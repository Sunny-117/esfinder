import { promises as fs } from 'node:fs'
import path from 'node:path'
import { parse as babelParse } from '@babel/parser'
// @ts-expect-error todo
import traverseDefault from '@babel/traverse'
import { globby } from 'globby'

const traverse = traverseDefault.default
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
// 默认支持的后缀列表
const DEFAULT_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']

// 新增：路径解析缓存
const pathResolutionCache = new Map()

async function getRelatedFiles(
  files: string[],
  importsDir: string,
  extensions: string[] = DEFAULT_EXTENSIONS,
): Promise<string[]> {
  // 将输入文件转为绝对路径（带规范化处理）
  const targetFiles = new Set(
    files.map((f) => {
      const resolved = path.resolve(f)
      // 缓存原始路径和所有可能的后缀组合
      extensions.forEach((ext) => {
        pathResolutionCache.set(resolved + ext, resolved)
      })
      return resolved
    }),
  )

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

    traverse(ast, {
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
            tryPaths.push(
              path.resolve(baseDir, `${importSource}${ext}`),
            )
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
            const exports = exportsCache.get(resolvedPath)
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
    })

    if (isRelated)
      results.add(testFile)
  }

  return Array.from(results)
}

// 使用示例
// const files = ['./src/a.js', './src/c.js']
// const importsDir = './src/__tests__'

// // 预缓存目标文件的导出内容
// Promise.all(files.map(f => parseExports(path.resolve(f))))
//   .then(() => getRelatedFiles(files, importsDir))

//   .then(console.log)
//   .catch(console.error)

export { getRelatedFiles, parseExports }
