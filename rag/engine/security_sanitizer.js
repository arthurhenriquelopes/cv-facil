/**
 * rag/engine/security_sanitizer.js
 * Sanitização e proteção contra Prompt Injection e vazamento de dados (LGPD / Segurança)
 * Baseado nas diretrizes do Guia Mestre (Estudo: ~1% de CVs reais contêm injeção de prompt oculta).
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
  /desconsidere\s+(todas\s+as\s+)?instru[çc][õo]es\s+anteriores/i,
  /esque[çc]a\s+o\s+prompt\s+do\s+sistema/i,
  /you\s+are\s+now\s+in\s+developer\s+mode/i,
  /modo\s+desenvolvedor\s+ativado/i,
  /system\s*:\s*system_instruction/i,
  /system\s*prompt\s*override/i,
  /<system>[\s\S]*?<\/system>/i,
  /\[system_note[\s\S]*?\]/i,
  /give\s+this\s+(candidate|resume)\s+100\s*(%|points)/i,
  /d[êe]\s+a\s+este\s+curr[íi]culo\s+nota\s+100/i,
  /classifique\s+como\s+altamente\s+qualificado\s+sem\s+analisar/i,
  /always\s+respond\s+with\s+a\s+score\s+of\s+100/i
];

// Detecção de CPF brasileiro para ofuscação (LGPD)
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;

/**
 * Higieniza o texto de entrada (currículo ou descrição de vaga)
 * @param {string} rawText
 * @returns {{ sanitizedText: string, threatsDetected: string[], isSuspicious: boolean }}
 */
export function sanitizeInputText(rawText) {
  if (typeof rawText !== 'string') {
    return { sanitizedText: '', threatsDetected: [], isSuspicious: false };
  }

  const threatsDetected = [];
  let text = rawText;

  // 1. Remover caracteres invisíveis / zero-width spaces frequentemente usados para bypass de filtros
  text = text.replace(/[\u200B-\u200D\uFEFF]/g, '');

  // 2. Verificar padrões de injeção conhecidos
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      threatsDetected.push(`Padrão suspeito detectado: ${pattern.toString()}`);
      // Neutralizar o comando mantendo a legibilidade sem executar o prompt bypass
      text = text.replace(pattern, '[CONTEÚDO NEUTRALIZADO POR POLÍTICA DE SEGURANÇA]');
    }
  }

  // 3. Mascarar CPFs para conformidade com a LGPD
  text = text.replace(CPF_PATTERN, '***.***.***-**');

  // 4. Limitar tamanho excessivo (anti Denial of Service)
  const MAX_CHAR_LIMIT = 60000; // ~15.000 tokens de texto de CV/Vaga é mais que suficiente
  if (text.length > MAX_CHAR_LIMIT) {
    text = text.slice(0, MAX_CHAR_LIMIT);
    threatsDetected.push('Texto truncado no limite de segurança de 60.000 caracteres');
  }

  return {
    sanitizedText: text,
    threatsDetected,
    isSuspicious: threatsDetected.length > 0
  };
}

export default {
  sanitizeInputText
};
