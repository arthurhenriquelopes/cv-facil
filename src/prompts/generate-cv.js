/**
 * CV Generation Prompt.
 * Generates an ATS-optimized CV using Perplexity Sonar.
 */
import { chatCompletion } from '../api/sonar.js';

import { selectBestCertifications } from './select-certifications.js';

// ═══════════════════════════════════════
// DETERMINISTIC SUGGESTION APPLICATOR
// ═══════════════════════════════════════
/**
 * Applies user-selected suggestions directly to the profile object.
 * This is DETERMINISTIC — no AI involved. The profile is mutated in-place
 * so the AI only sees the final, already-modified data.
 */
function applySuggestionsDeterministically(profile, suggestions) {
  for (const s of suggestions) {
    const section = (s.section || '').toLowerCase();

    switch (s.action) {
      case 'REWRITE':
      case 'IMPROVE': {
        if (!s.proposed) break;

        // Rewrite summary
        if (section.includes('resumo') || section.includes('summary') || section.includes('sobre')) {
          profile.summary = s.proposed;
          console.log(`  ✅ REWRITE Resumo aplicado`);
          break;
        }

        // Rewrite experience bullet/description
        if (section.includes('experiência') || section.includes('experiencia') || section.includes('experience')) {
          if (s.current && profile.experiences?.length) {
            for (const exp of profile.experiences) {
              if (exp.description && exp.description.includes(s.current)) {
                exp.description = exp.description.replace(s.current, s.proposed);
                console.log(`  ✅ REWRITE Experiência "${exp.company}" aplicado`);
                break;
              }
            }
          }
        }
        break;
      }

      case 'ADD': {
        if (!s.proposed) break;

        // Add skills
        if (section.includes('habilidade') || section.includes('skill') || section.includes('técnic')) {
          const newSkills = s.proposed.split(',').map(sk => sk.trim()).filter(Boolean);
          if (!profile.skills) profile.skills = [];
          for (const sk of newSkills) {
            if (!profile.skills.includes(sk)) {
              profile.skills.push(sk);
            }
          }
          console.log(`  ✅ ADD Skills: ${newSkills.join(', ')}`);
          break;
        }

        // Add to experience description
        if (section.includes('experiência') || section.includes('experiencia')) {
          if (profile.experiences?.length) {
            // Try to match experience by company name in section string
            const exp = profile.experiences.find(e =>
              section.includes((e.company || '').toLowerCase())
            ) || profile.experiences[0];
            if (exp) {
              exp.description = (exp.description || '') + '\n' + s.proposed;
              console.log(`  ✅ ADD Experiência "${exp.company}" aplicado`);
            }
          }
        }
        break;
      }

      case 'REMOVE': {
        // Remove certifications
        if (section.includes('certificat') || section.includes('certificaç')) {
          if (s.current && profile.certifications?.length) {
            const before = profile.certifications.length;
            profile.certifications = profile.certifications.filter(c => {
              const certName = (c.name || c.title || '').toLowerCase();
              const targetName = s.current.toLowerCase().trim();
              return !certName.includes(targetName) && !targetName.includes(certName);
            });
            console.log(`  ✅ REMOVE Certificação: "${s.current}" (${before} → ${profile.certifications.length})`);
          }
          break;
        }

        // Remove from experience
        if (s.current && (section.includes('experiência') || section.includes('experiencia'))) {
          if (profile.experiences?.length) {
            for (const exp of profile.experiences) {
              if (exp.description && exp.description.includes(s.current)) {
                exp.description = exp.description.replace(s.current, '').trim();
                console.log(`  ✅ REMOVE de Experiência "${exp.company}" aplicado`);
                break;
              }
            }
          }
        }
        break;
      }

      case 'QUESTION': {
        // User confirmed "Sim, eu possuo" — extract skill from question and add
        if (s.proposed) {
          // Extract technology name from question like "Você possui experiência com Docker?"
          const match = s.proposed.match(/(?:com|em|de)\s+([^?]+)/i);
          if (match) {
            const skillName = match[1].replace(/[?.!]/g, '').trim();
            if (!profile.skills) profile.skills = [];
            if (!profile.skills.includes(skillName)) {
              profile.skills.push(skillName);
              console.log(`  ✅ QUESTION → Skill adicionada: "${skillName}"`);
            }
          }
        }
        break;
      }

      default:
        console.warn(`  ⚠️ Ação desconhecida: ${s.action}`);
    }
  }
}

