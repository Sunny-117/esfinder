import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/swc',
  ],
  declaration: 'node16',
  clean: true,
})
