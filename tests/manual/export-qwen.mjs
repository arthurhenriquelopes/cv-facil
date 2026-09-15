import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '../output');

const cv = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'cv-groq-qwen.json'), 'utf8'));

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
      <div class="cv-name">${h.name || 'Arthur Henrique Lopes Feitosa'}</div>
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

async function exportPdf() {
  const html = renderCvHtml(cv, 'Groq Qwen 3.8 27B');
  const htmlPath = path.join(OUTPUT_DIR, 'cv-groq-qwen.html');
  const pdfPath = path.join(OUTPUT_DIR, 'cv-groq-qwen.pdf');
  fs.writeFileSync(htmlPath, html, 'utf8');

  const chromeExe = 'C:\\Users\\Arthur Henrique\\AppData\\Local\\ms-playwright\\chromium-1223\\chrome-win64\\chrome.exe';
  const launchOptions = fs.existsSync(chromeExe) ? { executablePath: chromeExe } : {};
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });
  await browser.close();
  console.log('✅ PDF Qwen salvo em:', pdfPath);
}
exportPdf().catch(console.error);
