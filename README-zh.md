# esfinder

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

简体中文 | <a href="./README.md">English</a>

`esfinder` 是一个用于分析和解析 JavaScript 和 TypeScript 项目中文件的导入及其相关依赖的工具。它能够高效地追踪与导入路径相关的文件，支持静态和动态导入。

## 安装

```bash
npm install esfinder
```

## API 文档

### `parseExports(filePath: string): Promise<Set<string>>`

#### 参数:
- **`filePath`** (string): 要解析的文件的绝对或相对路径。

#### 返回:
- **`Promise<Set<string>>`**: 返回一个 `Promise`，解析为该文件中的所有导出名称的 `Set`。

#### 描述:
此函数解析文件的导出，返回一个包含所有具名和默认导出的 `Set`。它会缓存结果，以便在多次调用相同文件时提高性能。

### `getRelatedFiles(files: string[], importsDir: string, extensions: string[] = DEFAULT_EXTENSIONS): Promise<string[]>`

#### 参数:
- **`files`** (string[]): 需要检查与之相关的文件的路径列表。
- **`importsDir`** (string): 包含待检查导入文件的目录。
- **`extensions`** (string[]): 可选的文件扩展名数组。默认为 `['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']`。

#### 返回:
- **`Promise<string[]>`**: 返回一个 `Promise`，解析为与给定文件相关的文件路径数组。

#### 描述:
此函数检查 `importsDir` 中的所有文件的 `import` 语句，并将其与给定的文件进行比较。它利用缓存的导出数据，并尝试根据提供的扩展名解析路径。

## 使用示例

```ts
import path from 'node:path'
import { getRelatedFiles, parseExports } from 'esfinder'

const files = ['./src/a.js', './src/c.js']
const importsDir = './src/__tests__'

// 预缓存目标文件的导出内容
Promise.all(files.map(f => parseExports(path.resolve(f))))
  .then(() => getRelatedFiles(files, importsDir))
  .then(console.log)
  .catch(console.error)
```

在这个示例中：
1. 预缓存了 `a.js` 和 `c.js` 的导出内容。
2. `getRelatedFiles` 函数根据导入关系找到 `__tests__` 中与给定文件相关的所有文件。

## 许可证

此项目根据 MIT 许可证开源 - 请参阅 [LICENSE](LICENSE) 文件了解详情。

## 贡献

我们欢迎对 `esfinder` 的贡献。请克隆此仓库，创建一个新的分支，然后提交一个拉取请求。

### 准则：
- 请遵守 [Code of Conduct](CODE_OF_CONDUCT.md)。
- 确保为任何新功能或修复的 bug 添加测试。
- 根据需要更新文档。

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
