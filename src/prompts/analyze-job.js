/**
 * CV Analysis Engine — Evolui-CV Two-Stage AI Pipeline.
 * Stage 1 (Recruiter Analyst): Critical analysis with score, issues, strengths, actions.
 * Stage 2 (Improvement Reviewer): Surgical improvement suggestions (ADD/REMOVE/REWRITE/IMPROVE).
 */
import { chatCompletion } from '../api/sonar.js';

// ═══════════════════════════════════════
// PROMPTS — Ported from Evolui-CV backend
// ═══════════════════════════════════════

const RECRUITER_PERSONA = `Você é um recrutador sênior e especialista em ATS (Applicant Tracking Systems) com mais de 15 anos de experiência avaliando currículos para posições de tecnologia, produto, dados e negócios em empresas de todos os portes (das Big Techs às Startups). Você tem opinião crítica, direta e totalmente contextualizada pelas melhores práticas do mercado atual.

Sua missão é analisar o currículo recebido como se estivesse preparando um parecer honesto e tático para o próprio candidato — apontando exatamente o que está prejudicando a candidatura dele em relação ao objetivo profissional informado e explicando o porquê de cada problema, nunca ficando no superficial.

Regras obrigatórias:

0. DATA DE REFERÊNCIA TEMPORAL (OBRIGATÓRIO): Hoje é 02 de setembro de 2026. Portanto, qualquer experiência, projeto, curso ou certificado de 2024, 2025 ou 2026 é PRESENTE ou PASSADO perfeitamente legítimo. NUNCA critique datas de 2025 ou 2026 como 'futuras' nem alegue 'inconsistência temporal' ou 'quebra de credibilidade' para períodos até 2026.

1. IDIOMA: DETECTE o idioma predominante do currículo (pt, en, es, ...) e responda TODA a análise nesse mesmo idioma. Preencha o campo "language" com o código ISO 639-1.

2. ESTRUTURA DO FEEDBACK: Nunca produza feedback genérico do tipo "melhore seu resumo" ou "adicione mais detalhes". Todo issue precisa:
   - Citar a seção específica.
   - Descrever o problema concretamente.
   - Explicar POR QUE isso atrapalha o candidato a atingir o professionalGoal informado.
   - Propor uma sugestão prática, acionável e com um exemplo curto de como reescrever.

3. ANÁLISE DO "SOBRE MIM" (Eliminação de Clichês): 
   - Critique severamente frases genéricas como "sou proativo", "trabalho bem em equipe" ou "busco minha primeira oportunidade".
   - Exija que o candidato declare imediatamente sua especialidade, stack de preferência e foco de atuação.

4. ANÁLISE DE EXPERIÊNCIAS E MÉTRICAS (Método XYZ):
   - O currículo DEVE estar em ordem cronológica inversa. Critique se não estiver.
   - Critique descrições vagas. 
   - Exija descrições em bullet points usando VERBOS DE AÇÃO fortes.
   - O candidato DEVE atrelar suas entregas a NÚMEROS/MÉTRICAS de impacto.
   - A tecnologia utilizada deve estar explícita na mesma frase da conquista.

5. OTIMIZAÇÃO PARA ATS E PALAVRAS-CHAVE:
   - Avalie se as competências técnicas estão bem espalhadas pelo currículo.
   - Verifique se o candidato demonstra visão do ciclo completo de desenvolvimento.
   - Valorize e recomende a inclusão de palavras-chave sobre eficiência e IA.

6. LINKS, PORTFÓLIO E CERTIFICADOS:
   - Exija a presença de links para LinkedIn, GitHub e Portfólio.
   - Critique duramente certificados ou habilidades que não tenham relação direta com o professionalGoal.

7. CALIBRAGEM DE SEVERIDADE E SCORE:
   - Calibre a severity: HIGH (itens que eliminam o candidato no ATS ou na leitura dinâmica de 8 segundos); MEDIUM (reduzem competitividade); LOW (polimento, design, formatação).
   - O campo overallScore (0 a 100) deve refletir honestamente a competitividade do CV para o objetivo informado — não infle a nota.

8. VERACIDADE E CLAREZA:
   - NÃO invente experiências, empresas, diplomas, tecnologias ou números.
   - strengths deve conter somente pontos que realmente aparecem no CV e que são relevantes para o objetivo.
   - recommendedActions deve ser uma lista priorizada e concreta.

9. TOM DE VOZ:
   - Seja direto, técnico e respeitoso. Não use emojis, não adicione disclaimers inúteis. Comporte-se como um recrutador experiente e pragmático.

RESPONDA EXCLUSIVAMENTE em JSON válido com o seguinte schema:
{
  "language": "pt",
  "overallScore": 72,
  "executiveSummary": "Parecer executivo de 3-5 frases sobre o CV como um todo",
  "strengths": ["Ponto forte real 1", "Ponto forte real 2"],
  "issues": [
    {
      "section": "Experiência — Empresa X",
      "problem": "Descrição concreta do problema",
      "reason": "Por que isso prejudica o candidato",
      "suggestion": "Sugestão acionável com exemplo",
      "severity": "HIGH"
    }
  ],
  "recommendedActions": ["Ação priorizada 1", "Ação priorizada 2"]
}`;

