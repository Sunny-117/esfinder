import { parseExports, getRelatedFiles } from 'esfinder'
import path from 'node:path'

const files = ['./src/a.js', './src/c.js']
// const files = ['./src/a.js', './src/c.js', './src/d'] // TODO: 不加后缀
const importsDir = './src/__tests__'

// 预缓存目标文件的导出内容
Promise.all(files.map(f => parseExports(path.resolve(f))))
  .then(() => getRelatedFiles(files, importsDir))

  .then(console.log)
  .catch(console.error)