/**
 * Build a clean, readable profile summary for the AI (no raw JSON).
 */
function buildProfileSummary(profile) {
  const parts = [];
  if (profile.name) parts.push(`Nome: ${profile.name}`);
  if (profile.email) parts.push(`Email: ${profile.email}`);
  if (profile.phone) parts.push(`Telefone: ${profile.phone}`);
  if (profile.location) parts.push(`Localização: ${profile.location}`);
  if (profile.linkedin) parts.push(`LinkedIn: ${profile.linkedin}`);
  if (profile.github) parts.push(`GitHub: ${profile.github}`);
  if (profile.portfolio) parts.push(`Portfólio: ${profile.portfolio}`);
  if (profile.summary) parts.push(`Resumo atual: ${profile.summary}`);

  if (profile.experiences?.length) {
    parts.push('\nExperiências:');
    profile.experiences.forEach(exp => {
      const period = exp.isCurrent
        ? `${exp.startDate || ''} - Atual`
        : `${exp.startDate || ''} - ${exp.endDate || ''}`;
      parts.push(`  - ${exp.title || 'Cargo'} em ${exp.company || 'Empresa'} (${period})`);
      if (exp.description) parts.push(`    ${exp.description}`);
    });
  }

  if (profile.education?.length) {
    parts.push('\nFormação:');
    profile.education.forEach(edu => {
      const period = `${edu.startDate || ''} - ${edu.endDate || ''}`;
      parts.push(`  - ${edu.degree || 'Curso'} em ${edu.institution || 'Instituição'} (${period})`);
    });
  }

  if (profile.skills?.length) {
    parts.push(`\nHabilidades: ${profile.skills.join(', ')}`);
  }

  if (profile.languages?.length) {
    parts.push('\nIdiomas:');
    profile.languages.forEach(lang => {
      parts.push(`  - ${lang.name || ''}: ${lang.level || ''}`);
    });
  }

  if (profile.projects?.length) {
    parts.push('\nProjetos:');
    profile.projects.forEach(proj => {
      parts.push(`  - ${proj.title || 'Projeto'} (${proj.role || ''}): ${proj.description || ''}`);
    });
  }

  if (profile.certifications?.length) {
    parts.push('\nCertificações:');
    profile.certifications.forEach(cert => {
      const year = cert.date ? ` (Ano: ${cert.date})` : '';
      parts.push(`  - ${cert.name || cert.title || 'Certificação'} - Emissor: ${cert.issuer || cert.institution || ''}${year}`);
    });
  }

  return parts.join('\n');
}

/**
 * Build focus-specific instructions that structurally change the output.
 */
function buildFocusInstructions(focus) {
  switch (focus) {
    case 'results':
      return `FOCO: RESULTADOS E CONQUISTAS (modo ativado)
REGRAS ESTRUTURAIS PARA ESTE FOCO:
- TODOS os bullet points DEVEM seguir o formato: "• [Verbo de ação] + [o que fez] + [resultado quantificado]"
- CADA bullet OBRIGATORIAMENTE deve conter pelo menos 1 métrica (%, R$, quantidade, prazo, escala)
- Se o candidato não forneceu números, ESTIME métricas razoáveis baseadas no contexto (ex: "equipe de 5+" ou "redução de ~20%")
- O resumo profissional DEVE abrir com a conquista mais impactante
- Priorize experiências que tenham potencial para métricas sobre as puramente descritivas
- No JSON, inclua o campo "resultFormat": true para sinalizar ao renderer`;

    case 'skills':
      return `FOCO: HABILIDADES TÉCNICAS (modo ativado)
REGRAS ESTRUTURAIS PARA ESTE FOCO:
- Reduza os bullets de experiência para MÁXIMO 2 por cargo (apenas os mais relevantes)
- EXPANDA a seção de skills: inclua no mínimo 12-15 skills organizáveis por categoria
- Cada bullet de experiência DEVE mencionar pelo menos 2 skills/ferramentas técnicas
- O resumo profissional DEVE listar as 5 principais competências técnicas em sequência
- Priorize termos técnicos específicos sobre descrições genéricas
- No JSON, inclua o campo "resultFormat": false`;

    case 'experiences':
    default:
      return `FOCO: EXPERIÊNCIAS RELEVANTES (modo padrão)
REGRAS ESTRUTURAIS PARA ESTE FOCO:
- Máximo 4 bullets por experiência, detalhando responsabilidades e impacto
- Conecte cada experiência diretamente com os requisitos da vaga
- Use verbos de ação fortes no início de cada bullet
- O resumo profissional DEVE destacar os anos de experiência e a área principal
- No JSON, inclua o campo "resultFormat": false`;
  }
}