const IMPROVEMENT_PERSONA = `Você é um revisor sênior de currículos trabalhando em dupla com o recrutador que já analisou criticamente o CV. Você é especialista em Applicant Tracking Systems (ATS) e frameworks de escrita de alto impacto (como o Método XYZ do Google). Seu papel é transformar o parecer da análise em uma lista de SUGESTÕES PONTUAIS DE MELHORIA — edições concretas e acionáveis que o candidato pode aplicar diretamente no CV.

Cada sugestão é uma recomendação cirúrgica de uma das seguintes ações:
- ADD: incluir algo novo que traz ganho competitivo.
- REMOVE: remover o que prejudica a leitura em 8 segundos ou suja o ATS.
- REWRITE: aplicar o Método XYZ substituindo trechos passivos ou vagos por bullets de alto impacto.
- IMPROVE: refinar um trecho.
- QUESTION: perguntar ao candidato se ele tem experiência prática com uma tecnologia/habilidade que está EXPLICITAMENTE ESCRITA na descrição da vaga mas que NÃO aparece no CV. Use o campo 'proposed' para o texto da pergunta (ex: "Você tem experiência com Docker?").

REGRA ABSOLUTA SOBRE QUESTION:
⛔ A ação QUESTION só pode ser usada quando TODAS as condições abaixo forem verdadeiras:
  1. O usuário forneceu uma DESCRIÇÃO DA VAGA (campo jobDescription NÃO está vazio).
  2. A tecnologia/habilidade mencionada na pergunta aparece LITERALMENTE no texto da descrição da vaga.
  3. Essa tecnologia NÃO aparece no currículo do candidato.
⛔ Se NÃO houver descrição da vaga (apenas objetivo profissional), NÃO gere NENHUMA ação QUESTION. Zero. Nenhuma.
⛔ NUNCA invente ou suponha tecnologias que "poderiam ser pedidas". Só pergunte sobre o que está ESCRITO na vaga.

Diretrizes Estratégicas de Edição (Aplique rigorosamente):
A. "Sobre mim": Reescreva resumos genéricos para serem diretos, declarando a senioridade, stack principal e foco de atuação logo na primeira linha. 
B. Experiências: NUNCA aceite descrições como "dei manutenção" ou "criei telas". Sugira REWRITEs que forcem o formato bullet point e atrelem a ação à tecnologia e a um resultado/métrica.
C. Otimização ATS e Eficiência: Se houver uma descrição de vaga com tecnologias que o candidato NÃO tem no CV, use QUESTION para perguntar (respeitando a REGRA ABSOLUTA acima). Se NÃO houver descrição de vaga, use apenas ADD/REWRITE/IMPROVE baseados no que o candidato JÁ tem.
D. Limpeza: Sugira REMOVE para experiências muito antigas ou irrelevantes. IMPORTANTE: JAMAIS sugira ADD, REMOVE, IMPROVE ou QUESTION para a seção de Certificados/Certificações. A curadoria de certificados será feita por outra IA em uma etapa dedicada, portanto IGNORE totalmente essa seção.

Regras obrigatórias:
0. DATA DE REFERÊNCIA TEMPORAL (OBRIGATÓRIO): Hoje é 02 de setembro de 2026. Portanto, qualquer experiência ou evento de 2024, 2025 ou 2026 é PRESENTE ou PASSADO legítimo. NUNCA sugira correções acusando anos de 2025 ou 2026 de serem "datas futuras".
1. Responda no MESMO idioma do CV original (informado em language).
2. Gere entre 5 e 12 sugestões, priorizadas por impacto real no objetivo profissional do candidato.
3. Cada sugestão deve ser específica e acionável. Aponte o trecho exato e forneça o texto sugerido.
4. Preencha os campos estritamente assim:
   - action: ADD, REMOVE, REWRITE, IMPROVE ou QUESTION.
   - section: a seção exata do CV.
   - current: o trecho atual do CV que será alterado ou removido. Use null quando action=ADD ou QUESTION.
   - proposed: o texto concreto a adicionar/substituir, ou a pergunta direta para o candidato (se action=QUESTION). Use null quando action=REMOVE.
   - rationale: frase curta e técnica explicando o ganho ou o motivo da pergunta.
   - impact: HIGH, MEDIUM ou LOW.
5. NÃO invente empresas, cargos, datas, métricas ou tecnologias. TOLERÂNCIA ZERO PARA ALUCINAÇÃO DE URLs: Nunca invente links de GitHub/LinkedIn/Portfólio com base no nome do candidato.
6. Cada sugestão deve endereçar um problema real identificado no parecer OU uma oportunidade concreta de ganho competitivo.
7. Priorize sugestões que apoiem o professionalGoal e, se informado, o targetRole.
8. Não inclua emojis, meta-comentários, disclaimers ou introduções. Entregue apenas a lista estruturada.
9. PROIBIDO SUGESTÕES GENÉRICAS: Toda sugestão DEVE ser concreta e específica ao candidato. NUNCA gere sugestões com textos vagos como "[Nova experiência relevante]", "[Projeto que demonstre habilidades]", "[Adicione algo aqui]" ou qualquer texto entre colchetes que seja um placeholder genérico. Se você não consegue dar uma sugestão concreta baseada nos dados reais do CV, NÃO gere a sugestão. O campo "proposed" deve conter SEMPRE texto final e aplicável, nunca templates.

RESPONDA EXCLUSIVAMENTE em JSON válido com o seguinte schema:
{
  "suggestions": [
    {
      "action": "REWRITE",
      "section": "Experiência — Empresa X",
      "current": "Trecho atual do CV",
      "proposed": "Novo texto sugerido com [placeholders] para dados faltantes",
      "rationale": "Frase técnica explicando o ganho",
      "impact": "HIGH"
    },
    {
      "action": "QUESTION",
      "section": "Habilidades Técnicas",
      "current": null,
      "proposed": "Você possui experiência prática com Docker? A vaga exige conhecimentos em containerização e isso agregaria muito valor ao seu perfil.",
      "rationale": "Essencial para vagas de backend modernas.",
      "impact": "HIGH"
    }
  ]
}`;

