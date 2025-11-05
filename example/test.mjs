import path from 'node:path'

async function testAllParsers() {
  console.log('🧪 Testing all parsers with different file configurations...\n')

  const filesWithExt = ['./src/a.js', './src/c.js']
  const filesWithoutExt = ['./src/a', './src/c', './src/d'] // 不加后缀
  const importsDir = './src/__tests__'

  // Test Babel parser
  console.log('📊 Testing Babel parser:')
  try {
    const { parseExports: babelParseExports, getRelatedFiles: babelGetRelatedFiles } = await import('esfinder')
    
    console.log('  With extensions:')
    await Promise.all(filesWithExt.map(f => babelParseExports(f)))
    const babelResultsExt = await babelGetRelatedFiles(filesWithExt, importsDir)
    console.log('    Related files:', babelResultsExt)
    
    console.log('  Without extensions:')
    await Promise.all(filesWithoutExt.map(f => babelParseExports(f)))
    const babelResultsNoExt = await babelGetRelatedFiles(filesWithoutExt, importsDir)
    console.log('    Related files:', babelResultsNoExt)
  } catch (error) {
    console.error('  ❌ Babel error:', error.message)
  }

  // Test SWC parser
  console.log('\n📊 Testing SWC parser:')
  try {
    const { parseExports: swcParseExports, getRelatedFiles: swcGetRelatedFiles } = await import('esfinder/swc')
    
    console.log('  With extensions:')
    await Promise.all(filesWithExt.map(f => swcParseExports(f)))
    const swcResultsExt = await swcGetRelatedFiles(filesWithExt, importsDir)
    console.log('    Related files:', swcResultsExt)
    
    console.log('  Without extensions:')
    await Promise.all(filesWithoutExt.map(f => swcParseExports(f)))
    const swcResultsNoExt = await swcGetRelatedFiles(filesWithoutExt, importsDir)
    console.log('    Related files:', swcResultsNoExt)
  } catch (error) {
    console.error('  ❌ SWC error:', error.message)
  }

  // Test OXC parser
  console.log('\n📊 Testing OXC parser:')
  try {
    const { parseExports: oxcParseExports, getRelatedFiles: oxcGetRelatedFiles } = await import('esfinder/oxc')
    
    console.log('  With extensions:')
    await Promise.all(filesWithExt.map(f => oxcParseExports(f)))
    const oxcResultsExt = await oxcGetRelatedFiles(filesWithExt, importsDir)
    console.log('    Related files:', oxcResultsExt)
    
    console.log('  Without extensions:')
    await Promise.all(filesWithoutExt.map(f => oxcParseExports(f)))
    const oxcResultsNoExt = await oxcGetRelatedFiles(filesWithoutExt, importsDir)
    console.log('    Related files:', oxcResultsNoExt)
  } catch (error) {
    console.error('  ❌ OXC error:', error.message)
  }

  console.log('\n✨ Test completed!')
}

testAllParsers().catch(console.error)