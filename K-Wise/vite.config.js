import { defineConfig, loadEnv, transformWithOxc } from 'vite';
import react from '@vitejs/plugin-react';

function buildClientEnv(mode) {
  const env = loadEnv(mode, process.cwd(), '');
  const nodeEnv = mode === 'production' ? 'production' : process.env.NODE_ENV || mode;
  const clientEnv = {
    NODE_ENV: nodeEnv
  };

  for (const [key, value] of Object.entries({ ...env, ...process.env })) {
    if (key.startsWith('REACT_APP_') || key.startsWith('VITE_')) {
      clientEnv[key] = value;
    }
  }

  return clientEnv;
}

export default defineConfig(({ mode }) => {
  const clientEnv = buildClientEnv(mode);

  return {
    plugins: [
      {
        name: 'k-wise-jsx-in-js-pretransform',
        enforce: 'pre',
        async transform(code, id) {
          if (!/[\\/]src[\\/].*\.js$/.test(id)) return null;
          const needsReactImport = /<[A-Za-z][\s\S]*>/.test(code)
            && !/\bimport\s+(?:\*\s+as\s+)?React\b/.test(code)
            && !/\bimport\s+React\s*,/.test(code);
          const source = needsReactImport ? `import React from 'react';\n${code}` : code;

          return transformWithOxc(source, id, {
            lang: 'jsx',
            jsx: { runtime: 'classic' }
          });
        }
      },
      react()
    ],
    oxc: {
      include: /[\\/]src[\\/].*\.js$/,
      lang: 'jsx'
    },
    optimizeDeps: {
      rolldownOptions: {
        moduleTypes: {
          '.js': 'jsx'
        }
      }
    },
    build: {
      rollupOptions: {
        moduleTypes: {
          '.js': 'jsx'
        }
      },
      rolldownOptions: {
        moduleTypes: {
          '.js': 'jsx'
        }
      }
    },
    server: {
      host: '0.0.0.0',
      port: 3000
    },
    preview: {
      host: '0.0.0.0',
      port: 3000
    },
    define: {
      'process.env': JSON.stringify(clientEnv)
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.js'],
      css: true,
      restoreMocks: false,
      clearMocks: false,
      mockReset: false
    }
  };
});
