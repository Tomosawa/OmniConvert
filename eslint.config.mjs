// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  {
    rules: {
      'vue/multi-word-component-names': 'off',
      'vue/html-self-closing': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
    },
    ignores: ['.nuxt', '.output', 'dist', 'node_modules', 'coverage', 'src-tauri/target'],
  },
  {
    // shadcn-vue components intentionally leave variant/size/class props
    // optional without defaults — that's the upstream convention.
    files: ['components/ui/**/*.vue'],
    rules: {
      'vue/require-default-prop': 'off',
    },
  },
)
