/**
 * @file motion.js
 * @description Módulo Central de Animações com Spring Physics & Interações Elegantes.
 * 
 * Utiliza o motor 'motion' (Motion / Framer Motion para JavaScript) para entregar:
 * 1. Animações de entrada com física de mola (spring physics).
 * 2. Efeitos de hover magnético e elevação tátil.
 * 3. Revelações em cascata (stagger) para listas, cards e grids.
 * 4. Micro-interações táteis em botões e badges.
 * 
 * Auto-inicialização disponível via `initMotion()`, facilitando o uso por qualquer
 * IA ou desenvolvedor sem necessidade de reconfiguração manual.
 */

import { animate, inView, stagger, spring } from 'motion';

/**
 * Configurações padrão de curvas de mola (Spring Presets)
 */
export const SPRING_PRESETS = {
  // Mola suave e elegante para entradas de UI
  gentle: { type: 'spring', stiffness: 120, damping: 18, mass: 1 },
  // Mola ágil para micro-interações de botões e cliques
  snappy: { type: 'spring', stiffness: 350, damping: 25 },
  // Mola elástica com leve overshoot para badges e destaques
  bouncy: { type: 'spring', stiffness: 220, damping: 12 }
};

/**
 * Anima a entrada suave de um elemento do zero até seu estado visível.
 * @param {HTMLElement|string} target - Seletor ou elemento DOM
 * @param {object} [options]
 * @param {number} [options.delay=0] - Delay em segundos
 * @param {number} [options.y=20] - Distância vertical inicial em px
 * @returns {Animation}
 */
export function animateFadeUp(target, { delay = 0, y = 20, duration = 0.6 } = {}) {
  return animate(
    target,
    { opacity: [0, 1], transform: [`translateY(${y}px)`, 'translateY(0px)'] },
    { delay, duration, ease: [0.16, 1, 0.3, 1] }
  );
}

/**
 * Anima uma lista de elementos com efeito em cascata (stagger).
 * @param {NodeList|Array<HTMLElement>|string} targets - Coleção de elementos
 * @param {object} [options]
 * @param {number} [options.staggerDelay=0.08] - Intervalo entre cada item
 */
export function animateStaggerList(targets, { staggerDelay = 0.08, y = 24 } = {}) {
  const elements = typeof targets === 'string' ? document.querySelectorAll(targets) : targets;
  if (!elements || elements.length === 0) return;

  return animate(
    elements,
    { opacity: [0, 1], transform: [`translateY(${y}px)`, 'translateY(0px)'] },
    { delay: stagger(staggerDelay), duration: 0.55, ease: [0.16, 1, 0.3, 1] }
  );
}

/**
 * Adiciona interações suaves de hover em um elemento (elevação elástica).
 * @param {HTMLElement} element
 */
export function attachSmoothHover(element) {
  if (!element || element.__hasMotionHover) return;
  element.__hasMotionHover = true;

  element.addEventListener('mouseenter', () => {
    animate(element, { transform: 'translateY(-3px)' }, { ...SPRING_PRESETS.gentle });
  });

  element.addEventListener('mouseleave', () => {
    animate(element, { transform: 'translateY(0px)' }, { ...SPRING_PRESETS.gentle });
  });

  element.addEventListener('mousedown', () => {
    animate(element, { transform: 'translateY(-1px) scale(0.98)' }, { ...SPRING_PRESETS.snappy });
  });

  element.addEventListener('mouseup', () => {
    animate(element, { transform: 'translateY(-3px) scale(1)' }, { ...SPRING_PRESETS.gentle });
  });
}

/**
 * Inicializa automaticamente as animações na página atual.
 * Lê atributos semânticos `data-motion` e aplica física suave aos elementos.
 */
export function initMotion() {
  if (typeof window === 'undefined') return;

  // 1. Títulos e Subtítulos da Hero Section
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) {
    animateFadeUp(heroTitle, { delay: 0.05, y: 24 });
  }

  const heroSubtitle = document.querySelector('.hero-subtitle');
  if (heroSubtitle) {
    animateFadeUp(heroSubtitle, { delay: 0.18, y: 16 });
  }

  // 2. Botões de Ação na Hero
  const heroCtaGroup = document.querySelectorAll('.hero-cta, .hero-cta-secondary');
  if (heroCtaGroup.length > 0) {
    animateStaggerList(heroCtaGroup, { staggerDelay: 0.09, y: 14 });
    heroCtaGroup.forEach(btn => attachSmoothHover(btn));
  }

  // 3. Card de Preview do CV / Hero Preview
  const previewCard = document.querySelector('.preview-card');
  if (previewCard) {
    animate(
      previewCard,
      { opacity: [0, 1], transform: ['scale(0.95) translateY(20px)', 'scale(1) translateY(0px)'] },
      { delay: 0.25, duration: 0.7, ease: [0.16, 1, 0.3, 1] }
    );
  }

  // 4. Grid de Recursos (Feature Items) com InView & Stagger
  const featureItems = document.querySelectorAll('.feature-item');
  if (featureItems.length > 0) {
    inView('.feature-grid', () => {
      animateStaggerList(featureItems, { staggerDelay: 0.1, y: 20 });
    });
    featureItems.forEach(item => attachSmoothHover(item));
  }

  // 5. Cards interativos de etapas (.card)
  const interactiveCards = document.querySelectorAll('.card[data-goal], .card[data-template], .card[data-frequency], .card[data-focus], .card');
  interactiveCards.forEach(card => attachSmoothHover(card));

  // 6. Elementos com atributo declarativo `data-motion="fade-up"`
  document.querySelectorAll('[data-motion="fade-up"]').forEach((el, index) => {
    animateFadeUp(el, { delay: index * 0.06 });
  });
}

// Auto-inicializa quando o DOM estiver pronto
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initMotion());
  } else {
    initMotion();
  }
}
