import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // OneDrive expõe este workspace por dois caminhos equivalentes em algumas
  // máquinas. Preservar o caminho de entrada evita o Vite procurar módulos na
  // outra representação durante build e desenvolvimento.
  resolve: {
    preserveSymlinks: true,
  },
  server: {
    host: true,   // escuta em 0.0.0.0 → amigo acessa via IP da sua máquina
    port: 5173,
  },
});
