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

// ─── 1. Load .env ────────────────────────────────────────────────────────────
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

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY || '';

// ─── 2. Build Prompts ────────────────────────────────────────────────────────
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

const SYSTEM_PROMPT = `Você é um redator sênior de currículos especializado em otimização para ATS (Applicant Tracking Systems).
Sua missão: gerar um currículo profissional em JSON que destaque o candidato para a vaga informada.

REGRAS:
1. Retorne APENAS um JSON válido, sem tags markdown ou explicações.
2. Inicie cada bullet com verbo de ação forte no passado (Desenvolveu, Implementou, Construiu, Otimizou).
3. Quantifique resultados com números e porcentagens sempre que possível.
4. Mantenha dados imutáveis: Nome (${PROFILE_ARTHUR_CV_REAL.name}), Empresa (${PROFILE_ARTHUR_CV_REAL.experiences[0].company}), Formação (${PROFILE_ARTHUR_CV_REAL.education[0].institution}).
5. Formato JSON:
{
  "header": { "name": "...", "title": "...", "contact": { "email": "...", "phone": "...", "location": "...", "linkedin": "...", "github": "...", "portfolio": "..." } },
  "summary": "...",
  "experiences": [ { "company": "...", "title": "...", "period": "...", "bullets": ["..."] } ],
  "projects": [ { "title": "...", "role": "...", "description": "..." } ],
  "education": [ { "institution": "...", "degree": "...", "period": "..." } ],
  "skills": { "categorized": true, "categories": [ { "label": "...", "items": ["..."] } ] },
  "languages": [ { "name": "...", "level": "..." } ],
  "certifications": [ { "name": "...", "institution": "...", "year": "..." } ]
}`;

const USER_PROMPT = `PERFIL DO CANDIDATO:
${buildProfileSummary(PROFILE_ARTHUR_CV_REAL)}

VAGA ALVO:
${JOB_FINTECH_FULLSTACK}

Gere o currículo otimizado em JSON estrito.`;

