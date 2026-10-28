/**
 * rag/engine/ats_evaluator.js
 * Avaliador Determinístico de ATS e Legibilidade para Parsers
 * Implementa as diretrizes do Guia Mestre:
 * "Tudo o que puder ser regra (datas, seções, e-mail, stuffing) não deve passar por LLM."
 */

const ESSENTIAL_CONTACT_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  phone: /(?:\+?55\s?)?(?:\(?\d{2}\)?\s?)?(?:9\s?)?\d{4}[-\s]?\d{4}/,
  linkedin: /linkedin\.com\/in\/[a-zA-Z0-9-_]+/i,
  github: /github\.com\/[a-zA-Z0-9-_]+/i
};

const STANDARD_SECTIONS = [
  { name: 'Resumo / Perfil Profissional', pattern: /(resumo|perfil\s+profissional|sobre\s+mim|apresenta[çc][ãa]o)/i },
  { name: 'Experiência Profissional', pattern: /(experi[êe]ncia(s)?(\s+profissional)?|hist[óo]rico\s+profissional|atua[çc][ãa]o)/i },
  { name: 'Formação Acadêmica', pattern: /(forma[çc][ãa]o(\s+acad[êe]mica)?|educa[çc][ãa]o|gradua[çc][ãa]o|escolaridade)/i },
  { name: 'Habilidades Técnicas', pattern: /(habilidades|compet[êe]ncias|conhecimentos(\s+t[ée]cnicos)?|stack)/i },
  { name: 'Idiomas', pattern: /(idiomas|l[íi]nguas)/i },
  { name: 'Certificações / Cursos', pattern: /(certifica[çc][õo]es|cursos|especializa[çc][õo]es)/i }
];

const METRIC_PATTERNS = [
  /\b\d+([.,]\d+)?\s*%/g, // Porcentagens (ex: 40%, 15.5%)
  /R\$\s*\d+([.,]\d+)?(\s*(mil|milh[õo]es|k|m))?/gi, // Valores monetários
  /\b(reduziu|aumentou|otimizou|economizou|gerou|cresceu)\s+[a-z\s]*\b\d+/gi, // Verbo + número
  /\b\d+\s*(ms|segundos|minutos|horas|dias|semanas|meses|anos)\b/gi, // Tempo mensurável
  /\b(de\s+\d+\s+para\s+\d+)\b/gi // De X para Y
];

const ACTION_VERBS = [
  'arquitetei', 'desenvolvi', 'implementei', 'projetei', 'construí', 'refatorei',
  'integrei', 'automatizei', 'otimizei', 'reduzi', 'acelerei', 'eliminei',
  'consolidei', 'maximizou', 'mitiguei', 'aprimorei', 'liderei', 'coordenei',
  'direcionei', 'orquestrei', 'alavanquei', 'aumentei', 'estruturei', 'auditei'
];

/**
 * Realiza avaliação estritamente determinística do texto do currículo
 * @param {string} cvText Texto puro extraído do currículo
 * @returns {object} Relatório determinístico de legibilidade ATS
 */
