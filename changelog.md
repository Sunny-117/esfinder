# changelog

## 0.0.2-alpha.3

针对自动补全文件后缀的代码升级主要改进说明：

1. **智能后缀补全**：
   - 自动尝试 `['.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs']` 等后缀
   - 可通过参数自定义扩展列表：`getRelatedFiles(files, dir, ['.vue', '.js'])`

2. **路径解析优化**：
   ```typescript
   // 原始路径：import './utils'
   // 尝试路径：
   '/project/src/utils' // 原始路径
   '/project/src/utils.js' // + .js
   '/project/src/utils.ts' // + .ts
   // ...其他扩展名
   ```

3. **缓存优化**：
   - 提前缓存所有可能的路径组合
   - 避免重复的路径解析计算

4. **兼容性处理**：
   - 支持 Node.js 模块解析规则
   - 正确处理相对路径和绝对路径

### 使用示例：
```typescript
// 默认扩展名的情况
getRelatedFiles(['./src/a', './src/b'], './tests')

// 自定义扩展名的情况
getRelatedFiles(
  ['./src/a.vue', './src/b.ts'],
  './tests',
  ['.vue', '.ts', '.tsx'] // 自定义扩展列表
)
```

### 扩展建议：
1. 如果需要支持目录索引文件（如 `import './utils'` 对应 `./utils/index.js`），可添加：
```typescript
// 在 tryPaths 生成逻辑中添加：
if (isDirectory(tryPath)) {
  extensions.forEach((ext) => {
    tryPaths.push(path.join(tryPath, `index${ext}`))
  })
}
```

2. 如果需要处理 CSS/JSON 等非 JS 模块的引用，可扩展 `DEFAULT_EXTENSIONS`：
```typescript
const DEFAULT_EXTENSIONS = [
  ...DEFAULT_EXTENSIONS,
  '.css',
  '.json',
  '.scss'
]
```
