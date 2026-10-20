/**
 * @file layout.js
 * @description Componentes estruturais (Navbar, Step Header, Footer).
 * Estética Hermes Agent / Nous Research com tipografia de marca e navegação horizontal espaçada.
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

export function injectStepHeader({ step, total = 7, backHref = '/pages/dashboard.html' }) {
  const pct = Math.min(100, Math.round((step / total) * 100));
  const stepLabel = STEP_NAMES[step] || `Etapa ${step}`;

  const header = document.createElement('header');
  header.className = 'onboarding-header';
  header.innerHTML = `
    <div class="onboarding-header-inner">
      <div class="onboarding-left">
        <a href="${backHref}" class="onboarding-back-btn" title="Voltar">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          <span>Voltar</span>
        </a>
      </div>

      <div class="onboarding-center">
        <a href="/" class="hermes-nav-brand">
          <span class="hermes-logo-title">CV FÁCIL</span>
          <span class="hermes-logo-sub">ATS ARCHITECT</span>
        </a>
        <div class="onboarding-step-pill">
          <span class="step-num">${step}/${total}</span>
          <span class="step-divider">•</span>
          <span class="step-name">${stepLabel}</span>
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
      <div class="onboarding-footer-hint">
        <span>Pressione Enter para avançar</span>
      </div>
      <button id="${id}" class="onboarding-btn-continue" ${disabled ? 'disabled' : ''}>
        <span>${label}</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>
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
  const nav = document.createElement('nav');
  nav.className = 'hermes-navbar';
  nav.innerHTML = `
    <div class="hermes-navbar-inner">
      <div class="hermes-nav-left">
        <a href="/" class="hermes-nav-link ${activePage === 'landing' ? 'active' : ''}">SISTEMA</a>
        <a href="/pages/step-profile.html" class="hermes-nav-link">GERADOR</a>
      </div>

      <div class="hermes-nav-center">
        <a href="/" class="hermes-brand-stacked">
          <span class="hermes-brand-title">CV FÁCIL</span>
        </a>
      </div>

      <div class="hermes-nav-right">
        <a href="/pages/dashboard.html" class="hermes-nav-link ${activePage === 'dashboard' ? 'active' : ''}">DASHBOARD</a>
        <a href="/pages/step-profile.html" class="hermes-cta-btn">CRIAR CURRÍCULO</a>
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
