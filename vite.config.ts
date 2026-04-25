import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: Math.floor(Math.random() * (65535 - 1024) + 1024),
    host: 'localhost'
  }
});
