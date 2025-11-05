// 测试动态导入
async function loadModule() {
  const { a } = await import('./source')
  return a
}

// 测试条件导入
if (process.env.NODE_ENV === 'development') {
  import('./source').then(module => {
    console.log(module.default)
  })
}

export { loadModule }