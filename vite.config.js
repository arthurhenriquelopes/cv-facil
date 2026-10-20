import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import react from '@vitejs/plugin-react';
import chatHandler from './api/chat.js';

import extractHandler from './api/extract.js';

// Simple Vite plugin to serve the Vercel function locally
const vercelApiPlugin = () => ({
  name: 'vercel-api-plugin',
  configureServer(server) {
    server.middlewares.use('/api/chat', async (req, res, next) => {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            req.body = body ? JSON.parse(body) : {};
            // Polyfill Vercel res.status() and res.json()
            res.status = (code) => { res.statusCode = code; return res; };
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            };
            await chatHandler(req, res);
          } catch (err) {
            console.error('API Error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        next();
      }
    });

    server.middlewares.use('/api/extract', async (req, res, next) => {
      if (req.method === 'POST') {
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', async () => {
          try {
            req.body = Buffer.concat(body);
            // Polyfill Vercel res.status() and res.json()
            res.status = (code) => { res.statusCode = code; return res; };
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            };
            await extractHandler(req, res);
          } catch (err) {
            console.error('API Error:', err);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      } else {
        next();
      }
    });
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Expose env vars to the API handler when running locally
  process.env.GROQ_API_KEY = env.GROQ_API_KEY;
  process.env.GEMINI_API_KEY = env.GEMINI_API_KEY;
  process.env.OPENROUTER_API_KEY = env.OPENROUTER_API_KEY;
  process.env.CEREBRAS_API_KEY = env.CEREBRAS_API_KEY;
  process.env.NVIDIA_API_KEY = env.NVIDIA_API_KEY;

  return {
    plugins: [react(), vercelApiPlugin()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          dashboard: resolve(__dirname, 'pages/dashboard.html'),
          stepProfile: resolve(__dirname, 'pages/step-profile.html'),
          stepJob: resolve(__dirname, 'pages/step-job.html'),
          stepAnalysis: resolve(__dirname, 'pages/step-analysis.html'),
          stepTemplate: resolve(__dirname, 'pages/step-template.html'),
          stepGenerating: resolve(__dirname, 'pages/step-generating.html'),
          result: resolve(__dirname, 'pages/result.html'),
          stepAtsScanner: resolve(__dirname, 'pages/step-ats-scanner.html'),
          stepAtsLoading: resolve(__dirname, 'pages/step-ats-loading.html'),
          stepAtsResult: resolve(__dirname, 'pages/step-ats-result.html'),
          certificates: resolve(__dirname, 'pages/certificates.html'),
          stepCertReview: resolve(__dirname, 'pages/step-cert-review.html'),
        },
      },
    },
  };
});
