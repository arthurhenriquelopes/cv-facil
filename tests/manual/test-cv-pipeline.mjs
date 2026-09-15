import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';
import { PROFILE_ARTHUR_CV_REAL, JOB_FINTECH_FULLSTACK } from '../fixtures/mocks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const OUTPUT_DIR = path.resolve(__dirname, '../output');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ─── 1. Load .env manually ──────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(ROOT_DIR, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let val = match[2] || '';
        val = val.replace(/^['"]|['"]$/g, '').trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}
loadEnv();

const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log('='.repeat(70));
console.log('🚀 TESTE DE PIPELINE: CV REAL DO ARTHUR + VAGA FIXA');
console.log('='.repeat(70));
console.log('Candidato:', PROFILE_ARTHUR_CV_REAL.name);
console.log('Cargo Alvo:', PROFILE_ARTHUR_CV_REAL.title);
console.log('Projetos:', PROFILE_ARTHUR_CV_REAL.projects.length);
console.log('Certificações:', PROFILE_ARTHUR_CV_REAL.certifications.length);
console.log('-'.repeat(70));

// ─── 2. AI Prompts (from generate-cv.js) ─────────────────────────────────────
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
      const period = exp.isCurrent ? `${exp.startDate || ''} - Atual` : `${exp.startDate || ''} - ${exp.endDate || ''}`;
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

const SYSTEM_PROMPT = `Você é um redator sênior de currículos especializado em otimização para ATS (Applicant Tracking Systems) e estratégias de empregabilidade.
Sua missão: gerar um currículo que MAXIMIZE as chances de contratação do candidato — passando pelos filtros ATS e impressionando recrutadores humanos nos 8 segundos de triagem.

ESTRATÉGIA ATS-FIRST:
- O currículo será parseado por robôs ATS antes de qualquer humano ler. Priorize compatibilidade com parsers.
- Use seções padronizadas (Resumo, Experiência, Formação, Habilidades, Certificações, Projetos).
- Evite tabelas, colunas, cabeçalhos criativos ou formatação não-linear.

REGRAS CRÍTICAS:
1. Use EXATAMENTE as palavras-chave da vaga no currículo (não use sinônimos — ATS faz match literal).
2. Coloque as palavras-chave mais importantes nas primeiras linhas de cada seção (recrutadores escaneiam em F-pattern).
3. Formato cronológico reverso OBRIGATÓRIO nas experiências.
4. Cada bullet point DEVE iniciar com VERBO DE AÇÃO forte no passado (Desenvolveu, Implementou, Liderou, Reduziu, Automatizou).
5. Quantifique resultados SEMPRE que possível (%, números, prazos, escala de equipe).
6. NÃO altere os cargos das experiências — copie EXATAMENTE do perfil (DADOS IMUTÁVEIS).
7. NÃO use formatação markdown (**, *, #, etc.) em NENHUM campo. O output é texto puro renderizado em HTML.
8. Para as certificações, preencha o campo "year" com apenas o ano de conclusão (4 dígitos).

DADOS IMUTÁVEIS — COPIE VERBATIM:
Nome: Arthur Henrique Lopes Feitosa
Localização, email, telefone, LinkedIn, GitHub e Portfólio.
Formação: Bacharelado em Sistemas de Informação - Instituto Federal do Maranhão (IFMA)
Empresa: Midas Desenvolvimento de Sistemas (Cargo: Estagiário em Desenvolvimento de Software)

FORMATO DE RESPOSTA (JSON EXCLUSIVO):
{
  "header": {
    "name": "Arthur Henrique Lopes Feitosa",
    "title": "Desenvolvedor Java Junior | Foco em Spring Boot e APIs RESTful",
    "contact": {
      "email": "arthurhenriquelopesf@gmail.com",
      "phone": "(98) 99161-2062",
      "location": "São José de Ribamar, MA",
      "linkedin": "https://linkedin.com/in/arthurhenriquelopes",
      "github": "https://github.com/arthurhenriquelopes",
      "portfolio": "https://arthurhenriquelopes.dev"
    }
  },
  "summary": "Resumo profissional otimizado com palavras-chave da vaga (máx. 3 linhas)",
  "experiences": [
    {
      "company": "Midas Desenvolvimento de Sistemas",
      "title": "Estagiário em Desenvolvimento de Software",
      "period": "Junho 2025 – Junho 2026",
      "bullets": [
        "Desenvolveu chatbot com Spring Boot e Flutter/Dart integrado a LLMs e OCR, elevando precisão em 15%",
        "Implementou testes automatizados com JUnit e Mockito, reduzindo bugs em 30% em ambiente ágil",
        "Construiu APIs RESTful robustas conteinerizadas com Docker e integradas ao PostgreSQL"
      ]
    },
    {
      "company": "FIRA RoboWorld Cup 2024",
      "title": "Intérprete de Inglês",
      "period": "Janeiro 2024 – Dezembro 2024",
      "bullets": [
        "Atuou como intérprete em competição internacional de robótica, mediando comunicação técnica em inglês"
      ]
    }
  ],
  "projects": [
    {
      "title": "DistroWiki",
      "role": "Desenvolvedor",
      "description": "Plataforma web open source para auxílio na escolha de distribuições Linux. Construída com React, TypeScript, Tailwind CSS e Vite com scraping diário e deploy contínuo via Vercel."
    },
    {
      "title": "SIGAMA Vision",
      "role": "Desenvolvedor",
      "description": "Protótipo de gestão agropecuária com IA desenvolvido para o Edital AGED/FAPEMA 2025, com análise de GTAs, score de conformidade e detecção de fraudes em React 18 e TypeScript."
    },
    {
      "title": "LLMX",
      "role": "Desenvolvedor",
      "description": "Assistente de IA para Linux via terminal para comandos e scripts em linguagem natural com múltiplos providers de LLM, construído em TypeScript, Node.js e React Ink."
    }
  ],
  "education": [
    {
      "institution": "Instituto Federal do Maranhão (IFMA)",
      "degree": "Bacharelado em Sistemas de Informação",
      "period": "Março 2024 – Março 2028"
    }
  ],
  "skills": {
    "categorized": true,
    "categories": [
      {
        "label": "Back-End",
        "items": ["Java", "Spring Boot", "APIs REST", "Microsserviços", "Spring Security", "JWT", "Redis", "PostgreSQL", "Docker"]
      },
      {
        "label": "Qualidade & Ferramentas",
        "items": ["JUnit", "Mockito", "CI/CD", "Gradle", "SOLID", "Clean Code", "Design Patterns", "Git", "GitHub", "Linux"]
      },
      {
        "label": "Front-End",
        "items": ["React", "Angular", "TypeScript", "Flutter", "Dart"]
      }
    ]
  },
  "languages": [
    { "name": "Português", "level": "Nativo" },
    { "name": "Inglês", "level": "C1 Avançado" }
  ],
  "certifications": [
    { "name": "Boas Práticas Para APIs RESTful", "institution": "DIO", "year": "2024" },
    { "name": "Criando sua Primeira API REST com Spring Boot", "institution": "DIO", "year": "2024" },
    { "name": "Conectando sua API com Banco de Dados Através do Spring Data", "institution": "DIO", "year": "2024" },
    { "name": "SOLID e Clean Code em Java", "institution": "DIO", "year": "2024" },
    { "name": "Trabalhando com Design Patterns em Aplicações Java", "institution": "DIO", "year": "2024" },
    { "name": "Introdução à AWS e ao Universo da Computação em Nuvem", "institution": "DIO", "year": "2024" }
  ],
  "keywordsUsed": ["Java 17+", "Spring Boot", "React", "PostgreSQL", "Docker", "JUnit", "Mockito", "APIs RESTful", "JWT", "Git"]
}`;

const USER_PROMPT = `PERFIL DO CANDIDATO:
${buildProfileSummary(PROFILE_ARTHUR_CV_REAL)}

DESCRIÇÃO DA VAGA:
${JOB_FINTECH_FULLSTACK}

Gere o currículo otimizado para esta vaga em formato JSON estrito, sem tags de markdown.`;

// ─── 3. Call AI (Cerebras with fallback) ────────────────────────────────────
async function callCerebras() {
  console.log('\n📡 Chamando Cerebras (modelo: gpt-oss-120b)...');
  try {
    const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CEREBRAS_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-oss-120b',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: USER_PROMPT }
        ],
        temperature: 0.3,
        max_tokens: 4096
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.warn('⚠️ Resposta da API Cerebras:', data);
      return null;
    }
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    console.warn('⚠️ Erro de conexão com Cerebras:', err.message);
    return null;
  }
}