/**
 * Attempt to parse JSON from a response string, with progressively
 * more permissive strategies.
 */
function parseJsonResponse(response) {
  if (typeof response !== 'string') return null;
  // Strip thinking blocks from reasoning models
  response = response
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '')
    .trim();

  // Strategy 1: Match the outermost { ... }
  const match1 = response.match(/\{[\s\S]*\}/);
  if (match1) {
    try { return JSON.parse(match1[0]); } catch { /* try next */ }
  }

  // Strategy 2: Try to find JSON between markdown code fences
  const match2 = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (match2) {
    try { return JSON.parse(match2[1]); } catch { /* try next */ }
  }

  // Strategy 3: Strip common trailing issues (extra commas, trailing text)
  if (match1) {
    try {
      const cleaned = match1[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      return JSON.parse(cleaned);
    } catch { /* give up */ }
  }

  return null;
}

/**
 * Generate an optimized CV.
 * @param {object} params
 * @param {object} params.profile - User profile
 * @param {string} params.jobDescription - Job description text
 * @param {string} params.goal - Goal chosen by user
 * @param {string} params.focus - 'experiences' | 'skills' | 'results'
 * @param {string} params.template - 'modern' | 'classic'
 * @param {object} params.analysis - Result from analyzeJob (new format: {analysis, improvements})
 * @param {Array} params.selectedSuggestions - User-selected improvement suggestions
 * @returns {Promise<object>} Generated CV data
 */
