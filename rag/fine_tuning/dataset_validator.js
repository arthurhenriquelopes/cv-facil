/**
 * rag/fine_tuning/dataset_validator.js
 * Validador de conformidade para Datasets de Fine-Tuning do Gemini
 * Baseado no Guia Mestre:
 * "Nenhuma mudança de prompt, chunking ou modelo entra sem validação no CI."
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATASETS_DIR = path.resolve(__dirname, './datasets');

export function validateJSONLDataset(filePath) {
  const issues = [];
  let validLines = 0;

  if (!fs.existsSync(filePath)) {
    return { valid: false, issues: [`Arquivo inexistente: ${filePath}`], lineCount: 0 };
  }

  const lines = fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim().length > 0);

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch (e) {
      issues.push(`Linha ${lineNum}: JSON inválido (${e.message})`);
      return;
    }

    // Validação de schema oficial do Gemini SFT
    if (!obj.contents || !Array.isArray(obj.contents) || obj.contents.length < 2) {
      issues.push(`Linha ${lineNum}: 'contents' deve ser um array com no mínimo 2 mensagens (user e model).`);
      return;
    }

    const userMsg = obj.contents.find(c => c.role === 'user');
    const modelMsg = obj.contents.find(c => c.role === 'model');

    if (!userMsg || !userMsg.parts || !userMsg.parts[0]?.text) {
      issues.push(`Linha ${lineNum}: Mensagem com role 'user' ausente ou sem texto.`);
    }

    if (!modelMsg || !modelMsg.parts || !modelMsg.parts[0]?.text) {
      issues.push(`Linha ${lineNum}: Mensagem com role 'model' ausente ou sem texto.`);
    }

    // Checagem de tamanho mínimo
    if (userMsg?.parts[0]?.text.length < 10) {
      issues.push(`Linha ${lineNum}: Mensagem de entrada (user) muito curta.`);
    }

    if (modelMsg?.parts[0]?.text.length < 10) {
      issues.push(`Linha ${lineNum}: Mensagem de saída (model) muito curta.`);
    }

    validLines++;
  });

  return {
    file: path.basename(filePath),
    valid: issues.length === 0,
    lineCount: lines.length,
    validLines,
    issues
  };
}

export function validateAllDatasets() {
  const results = [];
  if (!fs.existsSync(DATASETS_DIR)) return results;

  const files = fs.readdirSync(DATASETS_DIR).filter(f => f.endsWith('.jsonl'));
  for (const f of files) {
    const fullPath = path.join(DATASETS_DIR, f);
    results.push(validateJSONLDataset(fullPath));
  }
  return results;
}

// Execução CLI
if (process.argv[1] && process.argv[1].endsWith('dataset_validator.js')) {
  console.log('--- Validação de Datasets de Fine-Tuning ---');
  const results = validateAllDatasets();
  let hasErrors = false;
  for (const r of results) {
    if (r.valid) {
      console.log(`✓ ${r.file}: VÁLIDO (${r.validLines}/${r.lineCount} pares conformes)`);
    } else {
      hasErrors = true;
      console.error(`✗ ${r.file}: FALHAS ENCONTRADAS (${r.issues.length} erros):`);
      r.issues.forEach(i => console.error(`  - ${i}`));
    }
  }
  if (hasErrors) process.exit(1);
}

export default {
  validateJSONLDataset,
  validateAllDatasets
};
