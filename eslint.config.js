// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
  },
  // 只对src生效
  {
    ignores: ['test', 'example'],
  },
  {
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
      'no-eval': 'off',
    },
  },
)