export async function generateCV({ profile, jobDescription, focus, template, analysis, selectedSuggestions = [] }) {

  // ═══ CERTIFICATE SELECTOR AGENT ═══
  // Priority: use pre-selected certs from step-cert-review if available
  let workingProfile = { ...profile };
  let certSelectionResult = null;

  const state = await import('../lib/store.js').then(m => m.getState());

  if (state.selectedCertifications) {
    // Certs already curated by the review step — use them directly
    workingProfile.certifications = state.selectedCertifications;
    console.log(`🎯 Usando ${state.selectedCertifications.length} certificados pré-selecionados na etapa de revisão`);
  } else if (profile.certifications?.length > 12) {
    // Fallback: AI picks the best 5-12 inline (backward compatibility)
    try {
      certSelectionResult = await selectBestCertifications({
        certifications: profile.certifications,
        professionalGoal: state.professionalGoal || '',
        targetRole: state.targetRole || '',
        jobDescription: jobDescription || '',
      });
      workingProfile.certifications = certSelectionResult.filtered;
      console.log(
        `🎯 Agente de Certificados: ${profile.certifications.length} → ${certSelectionResult.filtered.length} selecionadas`,
        certSelectionResult.selected?.map(s => `✓ ${s.title} (${s.reason})`),
        certSelectionResult.dropped?.map(d => `✗ ${d.title} (${d.reason})`)
      );
    } catch (err) {
      console.warn('Certificado selector falhou, usando todas:', err.message);
      // Fallback: use all certifications
    }
  }

  // ═══ DETERMINISTIC SUGGESTION APPLICATION ═══
  // Apply user-selected suggestions directly to the profile data.
  // The AI never sees the suggestions — it only sees the already-modified profile.
  if (selectedSuggestions.length > 0) {
    console.log(`🔧 Aplicando ${selectedSuggestions.length} sugestões deterministicamente no perfil...`);
    applySuggestionsDeterministically(workingProfile, selectedSuggestions);
  }

  // Extract intelligence from the new Evolui-CV analysis format
  const recruiterAnalysis = analysis?.analysis || {};
  const overallScore = recruiterAnalysis.overallScore || 0;
  const issues = recruiterAnalysis.issues || [];
  const strengths = recruiterAnalysis.strengths || [];
  const recommendedActions = recruiterAnalysis.recommendedActions || [];
  const executiveSummary = recruiterAnalysis.executiveSummary || '';

  const focusInstructions = buildFocusInstructions(focus);

  const systemPrompt = `Você é um redator sênior de currículos especializado em otimização para ATS (Applicant Tracking Systems) e estratégias de empregabilidade.
Sua missão: gerar um currículo que MAXIMIZE as chances de contratação do candidato — passando pelos filtros ATS e impressionando recrutadores humanos nos 8 segundos de triagem.

ESTRATÉGIA ATS-FIRST:
- O currículo será parseado por robôs ATS antes de qualquer humano ler. Priorize compatibilidade com parsers.
- Use seções padronizadas (Resumo, Experiência, Formação, Habilidades, Certificações) — nomes que ATS reconhece.
- Evite tabelas, colunas, cabeçalhos criativos ou formatação não-linear.

REGRAS CRÍTICAS:
1. Use EXATAMENTE as palavras-chave da vaga no currículo (não use sinônimos — ATS faz match literal).
2. Coloque as palavras-chave mais importantes nas primeiras linhas de cada seção (recrutadores escaneiam em F-pattern).
3. Formato cronológico reverso OBRIGATÓRIO nas experiências.
4. Cada bullet point DEVE iniciar com VERBO DE AÇÃO forte no passado (Desenvolveu, Implementou, Liderou, Reduziu, Automatizou).
5. Quantifique resultados SEMPRE que possível (%, R$, números, prazos, escala de equipe).
6. Se o candidato não forneceu métricas, ESTIME métricas conservadoras e plausíveis (ex: "equipe de 5+", "redução de ~15%").
7. NÃO altere os cargos das experiências — copie EXATAMENTE do perfil (veja seção DADOS IMUTÁVEIS).
8. NÃO use formatação markdown (**, *, #, etc.) em NENHUM campo. O output é texto puro renderizado em HTML.
9. Para as certificações, preencha o campo "year" com apenas o ano de conclusão (4 dígitos). NUNCA inclua o mês, dia ou texto descritivo.

REGRAS DE KEYWORDS E HABILIDADES (HALUCINAÇÃO ZERO):
1. RESUMO PROFISSIONAL E EXPERIÊNCIAS: Otimize os textos usando as keywords da vaga, MAS APENAS se houver conexão real e lógica com o que o candidato já fez. NÃO invente que o candidato usou ferramentas não citadas.
2. LISTA DE SKILLS (HABILIDADES): VOCÊ É ESTRITAMENTE PROIBIDO de adicionar habilidades, ferramentas ou tecnologias que NÃO estejam explicitamente no "PERFIL DO CANDIDATO" ou nas "EDIÇÕES APROVADAS".
3. Se a vaga pede certas tecnologias (ex: AWS, Grafana, Quarkus), mas o candidato NÃO as possui no perfil e elas não aparecem nas "EDIÇÕES APROVADAS", você NÃO DEVE incluir essas palavras no currículo. O usuário já passou por uma triagem e NEGOU ter essas habilidades. Inventá-las é uma VIOLAÇÃO GRAVE.
4. O array "injectedSkills" só deve conter itens se eles vieram das "EDIÇÕES APROVADAS". Caso contrário, deixe-o vazio.
5. REGRA DE COERÊNCIA: Nunca invente experiências ou conhecimentos. O candidato será testado na entrevista.

ESTRATÉGIA DE MÁXIMA EMPREGABILIDADE:
- Enfatize prontidão, impacto imediato e competência demonstrada para a vaga.
- Destaque habilidades transferíveis que se aplicam ao cargo alvo.
- Use terminologia do mercado atual (metodologias ágeis, CI/CD, cloud, IA quando aplicável).
- Priorize experiências e skills mais recentes e relevantes para a vaga.
- Conecte cada experiência diretamente com os requisitos da vaga.
- Inclua soft skills estratégicas implicitamente nos bullets (liderança, comunicação, resolução de problemas) através de exemplos concretos, não declarações genéricas.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DADOS IMUTÁVEIS — NUNCA ALTERE ESTES CAMPOS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATA DE REFERÊNCIA: Hoje é 02 de setembro de 2026. Datas de 2024, 2025 e 2026 são recentes e legítimas.
Nome, email, telefone, localização, nome das empresas anteriores, CARGOS DAS EXPERIÊNCIAS,
nome dos cursos e instituições de ensino são FATOS VERIFICÁVEIS. Copie-os LITERALMENTE do perfil.

✗ ALUCINAÇÃO (proibido): Candidato tem "Sistemas de Informação" → output diz "Ciência da Computação"
✗ ALUCINAÇÃO (proibido): Candidato tem "IFMA" → output diz "Universidade Federal do Maranhão"
✗ ALUCINAÇÃO (proibido): Cargo é "Estagiário de Desenvolvimento Full Stack" → output diz "Desenvolvedor Java Estagiário"
✓ CORRETO: Copie EXATAMENTE o cargo, curso, instituição, empresa e informações de projetos como estão no perfil.

Esta regra se aplica a: nome completo, CARGOS, empresas, cursos, instituições, datas, e título/papel/descrição de projetos.

${focusInstructions}

RESTRIÇÕES DE TAMANHO:
- Máximo 1 página A4 (guia para concisão, não regra absoluta).
- NUNCA REMOVA NENHUMA EXPERIÊNCIA DO CANDIDATO por conta própria, a menos que haja uma EDIÇÃO APROVADA mandando remover.
- Resumo profissional: máximo 3 linhas impactantes.
- Seja conciso, direto e orientado a resultados.

CALIBRAÇÃO DE SENIORIDADE NO TÍTULO (header.title):
O campo "title" é o subtítulo do CV (ex: "Desenvolvedor Java Full Stack"). Ele DEVE refletir
o nível REAL de experiência do candidato. Regras:
- Se o candidato é estagiário ou tem <1 ano de experiência: use termos como "Desenvolvedor Junior",
  "Desenvolvedor em Formação", "Estagiário de [Área]". NUNCA use "Especialista", "Sênior", "Expert".
- Se o candidato tem 1-3 anos: pode usar "Desenvolvedor [Área]" sem qualificador de senioridade.
- Se o candidato tem 3-5 anos: pode usar "Desenvolvedor Pleno" ou equivalente.
- Se o candidato tem 5+ anos: pode usar "Especialista", "Sênior", etc.
- O título pode conter keywords da vaga (ex: "Microsserviços", "APIs RESTful") mas o nível
  de senioridade DEVE ser honesto.
✗ PROIBIDO: Estagiário com título "Especialista em Microsserviços e APIs RESTful"
✓ CORRETO: Estagiário com título "Desenvolvedor Java Junior | Foco em Microsserviços e APIs RESTful"

FORMATO DE RESPOSTA (JSON):
{
  "header": {
    "name": "Nome Completo",
    "title": "Título profissional calibrado ao nível real + keywords da vaga",
    "contact": { "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": "" }
  },
  "summary": "Resumo profissional otimizado com palavras-chave da vaga (máx. 3 linhas)",
  "experiences": [
    {
      "company": "Empresa, Cidade, UF",
      "title": "Cargo (copie EXATAMENTE do perfil)",
      "period": "Mês Ano — Mês Ano",
      "bullets": ["Verbo de ação + o que fez + resultado quantificado + keyword integrada"]
    }
  ],
  "projects": [
    {
      "title": "Nome do Projeto",
      "role": "Papel/Cargo (copie EXATAMENTE do perfil)",
      "description": "Descrição do projeto (copie EXATAMENTE do perfil, não altere ou resuma)"
    }
  ],
  "education": [
    {
      "institution": "Instituição (SIGLA)",
      "degree": "Curso",
      "period": "Mês Ano — Mês Ano"
    }
  ],
  "skills": {
    "categorized": true,
    "categories": [
      { "label": "Nome da Categoria (ex: Back-End)", "items": ["Habilidade Real do Perfil 1", "Habilidade Real do Perfil 2"] },
      { "label": "Nome da Categoria (ex: Ferramentas)", "items": ["Outra Habilidade Real 1", "Outra Habilidade Real 2"] }
    ]
  },
  "injectedSkills": ["apenas skills aprovadas pelo usuario em edicoes"],
  "languages": [{ "name": "Português", "level": "Nativo" }],
  "certifications": [{ "name": "Nome do Certificado", "institution": "Instituição Emissora", "year": "Ano de conclusão" }],
  "keywordsUsed": ["lista de todas as keywords da vaga usadas no CV"],
  "resultFormat": false
}

IMPORTANTE SOBRE SKILLS:
- ATENÇÃO: As categorias e skills no JSON acima são APENAS EXEMPLOS. Você DEVE extrair as habilidades REAIS do perfil do candidato e criar categorias lógicas. NUNCA copie habilidades do exemplo para o output final a menos que o candidato as possua.
- Se a vaga for de TI/Desenvolvimento/Engenharia de Software, retorne skills.categorized = true e agrupe as habilidades reais em categorias lógicas.
- Se a vaga NÃO for de TI, retorne skills.categorized = false e coloque tudo em uma única categoria com label "Competências".
- Cada categoria deve ter um "label" (nome) e "items" (array de strings).`;

  const profileSummary = buildProfileSummary(workingProfile);

  const userMessage = `PERFIL DO CANDIDATO:
${profileSummary}

DESCRIÇÃO DA VAGA:
${jobDescription}

═══════════════════════════════════════
INTELIGÊNCIA ATS (use estas informações para otimizar o CV):
═══════════════════════════════════════

SCORE ATUAL DO CV: ${overallScore}/100
PARECER DO RECRUTADOR: ${executiveSummary}

PONTOS FORTES IDENTIFICADOS: ${JSON.stringify(strengths)}
→ Mantenha e destaque estes pontos no CV.

${certSelectionResult ? `🎯 CERTIFICAÇÕES CURADAS POR IA (use SOMENTE estas no CV):\n${certSelectionResult.selected?.map(s => `  ✓ ${s.title} — ${s.reason}`).join('\n') || 'Nenhuma selecionada'}\n${certSelectionResult.dropped?.length ? `  Descartadas: ${certSelectionResult.dropped.map(d => d.title).join(', ')}` : ''}` : ''}

Meta: Elevar o score para 85%+ após a otimização.

🔒 ÂNCORA DE DADOS IMUTÁVEIS — COPIE VERBATIM NO JSON:
Nome: ${profile.name || ''}
Email: ${profile.email || ''}
Telefone: ${profile.phone || ''}
Localização: ${profile.location || ''}
LinkedIn: ${profile.linkedin || ''}
GitHub: ${profile.github || ''}
Portfólio: ${profile.portfolio || ''}
${(profile.education || []).length ? `Formação (copie degree e institution EXATAMENTE assim):\n${(profile.education || []).map(e => `  degree="${e.degree}" | institution="${e.institution}" | period="${e.startDate || ''}–${e.endDate || ''}"`).join('\n')}` : ''}
${(profile.experiences || []).length ? `Empresas (copie company e title EXATAMENTE assim):\n${(profile.experiences || []).map(e => `  company="${e.company}" | title="${e.title}"`).join('\n')}` : ''}
${(workingProfile.certifications || []).length ? `\n🔒 CERTIFICAÇÕES OBRIGATÓRIAS — COPIE TODAS, SEM EXCEÇÃO:\nO usuário já passou por uma curadoria de certificados. A lista abaixo é FINAL e IMUTÁVEL. Você DEVE incluir TODAS no JSON de saída, sem adicionar nem remover nenhuma:\n${workingProfile.certifications.map((c, i) => `  ${i + 1}. name="${c.name || c.title}" | institution="${c.issuer || c.institution || ''}" | year="${c.date || c.year || ''}"`).join('\n')}` : ''}

Gere o currículo otimizado em formato JSON. Respeite as restrições de tamanho.`;

  // Primary: Gemini 2.5 Flash (best prose in Portuguese)
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  let response, parsed;

  // Attempt 1: Default configuration
  try {
    response = await chatCompletion(messages, { temperature: 0.4, maxTokens: 6000 });
    parsed = parseJsonResponse(response);
  } catch (err) {
    console.warn('Attempt 1 failed:', err.message);
  }

  // Attempt 2: Higher temperature and more tokens for fallback
  if (!parsed) {
    try {
      console.warn('Trying Attempt 2 with different settings...');
      response = await chatCompletion(messages, { temperature: 0.6, maxTokens: 8000 });
      parsed = parseJsonResponse(response);
    } catch (err) {
      console.warn('Attempt 2 failed:', err.message);
    }
  }


  if (!parsed) {
    console.error('Failed to parse CV response after retry:', response);
    throw new Error('Erro ao gerar currículo: a IA não retornou um JSON válido após 2 tentativas.');
  }

  // DETERMINISTIC GUARD: Force exact text to prevent AI hallucination or unapproved rewrites
  const hasSummaryEdit = selectedSuggestions.some(s => 
    (s.section || '').toLowerCase().includes('resumo') && s.action === 'REWRITE'
  );
  if (workingProfile.summary && !hasSummaryEdit) {
    parsed.summary = workingProfile.summary;
  }

  if (workingProfile.certifications && workingProfile.certifications.length > 0) {
    parsed.certifications = workingProfile.certifications.map(c => ({
      name: c.name || c.title || '',
      institution: c.issuer || c.institution || '',
      year: c.date ? c.date.substring(0, 4) : (c.year || '')
    }));
  }

  return parsed;
}
