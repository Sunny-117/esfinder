# esfinder

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![bundle][bundle-src]][bundle-href]
[![JSDocs][jsdocs-src]][jsdocs-href]
[![License][license-src]][license-href]

English | <a href="./README-zh.md">简体中文</a>

`esfinder is a tool based on Babel and SWC for analyzing and parsing file imports and their related dependencies in JavaScript and TypeScript projects. It can efficiently track files related to import paths and supports both static and dynamic imports.

## Installation

```bash
npm install esfinder
```

## API Documentation

### `parseExports(filePath: string): Promise<Set<string>>`

#### Parameters:
- **`filePath`** (string): The absolute or relative path of the file to parse.

#### Returns:
- **`Promise<Set<string>>`**: A `Promise` that resolves to a `Set` of export names found in the given file.

#### Description:
This function parses the exports of a file, returning a `Set` of all named and default exports. It caches the results to improve performance for repeated calls on the same file.

### `getRelatedFiles(files: string[], importsDir: string, extensions: string[] = DEFAULT_EXTENSIONS): Promise<string[]>`

#### Parameters:
- **`files`** (string[]): A list of file paths to check for related imports.
- **`importsDir`** (string): The directory containing files to be checked for imports.
- **`extensions`** (string[]): An optional array of file extensions to resolve. Defaults to `['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']`.

#### Returns:
- **`Promise<string[]>`**: A `Promise` that resolves to an array of file paths that are related to the given files, based on the imports and exports.

#### Description:
This function checks all files in the `importsDir` for `import` statements and compares them with the given `files`. It uses cached export data and attempts to resolve paths based on the provided extensions.

## Usage Example

```ts
import path from 'node:path'
import { getRelatedFiles, parseExports } from 'esfinder' // by babel
import { getRelatedFiles, parseExports } from 'esfinder/swc' // by swc

const files = ['./src/a.js', './src/c.js']
const importsDir = './src/__tests__'

// Pre-cache the export contents of target files
Promise.all(files.map(f => parseExports(path.resolve(f))))
  .then(() => getRelatedFiles(files, importsDir))
  .then(console.log)
  .catch(console.error)
```

In this example:
1. The exports of `a.js` and `c.js` are cached.
2. The function `getRelatedFiles` finds all files in `__tests__` that are related to the given files based on their imports.

## Contributing

We welcome contributions to improve `esfinder`. Please fork the repository, create a branch for your feature, and submit a pull request.

### Guidelines:
- Follow the [Code of Conduct](CODE_OF_CONDUCT.md).
- Ensure that tests are added for any new features or bug fixes.
- Update documentation as necessary.

## License

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
