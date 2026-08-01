import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/toolbox/',
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'onnxruntime': ['onnxruntime-web'],
          'background-removal': ['@imgly/background-removal'],
        }
      }
    }
  }
})
