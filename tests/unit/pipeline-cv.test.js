import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { PROFILE_ARTHUR_CV_REAL, JOB_FINTECH_FULLSTACK } from '../fixtures/mocks.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_DIR = path.resolve(__dirname, '../output');

describe('Pipeline CV Real Arthur + Vaga Fixa', () => {
  it('deve ter o perfil do Arthur populado corretamente sem perdas de dados', () => {
    expect(PROFILE_ARTHUR_CV_REAL.name).toBe('Arthur Henrique Lopes Feitosa');
    expect(PROFILE_ARTHUR_CV_REAL.education[0].institution).toContain('IFMA');
    expect(PROFILE_ARTHUR_CV_REAL.education[0].degree).toContain('Sistemas de Informação');
    expect(PROFILE_ARTHUR_CV_REAL.projects.length).toBe(3);
    expect(PROFILE_ARTHUR_CV_REAL.certifications.length).toBe(14);
    expect(PROFILE_ARTHUR_CV_REAL.experiences[0].company).toContain('Midas');
  });

  it('deve ter gerado o arquivo HTML de saída para inspeção', () => {
    const htmlPath = path.join(OUTPUT_DIR, 'cv-arthur-real.html');
    expect(fs.existsSync(htmlPath)).toBe(true);
    const content = fs.readFileSync(htmlPath, 'utf8');
    expect(content).toContain('Arthur Henrique Lopes Feitosa');
    expect(content).toContain('Spring Boot');
    expect(content).toContain('cv-section-title');
  });

  it('deve ter gerado o PDF de saída A4 para verificação visual de indentação', () => {
    const pdfPath = path.join(OUTPUT_DIR, 'cv-arthur-real.pdf');
    expect(fs.existsSync(pdfPath)).toBe(true);
    const stats = fs.statSync(pdfPath);
    expect(stats.size).toBeGreaterThan(10000);
  });

  it('deve validar saída gerada via Groq (GPT-OSS 120B) com dados reais', () => {
    const htmlPath = path.join(OUTPUT_DIR, 'cv-groq-gpt120b.html');
    expect(fs.existsSync(htmlPath)).toBe(true);
    const content = fs.readFileSync(htmlPath, 'utf8');
    expect(content).toContain('Arthur Henrique Lopes Feitosa');
    expect(content).toContain('Midas Desenvolvimento de Sistemas');
    expect(content).toContain('Instituto Federal do Maranhão (IFMA)');

    const pdfPath = path.join(OUTPUT_DIR, 'cv-groq-gpt120b.pdf');
    expect(fs.existsSync(pdfPath)).toBe(true);
    expect(fs.statSync(pdfPath).size).toBeGreaterThan(50000);
  });

  it('deve validar saída gerada via Groq (Qwen 3.8 27B) com verbos e métricas', () => {
    const jsonPath = path.join(OUTPUT_DIR, 'cv-groq-qwen.json');
    expect(fs.existsSync(jsonPath)).toBe(true);
    const cv = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

    expect(cv.summary).toContain('Java');
    expect(cv.experiences[0].company).toContain('Midas');
    expect(cv.experiences[0].bullets.some(b => b.includes('%'))).toBe(true);

    const pdfPath = path.join(OUTPUT_DIR, 'cv-groq-qwen.pdf');
    expect(fs.existsSync(pdfPath)).toBe(true);
    expect(fs.statSync(pdfPath).size).toBeGreaterThan(40000);
  });
});