// ─── 3. HTML Renderer ────────────────────────────────────────────────────────
function renderCvHtml(cv, modelName) {
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
      <div class="cv-name">${h.name || PROFILE_ARTHUR_CV_REAL.name}</div>
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
  <title>CV_${(h.name || 'Arthur').replace(/\s+/g, '_')}_${modelName}</title>
  <style>
    @page { size: A4; margin: 10mm 14mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
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
    .cv-header { text-align: left; padding-bottom: 6px; margin-bottom: 8px; }
    .cv-name { font-size: 20pt; font-weight: 700; letter-spacing: -0.01em; line-height: 1.15; margin-bottom: 2px; color: #111; }
    .cv-title { font-size: 10.5pt; font-weight: 700; color: #222; margin-bottom: 3px; }
    .cv-contact-line { font-size: 8.5pt; color: #333; line-height: 1.4; }
    .cv-contact-line .sep { margin: 0 6px; color: #999; }
    .cv-section-title {
      font-size: 10pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #1a1a1a;
      border-bottom: 1.5px solid #1a1a1a;
      padding-bottom: 2px;
      margin-top: 10px;
      margin-bottom: 6px;
      break-after: avoid;
      page-break-after: avoid;
    }
    .cv-summary-text { font-size: 9.5pt; color: #1a1a1a; line-height: 1.4; text-align: justify; }
    .cv-exp-item { margin-bottom: 8px; break-inside: avoid; page-break-inside: avoid; }
    .cv-exp-header { display: flex; justify-content: space-between; align-items: baseline; }
    .cv-exp-company { font-size: 10pt; font-weight: 700; color: #1a1a1a; }
    .cv-exp-period { font-size: 9pt; color: #333; white-space: nowrap; }
    .cv-exp-title { font-size: 9.5pt; font-style: italic; color: #333; margin-bottom: 2px; }
    .cv-exp-bullets { padding-left: 16px; list-style: disc; }
    .cv-exp-bullets li { font-size: 9.5pt; color: #1a1a1a; margin-bottom: 2px; line-height: 1.35; }
    .cv-edu-item { margin-bottom: 5px; break-inside: avoid; page-break-inside: avoid; }
    .cv-edu-header { display: flex; justify-content: space-between; align-items: baseline; }
    .cv-edu-inst { font-size: 10pt; font-weight: 700; color: #1a1a1a; }
    .cv-edu-period { font-size: 9pt; color: #333; white-space: nowrap; }
    .cv-edu-degree { font-size: 9.5pt; font-style: italic; color: #333; }
    .cv-skills-category { font-size: 9.5pt; color: #1a1a1a; line-height: 1.45; margin-bottom: 1px; }
    .cv-proj-item { margin-bottom: 5px; break-inside: avoid; page-break-inside: avoid; }
    .cv-proj-title { font-size: 9.5pt; font-weight: 700; }
    .cv-proj-desc { font-size: 9pt; color: #222; line-height: 1.3; }
    .cv-lang-item { font-size: 9.5pt; color: #1a1a1a; margin-bottom: 2px; break-inside: avoid; }
    .cv-cert-bullets { padding-left: 16px; list-style: disc; }
    .cv-cert-bullets li { font-size: 9pt; color: #1a1a1a; margin-bottom: 2px; line-height: 1.3; }
    .model-watermark { font-size: 7.5pt; color: #888; text-align: right; margin-top: 15px; border-top: 1px dashed #ddd; padding-top: 4px; }
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
  <div class="model-watermark">Gerado por: ${modelName} | cv-facil</div>
</body>
</html>`;
}

// ─── 4. PDF Generator ────────────────────────────────────────────────────────
async function generatePdf(htmlContent, outputPath) {
  const chromeExe = 'C:\\Users\\Arthur Henrique\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
  const launchOptions = fs.existsSync(chromeExe) ? { executablePath: chromeExe } : {};
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'load' });
  await page.pdf({ path: outputPath, format: 'A4', printBackground: true });
  await browser.close();
}

// ─── 5. API Callers ──────────────────────────────────────────────────────────
async function callGroq(model) {
  const t0 = Date.now();
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT }
      ],
      temperature: 0.3,
      max_tokens: 4096
    })
  });
  const data = await res.json();
  const latency = Date.now() - t0;
  if (!res.ok) throw new Error(`Groq ${res.status}: ${JSON.stringify(data)}`);
  return { content: data.choices[0].message.content, latency, model };
}

async function callNvidia(model) {
  const t0 = Date.now();
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NVIDIA_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT }
      ],
      temperature: 0.3,
      max_tokens: 4096
    })
  });
  const data = await res.json();
  const latency = Date.now() - t0;
  if (!res.ok) throw new Error(`NVIDIA ${res.status}: ${JSON.stringify(data)}`);
  return { content: data.choices[0].message.content, latency, model };
}

function parseJsonSafe(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  return JSON.parse(match[0]);
}

// ─── 6. Evaluation Scorer ────────────────────────────────────────────────────
function evaluateCv(cv, latency, modelName) {
  let score = 0;
  const analysis = {
    model: modelName,
    latencyMs: latency,
    metricsCount: 0,
    actionVerbsCount: 0,
    hasProjects: false,
    hasCertifications: false,
    hasRealDegree: false,
    hasRealCompany: false,
    score: 0,
    summaryExcerpt: ''
  };

  if (!cv) return analysis;

  analysis.summaryExcerpt = (cv.summary || '').slice(0, 150) + '...';

  // Check metrics (% or numbers) in bullets
  const allBullets = (cv.experiences || []).flatMap(e => e.bullets || []);
  for (const b of allBullets) {
    if (/\b\d+(\.\d+)?%|\b\d+\b/.test(b)) {
      analysis.metricsCount++;
    }
    if (/^(Desenvolveu|Implementou|Construiu|Criou|Otimizou|Atuou|Liderou|Reduziu|Automatizou|Integrou|Projetou)/i.test(b.trim())) {
      analysis.actionVerbsCount++;
    }
  }

  // Factual checks
  const eduInst = cv.education?.[0]?.institution || '';
  const eduDeg = cv.education?.[0]?.degree || '';
  const expComp = cv.experiences?.[0]?.company || '';

  if (eduInst.includes('IFMA') || eduInst.includes('Federal do Maranhão')) {
    analysis.hasRealDegree = true;
    score += 20;
  }
  if (expComp.includes('Midas')) {
    analysis.hasRealCompany = true;
    score += 20;
  }
  if (cv.projects?.length >= 2) {
    analysis.hasProjects = true;
    score += 20;
  }
  if (cv.certifications?.length >= 3) {
    analysis.hasCertifications = true;
    score += 15;
  }

  score += Math.min(analysis.metricsCount * 5, 15);
  score += Math.min(analysis.actionVerbsCount * 5, 10);

  analysis.score = score;
  return analysis;
}

// ─── 7. Main Runner ──────────────────────────────────────────────────────────
async function run() {
  console.log('='.repeat(75));
  console.log('🏁 TESTE COMPARATIVO MULTI-MODELO (GROQ vs NVIDIA DEEPSEEK vs NVIDIA GPT)');
  console.log('='.repeat(75));

  const results = [];

  // Model 1: Groq with openai/gpt-oss-120b
  console.log('\n[1/3] 🟢 Executando Groq (openai/gpt-oss-120b)...');
  try {
    const res = await callGroq('openai/gpt-oss-120b');
    console.log(`✅ Groq respondeu em ${(res.latency / 1000).toFixed(2)}s`);
    const json = parseJsonSafe(res.content);
    if (json) {
      const html = renderCvHtml(json, 'Groq GPT-OSS 120B');
      const htmlPath = path.join(OUTPUT_DIR, 'cv-groq-gpt120b.html');
      const pdfPath = path.join(OUTPUT_DIR, 'cv-groq-gpt120b.pdf');
      fs.writeFileSync(htmlPath, html, 'utf8');
      await generatePdf(html, pdfPath);
      results.push({ name: 'Groq (openai/gpt-oss-120b)', json, eval: evaluateCv(json, res.latency, 'Groq gpt-oss-120b'), pdfPath, htmlPath });
    }
  } catch (err) {
    console.error('❌ Groq falhou:', err.message);
  }

  // Model 2: NVIDIA with deepseek-ai/deepseek-v4-flash-0731
  console.log('\n[2/3] 🔵 Executando NVIDIA (deepseek-ai/deepseek-v4-flash-0731)...');
  try {
    const res = await callNvidia('deepseek-ai/deepseek-v4-flash-0731');
    console.log(`✅ NVIDIA DeepSeek respondeu em ${(res.latency / 1000).toFixed(2)}s`);
    const json = parseJsonSafe(res.content);
    if (json) {
      const html = renderCvHtml(json, 'NVIDIA DeepSeek V4');
      const htmlPath = path.join(OUTPUT_DIR, 'cv-nvidia-deepseek.html');
      const pdfPath = path.join(OUTPUT_DIR, 'cv-nvidia-deepseek.pdf');
      fs.writeFileSync(htmlPath, html, 'utf8');
      await generatePdf(html, pdfPath);
      results.push({ name: 'NVIDIA (deepseek-v4-flash)', json, eval: evaluateCv(json, res.latency, 'NVIDIA DeepSeek V4'), pdfPath, htmlPath });
    }
  } catch (err) {
    console.error('❌ NVIDIA DeepSeek falhou:', err.message);
  }

  // Model 3: NVIDIA with openai/gpt-oss-120b (ou fallback selecionado)
  console.log('\n[3/3] 🟣 Executando NVIDIA (openai/gpt-oss-120b)...');
  try {
    const res = await callNvidia('openai/gpt-oss-120b');
    console.log(`✅ NVIDIA GPT-OSS 120B respondeu em ${(res.latency / 1000).toFixed(2)}s`);
    const json = parseJsonSafe(res.content);
    if (json) {
      const html = renderCvHtml(json, 'NVIDIA GPT-OSS 120B');
      const htmlPath = path.join(OUTPUT_DIR, 'cv-nvidia-gpt120b.html');
      const pdfPath = path.join(OUTPUT_DIR, 'cv-nvidia-gpt120b.pdf');
      fs.writeFileSync(htmlPath, html, 'utf8');
      await generatePdf(html, pdfPath);
      results.push({ name: 'NVIDIA (openai/gpt-oss-120b)', json, eval: evaluateCv(json, res.latency, 'NVIDIA GPT-OSS 120B'), pdfPath, htmlPath });
    }
  } catch (err) {
    console.error('❌ NVIDIA GPT-OSS 120B falhou:', err.message);
  }

  // ─── 8. Print Ranking Table ─────────────────────────────────────────────────
  console.log('\n' + '='.repeat(75));
  console.log('🏆 RANKING COMPARATIVO DOS RESULTADOS');
  console.log('='.repeat(75));

  results.sort((a, b) => b.eval.score - a.eval.score);

  results.forEach((r, idx) => {
    const e = r.eval;
    console.log(`\n#${idx + 1} - ${r.name}`);
    console.log(`  ⭐ Pontuação Geral: ${e.score}/100`);
    console.log(`  ⚡ Latência: ${(e.latencyMs / 1000).toFixed(2)}s`);
    console.log(`  📊 Métricas Quantificadas (%): ${e.metricsCount}`);
    console.log(`  🎯 Verbos de Ação em Bullets: ${e.actionVerbsCount}`);
    console.log(`  ✅ Fatos Corretos: IFMA: ${e.hasRealDegree ? 'SIM' : 'NÃO'} | Midas: ${e.hasRealCompany ? 'SIM' : 'NÃO'}`);
    console.log(`  📄 Resumo Gerado: "${e.summaryExcerpt}"`);
    console.log(`  📁 PDF Salvo: ${r.pdfPath}`);
  });

  console.log('\n' + '='.repeat(75));
}

run().catch(console.error);
