// api/rag.js — Endpoint RAG & Memória de Decisões do CV Fácil
import { hybridRetrieve } from '../rag/engine/hybrid_retriever.js';
import { evaluateDeterministicATS } from '../rag/engine/ats_evaluator.js';
import { sanitizeInputText } from '../rag/engine/security_sanitizer.js';
import { recordDecision } from '../rag/engine/decision_recorder.js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const payload = req.method === 'GET' ? req.query : req.body || {};
  const action = payload.action || 'retrieve';

  try {
    // 1. Recuperação Híbrida no Corpus (BM25 + Semântica + RRF)
    if (action === 'retrieve') {
      const { query, topK, categoryFilter } = payload;
      if (!query) {
        return res.status(400).json({ error: 'Query de busca não fornecida.' });
      }
      const results = hybridRetrieve(query, {
        topK: topK ? parseInt(topK, 10) : 5,
        categoryFilter
      });
      return res.status(200).json({ success: true, query, resultsCount: results.length, results });
    }

    // 2. Avaliação Determinística de ATS (Regras objetivas pré-LLM)
    if (action === 'evaluate_ats') {
      const { cvText } = payload;
      const sanitized = sanitizeInputText(cvText || '');
      const report = evaluateDeterministicATS(sanitized.sanitizedText);
      return res.status(200).json({
        success: true,
        security: {
          isSuspicious: sanitized.isSuspicious,
          threatsDetected: sanitized.threatsDetected
        },
        report
      });
    }

    // 3. Sanitização e Proteção contra Prompt Injection / PII
    if (action === 'sanitize') {
      const { text } = payload;
      const sanitized = sanitizeInputText(text || '');
      return res.status(200).json({ success: true, sanitized });
    }

    // 4. Registro Automático de Decisão no RAG
    if (action === 'record_decision') {
      const { title, category, context, decision, impacted_files } = payload;
      const entry = recordDecision({
        title,
        category,
        context,
        decision,
        impacted_files
      });
      return res.status(201).json({ success: true, recordedDecision: entry });
    }

    // 5. Consulta ao Log de Decisões
    if (action === 'get_decisions') {
      const decisionsPath = path.resolve(process.cwd(), 'rag/corpus/decisions_log.json');
      if (fs.existsSync(decisionsPath)) {
        const data = JSON.parse(fs.readFileSync(decisionsPath, 'utf-8'));
        return res.status(200).json({ success: true, ...data });
      }
      return res.status(200).json({ success: true, decisions: [] });
    }

    return res.status(400).json({ error: `Ação não reconhecida: ${action}` });
  } catch (err) {
    console.error('Erro na API RAG:', err);
    return res.status(500).json({ error: err.message || 'Erro interno no servidor RAG.' });
  }
}
