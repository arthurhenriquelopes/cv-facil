import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from '@playwright/test';
import { PROFILE_ARTHUR_CV_REAL, JOB_FINTECH_FULLSTACK } from '../fixtures/mocks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '../output');

const SYSTEM_PROMPT = `Você é um redator sênior de currículos especializado em otimização para ATS.
Gere um currículo profissional em JSON que destaque o candidato para a vaga informada.
REGRAS:
1. Retorne APENAS um JSON válido, sem tags markdown ou explicações.
2. Inicie cada bullet com verbo de ação forte no passado (Desenvolveu, Implementou, Construiu, Otimizou).
3. Quantifique resultados com números e porcentagens.
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

const USER_PROMPT = `PERFIL:
Nome: ${PROFILE_ARTHUR_CV_REAL.name}
Email: ${PROFILE_ARTHUR_CV_REAL.email}
Telefone: ${PROFILE_ARTHUR_CV_REAL.phone}
Localização: ${PROFILE_ARTHUR_CV_REAL.location}
LinkedIn: ${PROFILE_ARTHUR_CV_REAL.linkedin}
GitHub: ${PROFILE_ARTHUR_CV_REAL.github}
Habilidades: ${PROFILE_ARTHUR_CV_REAL.skills.join(', ')}
Experiências: Midas Desenvolvimento de Sistemas (06/2025 - Atual) - Estagiário em Desenvolvimento de Software. Desenvolveu chatbot inteligente com Spring Boot e Flutter/Dart, aumentando a interação em 20%; Desenvolveu telas mobile e integrou LLM para OCR, elevando precisão em 15%; Implementou testes automatizados reduzindo bugs em 30%.
Formação: Instituto Federal do Maranhão (IFMA) - Bacharelado em Sistemas de Informação (03/2024 - 03/2028).
Projetos: DistroWiki, SIGAMA Vision, LLMX.
Idiomas: Português Nativo, Inglês C1 Avançado.

VAGA:
${JOB_FINTECH_FULLSTACK}

Gere o JSON:`;

async function run() {
  console.log('Chamando Qwen 3.8 no Groq...');
  const t0 = Date.now();
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY || ''}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'qwen/qwen3.8-27b',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: USER_PROMPT }
      ],
      temperature: 0.2,
      max_tokens: 4096
    })
  });
  const data = await res.json();
  const latency = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`✅ Qwen respondeu em ${latency}s`);
  const raw = data.choices[0].message.content;
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Sem JSON');
  const cv = JSON.parse(match[0]);
  fs.writeFileSync(path.join(OUTPUT_DIR, 'cv-groq-qwen.json'), JSON.stringify(cv, null, 2), 'utf8');
  console.log('Resumo Qwen:', cv.summary);
  console.log('Bullets Midas:', cv.experiences[0]?.bullets);
}
run().catch(console.error);
