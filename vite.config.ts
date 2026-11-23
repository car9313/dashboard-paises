import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

/**
 * Configuración única para dev, build y pruebas.
 *
 * El puerto 5173 es **parte del contrato**: el backend solo permite CORS desde
 * ese origen (ver `docs/03-contratos-api.md` §1). Cambiarlo obliga a tocar la
 * política del servidor, así que `strictPort` evita arrancar en otro puerto.
 */
export default defineConfig({
  // `VITE_BASE` solo se usa al publicar bajo un subdirectorio (GitHub Pages).
  // En dev, pruebas y despliegues en raíz queda en `/`.
  base: process.env.VITE_BASE ?? '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  preview: {
    port: 5173,
    strictPort: true
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    /*
     * El presupuesto del proyecto se mide en gzip (< 250 KB de JS inicial, ver
     * `docs/05-plan-fases.md` §10). El límite de aviso de Vite es en crudo: la
     * entrada pesa ~189 KB gzip, pero en crudo supera los 500 KB por React,
     * Router, Query, Zod y Radix, que ya están dentro del presupuesto real.
     */
    chunkSizeWarningLimit: 700
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    css: false,
    // Holgura para runners lentos (CI: 2-4 vCPU compartidas). Debe superar
    // syncUtilTimeout (5 s) para que las aserciones fallen por su motivo.
    testTimeout: 15000,
    hookTimeout: 15000,
    restoreMocks: true,
    // Las pruebas de navegador las corre Playwright (`pnpm e2e`), no Vitest.
    exclude: [...configDefaults.exclude, 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.spec.{ts,tsx}',
        'src/mocks/**',
        'src/main.tsx',
        'src/core/api/schema.d.ts',
        // Utilidades de prueba: medirlas mide el andamio, no el producto.
        'src/test-utils/**'
      ],
      /*
       * Umbrales fijados con la cobertura real medida el 2026-11-23 (global
       * 77,8 / 70,4 / 72,1 / 79,1) menos dos o tres puntos de margen, para que
       * bloqueen una caída de verdad y no ruido de una línea.
       *
       * Los globs por capa son la parte que importa: `shared` y `core` son el
       * suelo del resto de la app, así que se exigen más que la media.
       */
      thresholds: {
        statements: 75,
        branches: 67,
        functions: 70,
        lines: 76,
        'src/core/**': { statements: 81, branches: 73, functions: 70, lines: 82 },
        'src/features/**': { statements: 81, branches: 67, functions: 78, lines: 82 },
        'src/shared/**': { statements: 92, branches: 90, functions: 90, lines: 92 }
      }
    }
  }
});
