import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages usually serves from a subdirectory (the repo name).
  // If your repo is https://user.github.io/repo-name/, set base to '/repo-name/'
  // For now, we use './' to make it relative path friendly.
  base: './', 
  define: {
    'process.env': process.env
  }
});