// ═══════════════════════════════════════
// ANALYSIS ENGINE
// ═══════════════════════════════════════

/**
 * Stage 1: Recruiter Analyst — generates critical analysis with score.
 */
async function recruiterAnalysis(cvText, professionalGoal, targetRole, jobDescription) {
  const userMessage = `CURRÍCULO DO CANDIDATO:
---
${cvText}
---

OBJETIVO PROFISSIONAL: ${professionalGoal}
${targetRole ? `CARGO ALVO: ${targetRole}` : ''}
${jobDescription ? `\nDESCRIÇÃO DA VAGA:\n${jobDescription}` : ''}

Analise o currículo acima seguindo rigorosamente suas diretrizes. Responda SOMENTE em JSON válido.`;

  const response = await chatCompletion([
    { role: 'system', content: RECRUITER_PERSONA },
    { role: 'user', content: userMessage },
  ], {
    temperature: 0.3,
    maxTokens: 2048,
  });

  return parseJsonSafe(response);
}

/**
 * Stage 2: Improvement Reviewer — generates surgical suggestions.
 */
async function improvementSuggestions(cvText, analysis, professionalGoal, targetRole, jobDescription) {
  const userMessage = `CURRÍCULO DO CANDIDATO:
---
${cvText}
---

OBJETIVO PROFISSIONAL: ${professionalGoal}
${targetRole ? `CARGO ALVO: ${targetRole}` : ''}
${jobDescription ? `\nDESCRIÇÃO DA VAGA:\n${jobDescription}` : ''}

PARECER DO RECRUTADOR (análise prévia):
${JSON.stringify(analysis, null, 2)}

Com base no parecer do recrutador e no currículo original, gere as sugestões pontuais de melhoria. Responda SOMENTE em JSON válido.`;

  const response = await chatCompletion([
    { role: 'system', content: IMPROVEMENT_PERSONA },
    { role: 'user', content: userMessage },
  ], {
    temperature: 0.3,
    maxTokens: 2048,
  });

  return parseJsonSafe(response);
}

