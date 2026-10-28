/**
 * @file layout.js
 * @description Componentes estruturais padronizados (Navbar, Step Header, Footer, Moldura de Tela).
 * Estética Hermes Agent / Nous Research com tipografia de marca Kihim e navegação horizontal precisa.
 */
import { injectSettingsGear } from './settings.js';
import { attachSmoothHover } from './motion.js';

const STEP_NAMES = {
  1: 'Dados Pessoais & Experiência',
  2: 'Vaga Desejada',
  3: 'Objetivo Profissional',
  4: 'Certificações & Cursos',
  5: 'Revisão de Destaques',
  6: 'Modelo Visual',
  7: 'Análise ATS & Otimização',
  8: 'Currículo Pronto'
};

function ensureFrameAndFavicon() {
  if (!document.querySelector('.screen-frame-viewport')) {
    const frame = document.createElement('div');
    frame.className = 'screen-frame-viewport';
    document.body.prepend(frame);
  }

  if (!document.querySelector('link[rel~="icon"]')) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/svg+xml';
    link.href = '/src/assets/favicon.svg';
    document.head.appendChild(link);
  }
}

export function injectStepHeader({ step, total = 7, backHref = '/pages/dashboard.html' }) {
  ensureFrameAndFavicon();

  const pct = Math.min(100, Math.round((step / total) * 100));
  const stepLabel = STEP_NAMES[step] || `Etapa ${step}`;

  const header = document.createElement('header');
  header.className = 'onboarding-header';
  header.innerHTML = `
    <div class="onboarding-header-inner">
      <div class="onboarding-left">
        <a href="${backHref}" class="onboarding-back-btn" title="Voltar ao Painel">
          <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          <span>VOLTAR</span>
        </a>
        <div class="onboarding-header-divider"></div>
        <a href="/" class="hermes-nav-brand">
          <span class="hermes-logo-title type-logo">CV FÁCIL</span>
          <span class="hermes-logo-sub type-tech">ATS ARCHITECT</span>
        </a>
      </div>

      <div class="onboarding-center">
        <div class="onboarding-step-pill">
          <span class="step-num type-tech">${step}/${total}</span>
          <span class="step-divider">//</span>
          <span class="step-name type-tech">${stepLabel}</span>
        </div>
      </div>

      <div class="onboarding-right">
        <span id="step-gear-mount"></span>
      </div>
    </div>
    <div class="onboarding-progress-track">
      <div class="onboarding-progress-bar" style="width: ${pct}%;"></div>
    </div>
  `;
  document.body.prepend(header);

  const mount = header.querySelector('#step-gear-mount');
  if (mount) injectSettingsGear(mount);
}

export function injectStepFooter({ label = 'Salvar e Continuar', id = 'btn-continue', disabled = false } = {}) {
  const footer = document.createElement('footer');
  footer.className = 'onboarding-footer';
  footer.innerHTML = `
    <div class="onboarding-footer-inner">
      <div class="onboarding-footer-hint type-tech">
        <span>PRESSIONE [ENTER] PARA AVANÇAR</span>
      </div>
      <button id="${id}" class="onboarding-btn-continue type-tech" ${disabled ? 'disabled' : ''}>
        <span>${label}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
      </button>
    </div>
  `;
  document.body.appendChild(footer);

  const btn = footer.querySelector(`#${id}`);
  if (btn) attachSmoothHover(btn);
}

/**
 * Injeta a barra de navegação estilo Hermes Agent:
 * [LINKS ESQUERDA] [LOGO CENTRALIZADA STACKED] [LINKS DIREITA + BOTÃO CTA TÉCNICO]
 */
export function injectNavbar({ activePage = 'landing' } = {}) {
  ensureFrameAndFavicon();

  const nav = document.createElement('nav');
  nav.className = 'hermes-navbar';
  nav.innerHTML = `
    <div class="hermes-navbar-inner">
      <div class="hermes-nav-left">
        <a href="/" class="hermes-nav-link type-tech ${activePage === 'landing' ? 'active' : ''}">SISTEMA</a>
        <a href="/pages/step-profile.html" class="hermes-nav-link type-tech">GERADOR</a>
      </div>

      <div class="hermes-nav-center">
        <a href="/" class="hermes-brand-stacked">
          <span class="hermes-brand-title type-logo">CV FÁCIL</span>
        </a>
      </div>

      <div class="hermes-nav-right">
        <a href="/pages/dashboard.html" class="hermes-nav-link type-tech ${activePage === 'dashboard' ? 'active' : ''}">DASHBOARD</a>
        <a href="/pages/step-profile.html" class="hermes-cta-btn type-tech">CRIAR CURRÍCULO</a>
        <span id="navbar-gear-mount"></span>
      </div>
    </div>
  `;
  document.body.prepend(nav);

  const mount = nav.querySelector('#navbar-gear-mount');
  if (mount) injectSettingsGear(mount);

  const cta = nav.querySelector('.hermes-cta-btn');
  if (cta) attachSmoothHover(cta);
}

export default {
  injectStepHeader,
  injectStepFooter,
  injectNavbar
};
