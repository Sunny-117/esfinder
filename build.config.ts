import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/swc',
    'src/oxc',
    'src/cli',
  ],
  declaration: 'node16',
  clean: true,
})