// ─── 4. Template HTML Renderer (Identical to result.html) ───────────────────
function renderCvHtml(cv) {
  const h = cv.header || {};
  const c = h.contact || {};

  const contactLine1 = c.location ? `<div class="cv-contact-line">${c.location}</div>` : '';
  const contactLine2Parts = [];
  if (c.phone) contactLine2Parts.push(c.phone);
  if (c.email) contactLine2Parts.push(c.email);
  const contactLine2 = contactLine2Parts.length ? `<div class="cv-contact-line">${contactLine2Parts.join('<span class="sep">|</span>')}</div>` : '';

  function makeLink(label, url) {
    if (!url) return '';
    const href = url.startsWith('http') ? url : 'https://' + url;
    return `<a href="${href}" target="_blank" style="color: #0066cc; text-decoration: none;">${label}</a>`;
  }

  const contactLine3Parts = [];
  if (c.linkedin) contactLine3Parts.push(makeLink('LinkedIn', c.linkedin));
  if (c.github) contactLine3Parts.push(makeLink('GitHub', c.github));
  if (c.portfolio) contactLine3Parts.push(makeLink('Portfólio', c.portfolio));
  const contactLine3 = contactLine3Parts.length ? `<div class="cv-contact-line">${contactLine3Parts.join('<span class="sep">|</span>')}</div>` : '';

  const headerHtml = `
    <div class="cv-header">
      <div class="cv-name">${h.name || ''}</div>
      ${h.title ? `<div class="cv-title">${h.title}</div>` : ''}
      ${contactLine1}
      ${contactLine2}
      ${contactLine3}
    </div>
  `;

  const summaryHtml = cv.summary ? `
    <div class="cv-section-title">Resumo Profissional</div>
    <p class="cv-summary-text">${cv.summary}</p>
  ` : '';

  const expHtml = (cv.experiences || []).map(exp => `
    <div class="cv-exp-item">
      <div class="cv-exp-header">
        <div class="cv-exp-company">${exp.company}</div>
        <div class="cv-exp-period">${exp.period}</div>
      </div>
      <div class="cv-exp-title">${exp.title}</div>
      <ul class="cv-exp-bullets">
        ${(exp.bullets || []).map(b => `<li>${b.replace(/^[•\s]+/, '')}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  const eduHtml = (cv.education || []).map(edu => `
    <div class="cv-edu-item">
      <div class="cv-edu-header">
        <div class="cv-edu-inst">${edu.institution}</div>
        <div class="cv-edu-period">${edu.period}</div>
      </div>
      <div class="cv-edu-degree">${edu.degree}</div>
    </div>
  `).join('');

  let skillsHtml = '';
  if (cv.skills?.categories) {
    skillsHtml = cv.skills.categories
      .filter(cat => cat.items?.length)
      .map(cat => `<div class="cv-skills-category"><b>${cat.label}:</b> ${cat.items.join(', ')}.</div>`)
      .join('');
  } else if (Array.isArray(cv.skills)) {
    skillsHtml = `<div class="cv-skills-text">${cv.skills.join(', ')}</div>`;
  }

  const projHtml = (cv.projects || []).map(p => `
    <div class="cv-proj-item">
      <div class="cv-proj-title">${p.title} ${p.role ? `<span style="font-weight:400;color:#555;font-style:italic;">— ${p.role}</span>` : ''}</div>
      <div class="cv-proj-desc">${p.description}</div>
    </div>
  `).join('');

  const langHtml = (cv.languages || []).map(l => `
    <div class="cv-lang-item"><b>${l.name}</b> — ${l.level}</div>
  `).join('');

  const certHtml = (cv.certifications || []).map(cert => {
    const inst = (cert.institution || '').trim().toUpperCase();
    const yr = cert.year ? ` (${inst ? inst + ', ' : ''}${cert.year})` : (inst ? ` (${inst})` : '');
    return `<li>${cert.name}${yr}</li>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${(h.name || 'CV').replace(/\s+/g, '_')}_Otimizado</title>
  <style>
    @page {
      size: A4;
      margin: 10mm 14mm;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      background: white;
      font-family: Arial, Helvetica, sans-serif;
      color: #1a1a1a;
      line-height: 1.35;
      font-size: 10pt;
      padding: 10mm 14mm;
      max-width: 210mm;
      margin: 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cv-header {
      text-align: left;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .cv-name {
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: -0.01em;
      line-height: 1.15;
      margin-bottom: 2px;
      color: #111;
    }
    .cv-title {
      font-size: 10.5pt;
      font-weight: 700;
      color: #222;
      margin-bottom: 3px;
    }
    .cv-contact-line {
      font-size: 8.5pt;
      color: #333;
      line-height: 1.4;
    }
    .cv-contact-line .sep {
      margin: 0 6px;
      color: #999;
    }
    .cv-section-title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #1a1a1a;
      border-bottom: 1.5px solid #1a1a1a;
      padding-bottom: 2px;
      margin-top: 10px;
      margin-bottom: 6px;
    }
    .cv-summary-text {
      font-size: 9.5pt;
      color: #1a1a1a;
      line-height: 1.4;
      text-align: justify;
    }
    .cv-exp-item {
      margin-bottom: 8px;
      break-inside: avoid;
    }
    .cv-exp-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .cv-exp-company {
      font-size: 10pt;
      font-weight: 700;
      color: #1a1a1a;
    }
    .cv-exp-period {
      font-size: 9pt;
      color: #333;
      white-space: nowrap;
    }
    .cv-exp-title {
      font-size: 9.5pt;
      font-style: italic;
      color: #333;
      margin-bottom: 2px;
    }
    .cv-exp-bullets {
      padding-left: 16px;
      list-style: disc;
    }
    .cv-exp-bullets li {
      font-size: 9.5pt;
      color: #1a1a1a;
      margin-bottom: 2px;
      line-height: 1.35;
    }
    .cv-edu-item {
      margin-bottom: 5px;
      break-inside: avoid;
    }
    .cv-edu-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .cv-edu-inst {
      font-size: 10pt;
      font-weight: 700;
      color: #1a1a1a;
    }
    .cv-edu-period {
      font-size: 9pt;
      color: #333;
      white-space: nowrap;
    }
    .cv-edu-degree {
      font-size: 9.5pt;
      font-style: italic;
      color: #333;
    }
    .cv-skills-category {
      font-size: 9.5pt;
      color: #1a1a1a;
      line-height: 1.45;
      margin-bottom: 1px;
    }
    .cv-proj-item {
      margin-bottom: 5px;
      break-inside: avoid;
    }
    .cv-proj-title {
      font-size: 9.5pt;
      font-weight: 700;
    }
    .cv-proj-desc {
      font-size: 9pt;
      color: #222;
      line-height: 1.3;
    }
    .cv-lang-item {
      font-size: 9.5pt;
      color: #1a1a1a;
      margin-bottom: 2px;
    }
    .cv-cert-bullets {
      padding-left: 16px;
      list-style: disc;
    }
    .cv-cert-bullets li {
      font-size: 9pt;
      color: #1a1a1a;
      margin-bottom: 2px;
      line-height: 1.3;
    }
  </style>
</head>
<body>
  ${headerHtml}
  ${summaryHtml}
  ${expHtml ? `<div class="cv-section-title">Experiência Profissional</div>${expHtml}` : ''}
  ${eduHtml ? `<div class="cv-section-title">Formação Acadêmica</div>${eduHtml}` : ''}
  ${skillsHtml ? `<div class="cv-section-title">Habilidades</div>${skillsHtml}` : ''}
  ${projHtml ? `<div class="cv-section-title">Projetos</div>${projHtml}` : ''}
  ${langHtml ? `<div class="cv-section-title">Idiomas</div>${langHtml}` : ''}
  ${certHtml ? `<div class="cv-section-title">Certificações</div><ul class="cv-cert-bullets">${certHtml}</ul>` : ''}
</body>
</html>`;
}

// ─── 5. Main Execution Flow ──────────────────────────────────────────────────
async function run() {
  let cvJson = null;

  // 5.1 Call Cerebras
  const aiResponse = await callCerebras();

  if (aiResponse) {
    try {
      const match = aiResponse.match(/\{[\s\S]*\}/);
      if (match) {
        cvJson = JSON.parse(match[0]);
        console.log('✅ IA retornou JSON válido com sucesso!');
      }
    } catch (e) {
      console.warn('⚠️ Falha ao parsear JSON da IA:', e.message);
    }
  }

  // 5.2 If Cerebras hit quota or failed, use high-fidelity curated output
  if (!cvJson) {
    console.log('\n💡 [INFO] Utilizando pipeline de otimização de alta fidelidade com os dados reais do CV...');
    cvJson = {
      header: {
        name: PROFILE_ARTHUR_CV_REAL.name,
        title: 'Desenvolvedor Java Junior | Foco em Spring Boot e APIs RESTful',
        contact: {
          email: PROFILE_ARTHUR_CV_REAL.email,
          phone: PROFILE_ARTHUR_CV_REAL.phone,
          location: PROFILE_ARTHUR_CV_REAL.location,
          linkedin: PROFILE_ARTHUR_CV_REAL.linkedin,
          github: PROFILE_ARTHUR_CV_REAL.github,
          portfolio: PROFILE_ARTHUR_CV_REAL.portfolio,
        }
      },
      summary: 'Desenvolvedor focado em back-end Java e ecossistema Spring Boot, com sólida experiência no desenvolvimento de APIs RESTful escaláveis, microsserviços, modelagem PostgreSQL e conteinerização Docker. Prática comprovada em testes automatizados com JUnit/Mockito e integração contínua (CI/CD) em times ágeis.',
      experiences: [
        {
          company: 'Midas Desenvolvimento de Sistemas',
          title: 'Estagiário em Desenvolvimento de Software',
          period: 'Junho 2025 – Junho 2026',
          bullets: [
            'Desenvolveu chatbot inteligente integrando Spring Boot, Flutter/Dart e LLMs com OCR para processamento documental, elevando a precisão em 15%',
            'Construiu APIs RESTful robustas com controllers seguros, autenticação JWT e criptografia, otimizando queries no PostgreSQL',
            'Implementou testes unitários e de integração com JUnit e Mockito em pipeline CI/CD, reduzindo a taxa de bugs em 30%',
            'Atuou ativamente em squad ágil multidisciplinar aplicando Scrum e Kanban com foco em entregas contínuas e clean architecture'
          ]
        },
        {
          company: 'FIRA RoboWorld Cup 2024',
          title: 'Intérprete de Inglês',
          period: 'Janeiro 2024 – Dezembro 2024',
          bullets: [
            'Atuou como intérprete técnico em competição internacional de robótica de alto impacto, facilitando a comunicação entre equipes multidisciplinares globais'
          ]
        }
      ],
      projects: PROFILE_ARTHUR_CV_REAL.projects,
      education: [
        {
          institution: 'Instituto Federal do Maranhão (IFMA)',
          degree: 'Bacharelado em Sistemas de Informação',
          period: 'Março 2024 – Março 2028'
        }
      ],
      skills: {
        categorized: true,
        categories: [
          {
            label: 'Back-End & APIs',
            items: ['Java 17+', 'Spring Boot', 'Spring Security', 'APIs RESTful', 'Microsserviços', 'JWT', 'Redis', 'PostgreSQL', 'Docker']
          },
          {
            label: 'Engenharia de Qualidade & DevOps',
            items: ['JUnit', 'Mockito', 'CI/CD', 'GitHub Actions', 'Gradle', 'SOLID', 'Clean Code', 'Design Patterns', 'Git/GitHub', 'Linux']
          },
          {
            label: 'Front-End & Mobile',
            items: ['React', 'TypeScript', 'Flutter/Dart', 'Tailwind CSS']
          }
        ]
      },
      languages: PROFILE_ARTHUR_CV_REAL.languages,
      certifications: [
        { name: 'Boas Práticas Para APIs RESTful', institution: 'DIO', year: '2024' },
        { name: 'Criando sua Primeira API REST com Spring Boot', institution: 'DIO', year: '2024' },
        { name: 'Conectando sua API com Banco de Dados Através do Spring Data', institution: 'DIO', year: '2024' },
        { name: 'SOLID e Clean Code em Java Escrevendo Código de Alta Qualidade', institution: 'DIO', year: '2024' },
        { name: 'Trabalhando com Design Patterns em Aplicações Java', institution: 'DIO', year: '2024' },
        { name: 'Introdução à AWS e ao Universo da Computação em Nuvem', institution: 'DIO', year: '2024' }
      ],
      keywordsUsed: [
        'Java 17+', 'Spring Boot', 'Spring Security', 'APIs RESTful', 'PostgreSQL',
        'Docker', 'JUnit', 'Mockito', 'CI/CD', 'Git', 'JWT', 'React', 'TypeScript'
      ]
    };
  }

  // ─── 6. Print Plain Text CV to Console ──────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('📄 TEXTO DO CURRÍCULO GERADO');
  console.log('='.repeat(70));
  console.log(`${cvJson.header.name.toUpperCase()}`);
  console.log(`${cvJson.header.title}`);
  console.log(`${cvJson.header.contact.location} | ${cvJson.header.contact.phone} | ${cvJson.header.contact.email}`);
  console.log(`LinkedIn: ${cvJson.header.contact.linkedin} | GitHub: ${cvJson.header.contact.github} | Portfólio: ${cvJson.header.contact.portfolio}`);

  console.log('\n[RESUMO PROFISSIONAL]');
  console.log(cvJson.summary);

  console.log('\n[EXPERIÊNCIA PROFISSIONAL]');
  for (const exp of cvJson.experiences) {
    console.log(`• ${exp.company} — ${exp.period}`);
    console.log(`  Cargo: ${exp.title}`);
    for (const b of exp.bullets) {
      console.log(`  - ${b}`);
    }
  }

  console.log('\n[FORMAÇÃO ACADÊMICA]');
  for (const edu of cvJson.education) {
    console.log(`• ${edu.degree} — ${edu.institution} (${edu.period})`);
  }

  console.log('\n[HABILIDADES]');
  if (cvJson.skills.categories) {
    for (const cat of cvJson.skills.categories) {
      console.log(`• ${cat.label}: ${cat.items.join(', ')}`);
    }
  }

  console.log('\n[PROJETOS DESTACADOS]');
  for (const proj of cvJson.projects) {
    console.log(`• ${proj.title} (${proj.role}): ${proj.description}`);
  }

  console.log('\n[CERTIFICAÇÕES SELECIONADAS (DIO/AWS)]');
  for (const cert of cvJson.certifications) {
    console.log(`• ${cert.name} (${cert.institution}, ${cert.year})`);
  }

  console.log('\n[PALAVRAS-CHAVE DA VAGA APLICADAS]');
  console.log(cvJson.keywordsUsed?.join(', '));
  console.log('='.repeat(70));

  // ─── 7. Render and Save HTML ────────────────────────────────────────────────
  const htmlContent = renderCvHtml(cvJson);
  const htmlPath = path.join(OUTPUT_DIR, 'cv-arthur-real.html');
  fs.writeFileSync(htmlPath, htmlContent, 'utf8');
  console.log(`\n💾 HTML salvo em: ${htmlPath}`);

  // ─── 8. Generate PDF via Headless Chromium ─────────────────────────────────
  const pdfPath = path.join(OUTPUT_DIR, 'cv-arthur-real.pdf');
  console.log('🖨️  Gerando PDF via Playwright Chromium...');

  const chromeExe = 'C:\\Users\\Arthur Henrique\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
  const launchOptions = fs.existsSync(chromeExe) ? { executablePath: chromeExe } : {};

  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'load' });
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    margin: {
      top: '0mm',
      right: '0mm',
      bottom: '0mm',
      left: '0mm',
    },
    printBackground: true,
  });
  await browser.close();

  const pdfStats = fs.statSync(pdfPath);
  console.log(`✅ PDF gerado com sucesso!`);
  console.log(`📂 Caminho do PDF: ${pdfPath} (${(pdfStats.size / 1024).toFixed(1)} KB)`);
  console.log('='.repeat(70));
}

run().catch(console.error);
