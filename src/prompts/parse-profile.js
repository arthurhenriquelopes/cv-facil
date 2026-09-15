/**
 * Prompt to parse unstructured PDF text into a structured profile object.
 */
import { chatCompletion } from '../api/sonar.js';

/**
 * Parses raw text from a CV/LinkedIn PDF into a structured JSON profile.
 * @param {string} rawText - Extracted text from PDF
 * @returns {Promise<object>} Structured profile
 */
export async function parseProfileFromText(rawText) {
  const systemPrompt = `Você é um assistente especialista em extração de dados de currículos.
  Sua tarefa é ler um texto extraído de um PDF (que pode estar desformatado) e extrair os dados organizados em um JSON estruturado.

  REGRAS:
  - Retorne APENAS um JSON válido.
  - Verifique todas as seções do currículo: experiências, formação acadêmica, habilidades (array de strings), projetos, idiomas e certificações.
  - Extraia tudo nos dados estruturados abaixo. Deixe vazio ou array vazio quando não achar a informação.
  - Ajuste datas para o formato 'MM/YYYY' ou apenas 'YYYY'. Nas experiências, se for o emprego atual, marque isCurrent como true e deixe endDate vazio.

  FORMATO ESPERADO:
  {
    "name": "",
    "email": "",
    "phone": "",
    "location": "",
    "linkedin": "",
    "github": "",
    "portfolio": "",
    "summary": "",
    "skills": [],
    "experiences": [
      {
        "title": "",
        "company": "",
        "startDate": "",
        "endDate": "",
        "isCurrent": false,
        "description": ""
      }
    ],
    "education": [
      {
        "degree": "",
        "institution": "",
        "startDate": "",
        "endDate": ""
      }
    ],
    "languages": [
      {
        "name": "",
        "level": ""
      }
    ],
    "projects": [
      {
        "title": "",
        "role": "",
        "description": ""
      }
    ],
    "certifications": [
      {
        "name": "",
        "institution": ""
      }
    ]
  }`;

  const userMessage = `TEXTO DO CURRÍCULO:
  ${rawText}

  Extraia os dados no formato JSON solicitado.`;

  const response = await chatCompletion([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ], { temperature: 0.1 });

  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('A resposta da IA não contém um JSON válido.');
    const parsed = JSON.parse(jsonMatch[0]);
    if (parsed.certifications) {
      parsed.certifications = parsed.certifications.map(c => ({
        ...c,
        title: c.title || c.name || '',
        name: c.name || c.title || '',
        issuer: c.issuer || c.institution || '',
        institution: c.institution || c.issuer || '',
        date: c.date || c.year || '',
        year: c.year || c.date || ''
      }));
    }
    return parsed;
  } catch (e) {
    console.error('Failed to parse profile JSON:', response);
    throw new Error('Erro ao interpretar os dados do currículo: ' + e.message);
  }
}
