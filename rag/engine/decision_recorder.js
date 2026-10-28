/**
 * rag/engine/decision_recorder.js
 * Gravador Interativo de Decisões e Memória de Projeto no RAG
 * Permite que agentes e desenvolvedores registrem automaticamente diretrizes e decisões.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { invalidateCorpusCache } from './hybrid_retriever.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DECISIONS_FILE = path.resolve(__dirname, '../corpus/decisions_log.json');

/**
 * Registra uma nova decisão no log do RAG
 * @param {object} decisionData
 * @param {string} decisionData.title Título claro da decisão
 * @param {string} decisionData.category Categoria: 'design' | 'architecture_rag' | 'backend_ats' | 'security_lgpd' | 'fine_tuning'
 * @param {string} decisionData.context Contexto e dor/problema que motivou a decisão
 * @param {string} decisionData.decision O que foi decidido e diretriz a ser seguida
 * @param {string[]} decisionData.impacted_files Arquivos ou módulos impactados
 * @param {string} [decisionData.status='IMPLEMENTED']
 * @returns {object} Decisão registrada com ID
 */
export function recordDecision({
  title,
  category = 'architecture_rag',
  context,
  decision,
  impacted_files = [],
  status = 'IMPLEMENTED'
}) {
  if (!title || !decision) {
    throw new Error('Título e decisão são obrigatórios para registrar no RAG.');
  }

  let log = { project: 'CV Fácil', last_updated: new Date().toISOString(), decisions: [] };
  if (fs.existsSync(DECISIONS_FILE)) {
    try {
      log = JSON.parse(fs.readFileSync(DECISIONS_FILE, 'utf-8'));
    } catch (e) {
      console.warn('Erro ao ler decisions_log.json, recriando estrutura:', e);
    }
  }

  const nextNum = (log.decisions.length + 1).toString().padStart(3, '0');
  const id = `DEC-${nextNum}`;

  const newEntry = {
    id,
    date: new Date().toISOString().split('T')[0],
    category,
    title,
    context: context || 'Registrado automaticamente durante a evolução do projeto.',
    decision,
    status,
    impacted_files
  };

  log.decisions.push(newEntry);
  log.last_updated = new Date().toISOString();

  fs.writeFileSync(DECISIONS_FILE, JSON.stringify(log, null, 2), 'utf-8');
  invalidateCorpusCache();

  return newEntry;
}

// Execução via CLI direta (ex: node rag/engine/decision_recorder.js "Titulo" "Decisao")
if (process.argv[1] && process.argv[1].endsWith('decision_recorder.js')) {
  const args = process.argv.slice(2);
  if (args.length >= 2) {
    const entry = recordDecision({
      title: args[0],
      decision: args[1],
      category: args[2] || 'architecture_rag',
      context: args[3] || 'Execução manual via CLI'
    });
    console.log(`✓ Decisão ${entry.id} registrada com sucesso no RAG!`);
  }
}

export default {
  recordDecision
};