export function evaluateDeterministicATS(cvText) {
  if (!cvText || typeof cvText !== 'string' || cvText.trim().length === 0) {
    return {
      deterministicScore: 0,
      breakdown: { contacts: 0, sections: 0, metrics: 0, stuffingRisk: 'ALTO' },
      issues: [{ severity: 'CRITICAL', rule: 'EMPTY_DOCUMENT', message: 'Nenhum texto pôde ser extraído do documento.' }],
      strengths: []
    };
  }

  const issues = [];
  const strengths = [];
  const lower = cvText.toLowerCase();

  // 1. Auditoria de Dados de Contato (Peso: 25%)
  let contactsScore = 0;
  const hasEmail = ESSENTIAL_CONTACT_PATTERNS.email.test(cvText);
  const hasPhone = ESSENTIAL_CONTACT_PATTERNS.phone.test(cvText);
  const hasLinkedin = ESSENTIAL_CONTACT_PATTERNS.linkedin.test(cvText);

  if (hasEmail) contactsScore += 10;
  else issues.push({ severity: 'HIGH', rule: 'MISSING_EMAIL', message: 'E-mail de contato não identificado no texto do currículo.' });

  if (hasPhone) contactsScore += 8;
  else issues.push({ severity: 'HIGH', rule: 'MISSING_PHONE', message: 'Telefone de contato não identificado ou formato ilegível.' });

  if (hasLinkedin) {
    contactsScore += 7;
    strengths.push('Link do LinkedIn devidamente identificado para verificação rápida do recrutador.');
  } else {
    issues.push({ severity: 'MEDIUM', rule: 'MISSING_LINKEDIN', message: 'URL do LinkedIn ausente. Recrutadores usam o LinkedIn para checagem cruzada imediata.' });
  }

  // 2. Auditoria de Cabeçalhos de Seções Padronizadas (Peso: 35%)
  let sectionsFound = 0;
  for (const section of STANDARD_SECTIONS) {
    if (section.pattern.test(cvText)) {
      sectionsFound++;
    } else if (section.name.includes('Experiência') || section.name.includes('Formação')) {
      issues.push({
        severity: 'HIGH',
        rule: `MISSING_SECTION_${section.name.toUpperCase().replace(/\s+/g, '_')}`,
        message: `Seção fundamental '${section.name}' não foi reconhecida pelo parser. Use nomenclaturas padronizadas.`
      });
    }
  }
  const sectionsScore = Math.min(35, Math.round((sectionsFound / STANDARD_SECTIONS.length) * 35));
  if (sectionsFound >= 4) {
    strengths.push(`Estrutura de seções compatível: ${sectionsFound} de ${STANDARD_SECTIONS.length} seções padronizadas reconhecidas.`);
  }

  // 3. Auditoria de Métricas e Verbos de Ação (Peso: 30%)
  let metricsCount = 0;
  for (const p of METRIC_PATTERNS) {
    const matches = cvText.match(p) || [];
    metricsCount += matches.length;
  }

  let verbsCount = 0;
  for (const verb of ACTION_VERBS) {
    const regex = new RegExp(`\\b${verb}\\b`, 'gi');
    const matches = cvText.match(regex) || [];
    verbsCount += matches.length;
  }

  let metricsScore = 0;
  if (metricsCount >= 4) {
    metricsScore += 15;
    strengths.push(`Forte presença de dados quantificáveis: ${metricsCount} métricas/impactos numéricos identificados.`);
  } else if (metricsCount >= 2) {
    metricsScore += 10;
  } else {
    issues.push({
      severity: 'HIGH',
      rule: 'LOW_METRICS_COUNT',
      message: 'Poucas métricas quantitativas identificadas. Utilize o Método XYZ do Google (Conquistei [X], medido por [Y], realizando [Z]).'
    });
  }

  if (verbsCount >= 5) {
    metricsScore += 15;
    strengths.push(`Linguagem orientada a realizações: ${verbsCount} verbos de ação de forte impacto identificados.`);
  } else if (verbsCount >= 2) {
    metricsScore += 8;
  } else {
    issues.push({
      severity: 'MEDIUM',
      rule: 'WEAK_ACTION_VERBS',
      message: 'Poucos verbos de ação de impacto identificados. Evite descrições passivas como "responsável por".'
    });
  }

  // 4. Detecção de Keyword Stuffing (Penalidade)
  // Analisa repetição excessiva de palavras idênticas em densidade antinatural
  const words = lower.match(/\b[a-zà-ÿ]{4,}\b/g) || [];
  const freq = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  let stuffingPenalty = 0;
  const stuffedWords = [];
  const totalWords = words.length || 1;

  for (const [w, count] of Object.entries(freq)) {
    const density = count / totalWords;
    // Se uma palavra específica (exceto preposições/conjunções comuns) ultrapassar 4.5% de todo o texto
    if (count > 8 && density > 0.045 && !['para', 'com', 'pelo', 'sobre', 'experiência'].includes(w)) {
      stuffedWords.push(`${w} (${count}x)`);
      stuffingPenalty += 5;
    }
  }

  if (stuffedWords.length > 0) {
    issues.push({
      severity: 'HIGH',
      rule: 'KEYWORD_STUFFING_DETECTED',
      message: `Risco de penalidade por repetição artificial de palavras-chave: ${stuffedWords.join(', ')}. Contextualize em frases com conquistas.`
    });
  }

  // 5. Cálculo Final do Score Determinístico
  const rawScore = contactsScore + sectionsScore + metricsScore - stuffingPenalty;
  const deterministicScore = Math.max(10, Math.min(100, rawScore));

  return {
    deterministicScore,
    breakdown: {
      contactsScore, // max 25
      sectionsScore, // max 35
      metricsScore,  // max 30
      stuffingPenalty // dedução
    },
    metricsFound: metricsCount,
    actionVerbsFound: verbsCount,
    issues,
    strengths
  };
}

export default {
  evaluateDeterministicATS
};
