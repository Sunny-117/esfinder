import { defineConfig } from 'robuild'

export default defineConfig({
  entry: [
    'src/index',
    'src/swc',
    'src/oxc',
    'src/cli',
  ],
  target: 'esnext',
  clean: true,
})
