import { describe, expect, it, beforeEach } from 'vitest'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('Extension Resolution', () => {
  beforeEach(async () => {
    // 创建测试文件
    const testDir = path.resolve(__dirname, './fixtures/extension-test')
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true })
    }
    
    // 创建不带扩展名的文件引用测试
    fs.writeFileSync(path.join(testDir, 'no-ext.js'), 'export const test = "no-ext"')
    fs.writeFileSync(path.join(testDir, 'importer.js'), 'import { test } from "./no-ext"')
  })

  describe('Babel Parser', () => {
    it('should resolve files without extensions', async () => {
      const { parseExports, getRelatedFiles } = await import('esfinder')
      
      const testDir = path.resolve(__dirname, './fixtures/extension-test')
      const noExtFile = path.join(testDir, 'no-ext') // 不带扩展名
      const importerFile = path.join(testDir, 'importer.js')
      
      // 测试解析不带扩展名的文件
      const exports = await parseExports(noExtFile)
      expect(exports.has('test')).toBe(true)
      
      // 测试查找相关文件
      const relatedFiles = await getRelatedFiles([noExtFile], testDir)
      expect(relatedFiles).toContain(importerFile)
    })
  })

  describe('SWC Parser', () => {
    it('should resolve files without extensions', async () => {
      const { parseExports, getRelatedFiles } = await import('esfinder/swc')
      
      const testDir = path.resolve(__dirname, './fixtures/extension-test')
      const noExtFile = path.join(testDir, 'no-ext') // 不带扩展名
      const importerFile = path.join(testDir, 'importer.js')
      
      // 测试解析不带扩展名的文件
      const exports = await parseExports(noExtFile)
      expect(exports.has('test')).toBe(true)
      
      // 测试查找相关文件
      const relatedFiles = await getRelatedFiles([noExtFile], testDir)
      expect(relatedFiles).toContain(importerFile)
    })
  })

  describe('OXC Parser', () => {
    it('should resolve files without extensions or show proper error', async () => {
      try {
        const { parseExports, getRelatedFiles } = await import('esfinder/oxc')
        
        const testDir = path.resolve(__dirname, './fixtures/extension-test')
        const noExtFile = path.join(testDir, 'no-ext') // 不带扩展名
        const importerFile = path.join(testDir, 'importer.js')
        
        // 测试解析不带扩展名的文件
        const exports = await parseExports(noExtFile)
        expect(exports.has('test')).toBe(true)
        
        // 测试查找相关文件
        const relatedFiles = await getRelatedFiles([noExtFile], testDir)
        expect(relatedFiles).toContain(importerFile)
      } catch (error) {
        // 如果OXC不可用，检查错误信息是否清晰
        expect(error.message).toMatch(/OXC parser|Node\.js.*20\.19\.4|not available/)
        console.warn('OXC parser test skipped:', error.message)
      }
    })
  })
})