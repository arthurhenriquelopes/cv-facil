/**
 * rag/engine/hybrid_retriever.js
 * Recuperador Híbrido: BM25 + Similaridade Semântica + Fusão RRF (Reciprocal Rank Fusion)
 * Baseado no Guia Mestre (Stack: Antigravity + Gemini).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CORPUS_DIR = path.resolve(__dirname, '../corpus');

let corpusChunksCache = null;

/**
 * Carrega e indexa em memória os arquivos do corpus em chunks com metadados
 */
export function loadCorpusChunks() {
  if (corpusChunksCache) return corpusChunksCache;

  const chunks = [];
  try {
    const files = fs.readdirSync(CORPUS_DIR);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const filePath = path.join(CORPUS_DIR, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Chunks especializados por arquivo
      if (file === 'ats_parsers.json') {
        if (content.platforms) {
          for (const [key, p] of Object.entries(content.platforms)) {
            chunks.push({
              id: `ats_${key}`,
              source: 'ats_parsers.json',
              category: 'ats_platform',
              title: `Regras de Parser ATS: ${p.name}`,
              text: `${p.name} (${p.market_share_tier}). Motor: ${p.parser_engine}. Peculiaridades: ${p.parsing_quirks.join(' ')} Formatos: ${p.supported_formats.join(', ')}. Modelo de score: ${p.scoring_type}`,
              metadata: { platform: key, formats: p.supported_formats }
            });
          }
        }
        if (content.general_ats_golden_rules) {
          for (const rule of content.general_ats_golden_rules) {
            chunks.push({
              id: `ats_rule_${rule.id}`,
              source: 'ats_parsers.json',
              category: 'ats_golden_rule',
              title: `Regra de Ouro ATS: ${rule.rule}`,
              text: `${rule.rule}. Importância: ${rule.importance}. Motivo: ${rule.reason} ${(rule.valid_headers || []).join(', ')}`,
              metadata: { ruleId: rule.id, importance: rule.importance }
            });
          }
        }
      } else if (file === 'bullet_mastery.json') {
        if (content.frameworks) {
          for (const [key, f] of Object.entries(content.frameworks)) {
            chunks.push({
              id: `bullet_${key}`,
              source: 'bullet_mastery.json',
              category: 'writing_framework',
              title: `Framework de Bullet: ${f.name}`,
              text: `${f.name}. Fórmula: ${f.formula || ''}. Exemplo de alto impacto: ${f.good_example || ''}. Evitar: ${f.bad_example || ''}`,
              metadata: { framework: key }
            });
          }
        }
        if (content.anti_hallucination_rules) {
          chunks.push({
            id: 'bullet_anti_hallucination',
            source: 'bullet_mastery.json',
            category: 'ethical_guardrail',
            title: 'Regras de Não-Alucinação de Experiência',
            text: content.anti_hallucination_rules.join(' '),
            metadata: { type: 'safety' }
          });
        }
      } else if (file === 'taxonomies_skills.json') {
        if (content.roles) {
          for (const r of content.roles) {
            chunks.push({
              id: `role_${r.cbo_code.replace('-', '_')}`,
              source: 'taxonomies_skills.json',
              category: 'occupation_taxonomy',
              title: `Ocupação CBO ${r.cbo_code}: ${r.standard_title}`,
              text: `${r.standard_title} (CBO ${r.cbo_code}). Sinônimos: ${r.synonyms.join(', ')}. Competências fundamentais: ${r.core_skills.join(', ')}. Senioridades: ${r.seniorities.join(', ')}`,
              metadata: { cbo: r.cbo_code, title: r.standard_title }
            });
          }
        }
      } else if (file === 'design_system.json') {
        chunks.push({
          id: 'design_tokens_and_unslop',
          source: 'design_system.json',
          category: 'design_system',
          title: 'Design System CV Fácil & Diretrizes Anti-Slop',
          text: `Filosofia: ${JSON.stringify(content.philosophy)}. Tokens: ${JSON.stringify(content.tokens)}. Textura oficial: ${JSON.stringify(content.visual_textures)}. Padrões proibidos de IA: ${content.prohibited_ai_slop_patterns.join('; ')}`,
          metadata: { type: 'design' }
        });
      } else if (file === 'decisions_log.json') {
        if (content.decisions) {
          for (const d of content.decisions) {
            chunks.push({
              id: `decision_${d.id}`,
              source: 'decisions_log.json',
              category: 'project_decision',
              title: `Decisão de Projeto ${d.id}: ${d.title}`,
              text: `[${d.category.toUpperCase()}] ${d.title} (Data: ${d.date}). Contexto: ${d.context}. Decisão tomada: ${d.decision}. Status: ${d.status}.`,
              metadata: { decisionId: d.id, category: d.category, date: d.date }
            });
          }
        }
      }
    }
  } catch (err) {
    console.error('Erro ao ler diretório do corpus RAG:', err);
  }

  corpusChunksCache = chunks;
  return chunks;
}