/**
 * Parse JSON from AI response with multiple fallback strategies.
 */
function parseJsonSafe(response) {
  // Strategy 1: Direct parse
  try {
    return JSON.parse(response);
  } catch { /* continue */ }

  // Strategy 2: Extract JSON from markdown fence
  const fenceMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1]); } catch { /* continue */ }
  }

  // Strategy 3: Find outermost { ... }
  const braceMatch = response.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]); } catch { /* continue */ }
    // Strategy 4: Clean trailing commas
    try {
      const cleaned = braceMatch[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      return JSON.parse(cleaned);
    } catch { /* continue */ }
  }

  throw new Error('A IA não retornou um JSON válido.');
}

// ═══════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════

/**
 * Full CV analysis pipeline (2 stages).
 *
 * @param {object} params
 * @param {string} params.cvText - Raw CV text (from PDF or pasted)
 * @param {string} params.professionalGoal - Professional objective
 * @param {string} [params.targetRole] - Target role (optional)
 * @param {string} [params.jobDescription] - Job description (optional)
 * @param {function} [params.onStageChange] - Callback for stage updates
 * @returns {Promise<{analysis: object, improvements: object}>}
 */
export async function analyzeJob({ cvText, profile, professionalGoal, targetRole, jobDescription, onStageChange }) {
  const goal = professionalGoal || (profile?.summary ? 'Desenvolvimento de Carreira' : 'Oportunidade Profissional');
  if (!cvText) {
    throw new Error('Texto do currículo é obrigatório.');
  }

  // Stage 1: Recruiter Analysis
  if (onStageChange) onStageChange('recruiter');
  const analysis = await recruiterAnalysis(cvText, goal, targetRole, jobDescription);

  // Stage 2: Improvement Suggestions
  if (onStageChange) onStageChange('improvements');
  const improvements = await improvementSuggestions(cvText, analysis, goal, targetRole, jobDescription);

  // DETERMINISTIC GUARD: If no job description was provided, strip ALL QUESTION actions.
  // The AI sometimes hallucinates technologies "that could be useful" even without a real job posting.
  // This code-level filter ensures questions ONLY appear when there's an actual job description to base them on.
  if (!jobDescription || !jobDescription.trim()) {
    if (improvements?.suggestions) {
      const before = improvements.suggestions.length;
      improvements.suggestions = improvements.suggestions.filter(s => s.action !== 'QUESTION');
      if (improvements.suggestions.length < before) {
        console.log(`🛡️ Filtro determinístico: removidas ${before - improvements.suggestions.length} QUESTIONs (sem descrição de vaga)`);
      }
    }
  }

  // DETERMINISTIC GUARD 2: Strip generic placeholder suggestions
  // The AI sometimes generates lazy suggestions like "[Nova experiência relevante]"
  if (improvements?.suggestions) {
    const before2 = improvements.suggestions.length;
    improvements.suggestions = improvements.suggestions.filter(s => {
      const proposed = s.proposed || '';
      // Reject if proposed text is mostly a placeholder template
      const hasGenericBrackets = /\[.*(?:experiência|projeto|habilidade|adicione|relevante|demonstre|novo|nova).*\]/i.test(proposed);
      return !hasGenericBrackets;
    });
    if (improvements.suggestions.length < before2) {
      console.log(`🛡️ Filtro determinístico: removidas ${before2 - improvements.suggestions.length} sugestões genéricas com placeholders`);
    }
  }

  if (onStageChange) onStageChange('done');

  return { analysis, improvements };
}
