import { defineConfig } from 'vite'
import reactSwc from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [reactSwc()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.claude/**',
    ],
  },
})