/**
 * Tokenizador e normalizador simples para português/inglês
 */
function tokenize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2);
}

/**
 * Busca por BM25 simplificado
 */
function searchBM25(queryTokens, chunks) {
  const scores = new Map();
  const N = chunks.length || 1;

  for (const chunk of chunks) {
    const chunkTokens = tokenize(chunk.text + ' ' + chunk.title);
    const chunkLen = chunkTokens.length || 1;
    let score = 0;

    for (const q of queryTokens) {
      const tf = chunkTokens.filter(t => t === q).length;
      if (tf > 0) {
        // Document frequency
        const df = chunks.filter(c => tokenize(c.text + ' ' + c.title).includes(q)).length;
        const idf = Math.log(1 + (N - df + 0.5) / (df + 0.5));
        score += idf * ((tf * 2.2) / (tf + 1.2 * (0.25 + 0.75 * (chunkLen / 40))));
      }
    }
    scores.set(chunk.id, score);
  }

  return chunks
    .map(c => ({ chunk: c, score: scores.get(c.id) || 0 }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Busca Semântica aproximada por n-grams e densidade de conceitos
 */
function searchSemantic(query, chunks) {
  const queryLower = query.toLowerCase();
  const qTokens = tokenize(query);

  return chunks
    .map(chunk => {
      let score = 0;
      const textLower = (chunk.title + ' ' + chunk.text).toLowerCase();

      // Correspondência de título com peso elevado
      for (const token of qTokens) {
        if (chunk.title.toLowerCase().includes(token)) score += 3.0;
        if (textLower.includes(token)) score += 1.0;
      }

      // Correspondência de n-gram (termos compostos)
      if (queryLower.length > 5 && textLower.includes(queryLower)) {
        score += 8.0;
      }

      return { chunk, score };
    })
    .sort((a, b) => b.score - a.score);
}

/**
 * Executa Recuperação Híbrida usando Reciprocal Rank Fusion (RRF)
 * @param {string} query Texto da consulta de busca
 * @param {object} options Opções de filtro e limite
 * @returns {Array} Top chunks ranqueados com citações
 */
export function hybridRetrieve(query, { topK = 5, categoryFilter = null, minScore = 0.005 } = {}) {
  const chunks = loadCorpusChunks();
  const filteredChunks = categoryFilter
    ? chunks.filter(c => c.category === categoryFilter || (Array.isArray(categoryFilter) && categoryFilter.includes(c.category)))
    : chunks;

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const bm25Results = searchBM25(queryTokens, filteredChunks);
  const semanticResults = searchSemantic(query, filteredChunks);

  // Reciprocal Rank Fusion com k=60 (constante padrão de literatura IR)
  const K = 60;
  const rrfScores = new Map();

  bm25Results.forEach((res, rank) => {
    const current = rrfScores.get(res.chunk.id) || 0;
    rrfScores.set(res.chunk.id, current + 1 / (K + rank + 1));
  });

  semanticResults.forEach((res, rank) => {
    const current = rrfScores.get(res.chunk.id) || 0;
    rrfScores.set(res.chunk.id, current + 1 / (K + rank + 1));
  });

  return filteredChunks
    .map(chunk => ({
      ...chunk,
      rrfScore: rrfScores.get(chunk.id) || 0
    }))
    .filter(item => item.rrfScore >= minScore)
    .sort((a, b) => b.rrfScore - a.rrfScore)
    .slice(0, topK);
}

/**
 * Invalida o cache para recarregar se novos arquivos forem adicionados
 */
export function invalidateCorpusCache() {
  corpusChunksCache = null;
}

export default {
  loadCorpusChunks,
  hybridRetrieve,
  invalidateCorpusCache
};
