/**
 * Settings Modal — AI Provider & Key Manager
 * 
 * Injects a gear icon button and a premium modal for managing
 * AI provider selection and API keys stored in localStorage.
 * 
 * Supports: Google AI Studio (Gemini), OpenRouter, Cerebras, and NVIDIA Build (NIM API).
 */

const STORAGE_KEY = 'cvporvaga_api_keys';
const PROVIDER_KEY = 'cvporvaga_ai_provider';
const MODEL_KEY = 'cvporvaga_selected_model';
const NVIDIA_MODELS_CACHE_KEY = 'cvporvaga_nvidia_models_cache';
const NVIDIA_CACHE_TTL_HOURS = 6; // Re-fetch after 6 hours

// ─── Key Management ───────────────────────────────

export function getAiProvider() {
    return localStorage.getItem(PROVIDER_KEY) || 'groq';
}

export function saveAiProvider(provider) {
    localStorage.setItem(PROVIDER_KEY, provider);
}

/**
 * Get the selected model for a provider.
 */
export function getSelectedModel(provider) {
    const p = provider || getAiProvider();
    const key = `${MODEL_KEY}_${p}`;
    return localStorage.getItem(key) || null;
}

export function saveSelectedModel(model, provider) {
    const p = provider || getAiProvider();
    const key = `${MODEL_KEY}_${p}`;
    if (model) {
        localStorage.setItem(key, model);
    } else {
        localStorage.removeItem(key);
    }
}

/**
 * Get API keys for the current (or specified) provider.
 * Legacy alias: getGroqKeys() still works for backward compatibility.
 */
export function getApiKeys(provider) {
    const p = provider || getAiProvider();
    const key = `${STORAGE_KEY}_${p}`;
    try {
        const raw = localStorage.getItem(key);
        if (!raw) {
            // Migration: check old key format for groq
            if (p === 'groq') {
                const oldRaw = localStorage.getItem('cvporvaga_groq_keys');
                if (oldRaw) {
                    const oldKeys = JSON.parse(oldRaw);
                    if (Array.isArray(oldKeys) && oldKeys.length > 0) {
                        saveApiKeys(oldKeys, 'groq');
                        return oldKeys.filter(Boolean);
                    }
                }
            }
            return [];
        }
        const keys = JSON.parse(raw);
        return Array.isArray(keys) ? keys.filter(Boolean) : [];
    } catch {
        return [];
    }
}

export function saveApiKeys(keys, provider) {
    const p = provider || getAiProvider();
    const key = `${STORAGE_KEY}_${p}`;
    localStorage.setItem(key, JSON.stringify(keys.filter(Boolean)));
}

// Backward-compatible aliases
export function getGroqKeys() {
    return getApiKeys(getAiProvider());
}

export function saveGroqKeys(keys) {
    saveApiKeys(keys, getAiProvider());
}

export function getActiveGroqKey() {
    const keys = getApiKeys();
    return keys.length > 0 ? keys[0] : null;
}

// ─── Provider Config ──────────────────────────────

const PROVIDERS = {
    groq: {
        name: 'Groq',
        description: 'Inferência ultra-rápida na nuvem. Modelos Qwen 3.8 e GPT-OSS 120B.',
        keyPrefix: 'gsk_',
        keyPlaceholder: 'gsk_xxxxxxxxxxxx',
        keyUrl: 'https://console.groq.com/keys',
        keyUrlLabel: 'console.groq.com/keys',
        badge: 'RECOMENDADO',
        hasModelSelector: true,
    },
    nvidia: {
        name: 'NVIDIA Build (NIM)',
        description: 'Catálogo com 100+ modelos via NIM API (DeepSeek, Mistral, Llama).',
        keyPrefix: 'nvapi-',
        keyPlaceholder: 'nvapi-xxxxxxxxxxxx',
        keyUrl: 'https://build.nvidia.com/explore/discover',
        keyUrlLabel: 'build.nvidia.com',
        badge: null,
        hasModelSelector: true,
    },
    gemini: {
        name: 'Google AI Studio',
        description: 'Free tier generoso. Modelo Gemini 2.5 Flash.',
        keyPrefix: 'AIza',
        keyPlaceholder: 'AIzaSy...',
        keyUrl: 'https://aistudio.google.com/apikey',
        keyUrlLabel: 'aistudio.google.com/apikey',
        badge: null,
        hasModelSelector: false,
    },
};

// ─── Groq Models ──────────────────────────────────
const GROQ_MODELS = [
    { id: 'qwen/qwen3.8-27b', name: 'Qwen 3.8 27B (Recomendado — 3s)' },
    { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B (OpenAI — 5s)' },
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Meta)' },
    { id: 'qwen/qwen3.6-27b', name: 'Qwen 3.6 27B (Qwen)' },
    { id: 'openai/gpt-oss-20b', name: 'GPT-OSS 20B (OpenAI)' },
];

// ─── NVIDIA Model Fallback List ───────────────────
const NVIDIA_FALLBACK_MODELS = [
    { id: 'deepseek-ai/deepseek-v4-flash-0731', name: 'DeepSeek V4 Flash (DeepSeek)' },
    { id: 'deepseek-ai/deepseek-v3', name: 'DeepSeek V3 (DeepSeek)' },
    { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2 Instruct (Mistral)' },
    { id: 'mistralai/mistral-large-3', name: 'Mistral Large 3 (Mistral)' },
    { id: 'openai/gpt-oss-120b', name: 'GPT-OSS 120B (OpenAI)' },
    { id: 'meta/llama-3.3-70b-instruct', name: 'Llama 3.3 70B Instruct (Meta)' },
    { id: 'meta/llama-4-maverick', name: 'Llama 4 Maverick (Meta)' },
    { id: 'qwen/qwen3-235b-a22b', name: 'Qwen3 235B A22B (Qwen)' },
];

// Preferred models to prioritize in the NVIDIA dropdown
const NVIDIA_PREFERRED_IDS = new Set(NVIDIA_FALLBACK_MODELS.map(m => m.id));

// ─── NVIDIA Model Cache ──────────────────────────

function getNvidiaModelsCache() {
    try {
        const raw = localStorage.getItem(NVIDIA_MODELS_CACHE_KEY);
        if (!raw) return null;
        const cache = JSON.parse(raw);
        if (!cache || !cache.timestamp || !Array.isArray(cache.models)) return null;
        const ageHours = (Date.now() - cache.timestamp) / (1000 * 60 * 60);
        if (ageHours > NVIDIA_CACHE_TTL_HOURS) return null; // Cache expired
        return cache.models;
    } catch {
        return null;
    }
}

function saveNvidiaModelsCache(models) {
    try {
        localStorage.setItem(NVIDIA_MODELS_CACHE_KEY, JSON.stringify({
            timestamp: Date.now(),
            models,
        }));
    } catch { /* localStorage full — ignore */ }
}

/**
 * Fetch NVIDIA models from the NIM API.
 * Uses the user's API key to authenticate.
 * @param {string} apiKey - NVIDIA API key
 * @param {boolean} forceRefresh - Skip cache
 * @returns {Promise<Array<{id: string, name: string}>>}
 */
async function fetchNvidiaModels(apiKey, forceRefresh = false) {
    if (!forceRefresh) {
        const cached = getNvidiaModelsCache();
        if (cached) return cached;
    }

    if (!apiKey) {
        return NVIDIA_FALLBACK_MODELS;
    }

    try {
        const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error(`NVIDIA API ${response.status}`);
        }

        const data = await response.json();
        const allModels = (data.data || [])
            .filter(m => m.id && typeof m.id === 'string')
            .map(m => ({
                id: m.id,
                name: m.id, // Use ID as display name
            }));

        if (allModels.length === 0) {
            return NVIDIA_FALLBACK_MODELS;
        }

        // Sort: preferred models first, then alphabetically
        allModels.sort((a, b) => {
            const aPref = NVIDIA_PREFERRED_IDS.has(a.id) ? 0 : 1;
            const bPref = NVIDIA_PREFERRED_IDS.has(b.id) ? 0 : 1;
            if (aPref !== bPref) return aPref - bPref;
            return a.id.localeCompare(b.id);
        });

        saveNvidiaModelsCache(allModels);
        return allModels;
    } catch {
        // On failure, return fallback
        return NVIDIA_FALLBACK_MODELS;
    }
}

// ─── UI Injection ─────────────────────────────────

/**
 * Injects the settings gear button into a container element.
 * Call this from layout.js after creating the navbar/header.
 * @param {HTMLElement} container - Element to append the gear button to
 */
export function injectSettingsGear(container) {
    const btn = document.createElement('button');
    btn.id = 'settings-gear-btn';
    btn.setAttribute('aria-label', 'Configurações');
    btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
            <circle cx="12" cy="12" r="3"/>
        </svg>
    `;
    container.appendChild(btn);

    btn.addEventListener('click', () => openSettingsModal());

    // Show a subtle indicator dot if no keys configured
    updateGearIndicator(btn);
}

function updateGearIndicator(btn) {
    const existing = btn.querySelector('.gear-indicator');
    if (existing) existing.remove();

    const keys = getApiKeys();
    if (keys.length === 0) {
        const dot = document.createElement('span');
        dot.className = 'gear-indicator';
        btn.appendChild(dot);
    }
}

// ─── Modal ────────────────────────────────────────

function openSettingsModal() {
    // Prevent duplicates
    if (document.getElementById('settings-modal-overlay')) return;

    const currentProvider = getAiProvider();

    const overlay = document.createElement('div');
    overlay.id = 'settings-modal-overlay';
    overlay.innerHTML = `
        <div class="settings-modal" role="dialog" aria-labelledby="settings-title">
            <div class="settings-modal-header">
                <div>
                    <h2 id="settings-title" class="settings-modal-title">Configurações</h2>
                    <p class="settings-modal-subtitle">Escolha o provedor de IA e insira sua chave de API</p>
                </div>
                <button id="settings-close-btn" class="settings-close-btn" aria-label="Fechar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
                    </svg>
                </button>
            </div>

            <div class="settings-modal-body">
                <div class="settings-section" style="margin-bottom: 24px;">
                    <label class="settings-label">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        </svg>
                        Provedor de IA
                    </label>
                    <p class="settings-hint">
                        Selecione qual inteligência artificial processará seu currículo.
                    </p>
                    
                    <div class="provider-select-group" style="display: flex; gap: 12px; margin-top: 10px; flex-wrap: wrap;">
                        <div class="provider-radio-card card" id="card-groq" style="flex: 1; min-width: 200px; display: flex; flex-direction: column; padding: 1rem; position: relative; cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.95rem;">
                                <input type="radio" name="ai-provider" value="groq" id="provider-groq" style="accent-color: #10b981;" />
                                <span style="font-weight: 700;">Groq</span>
                            </div>
                            <span class="provider-badge" style="position: absolute; top: 10px; right: 10px; font-size: 0.65rem; padding: 3px 8px; border-radius: 9999px; background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.45); font-weight: 700; letter-spacing: 0.5px;">RECOMENDADO</span>
                            <span style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.5rem; margin-left: 1.5rem; line-height: 1.3;">Inferência ultrarrápida (~3s). Escolha entre Qwen 3.8, GPT-OSS 120B e outros.</span>
                        </div>

                        <div class="provider-radio-card card" id="card-nvidia" style="flex: 1; min-width: 200px; display: flex; flex-direction: column; padding: 1rem; position: relative; cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.95rem;">
                                <input type="radio" name="ai-provider" value="nvidia" id="provider-nvidia" style="accent-color: #10b981;" />
                                <span style="font-weight: 700;">NVIDIA Build (NIM)</span>
                            </div>
                            <span style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.5rem; margin-left: 1.5rem; line-height: 1.3;">Catálogo com 100+ modelos via NIM API (DeepSeek, Mistral, Llama).</span>
                        </div>

                        <div class="provider-radio-card card" id="card-gemini" style="flex: 1; min-width: 200px; display: flex; flex-direction: column; padding: 1rem; position: relative; cursor: pointer;">
                            <div style="display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 0.95rem;">
                                <input type="radio" name="ai-provider" value="gemini" id="provider-gemini" style="accent-color: #10b981;" />
                                <span style="font-weight: 700;">Google AI Studio</span>
                            </div>
                            <span style="font-size: 0.8rem; color: var(--color-text-secondary); margin-top: 0.5rem; margin-left: 1.5rem; line-height: 1.3;">Free tier generoso com limite diário alto. Modelo Gemini 2.5 Flash.</span>
                        </div>
                    </div>
                </div>

                <div id="api-keys-section" class="settings-section">
                    <label class="settings-label">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                        </svg>
                        <span id="keys-section-title">Chave API</span>
                    </label>
                    <p class="settings-hint" id="keys-section-hint">
                        Obtenha sua chave em <a id="keys-url-link" href="#" target="_blank" rel="noopener"></a>. 
                        Adicione múltiplas chaves para rotação automática.
                    </p>

                    <div id="keys-list" class="keys-list"></div>

                    <div class="add-key-row">
                        <input 
                            type="password" 
                            id="new-key-input" 
                            class="form-input settings-input" 
                            placeholder=""
                            autocomplete="off"
                            spellcheck="false"
                        />
                        <button id="add-key-btn" class="add-key-btn">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M5 12h14"/><path d="M12 5v14"/>
                            </svg>
                            Adicionar
                        </button>
                    </div>
                </div>

                <!-- Model Selector Section -->
                <div id="model-selector-section" class="settings-section" style="display: none;">
                    <label class="settings-label">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
                            <line x1="12" y1="22.08" x2="12" y2="12"/>
                        </svg>
                        <span id="model-section-title">Modelo</span>
                    </label>
                    <p class="settings-hint" id="model-section-hint">
                        Selecione o modelo de IA para gerar currículos.
                    </p>

                    <!-- Groq model selector -->
                    <div id="groq-model-selector" style="display: none;">
                        <div class="model-select-row">
                            <select id="groq-model-select" class="form-input settings-select" style="width: 100%;">
                                <option value="qwen/qwen3.8-27b">Qwen 3.8 27B (Recomendado — 3s)</option>
                                <option value="openai/gpt-oss-120b">GPT-OSS 120B (OpenAI — 5s)</option>
                                <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Meta)</option>
                                <option value="qwen/qwen3.6-27b">Qwen 3.6 27B (Qwen)</option>
                                <option value="openai/gpt-oss-20b">GPT-OSS 20B (OpenAI)</option>
                            </select>
                        </div>
                    </div>

                    <!-- NVIDIA model selector -->
                    <div id="nvidia-model-selector" style="display: none;">
                        <div class="model-select-row">
                            <select id="nvidia-model-select" class="form-input settings-select">
                                <option value="">Carregando modelos...</option>
                            </select>
                            <button id="nvidia-refresh-models-btn" class="model-refresh-btn" title="Atualizar lista de modelos">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                                </svg>
                            </button>
                        </div>
                        <div id="nvidia-model-error" class="model-error" style="display: none;"></div>
                        <div id="nvidia-model-status" class="model-status" style="display: none;"></div>
                    </div>
                </div>

                <div class="settings-info-card">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;">
                        <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                    </svg>
                    <span>Suas chaves ficam salvas apenas no seu navegador (localStorage) e nunca são enviadas para nossos servidores.</span>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);

    // Setup Provider state UI
    const allCards = {
        groq: overlay.querySelector('#card-groq'),
        nvidia: overlay.querySelector('#card-nvidia'),
        gemini: overlay.querySelector('#card-gemini'),
    };
    const allRadios = {
        groq: overlay.querySelector('#provider-groq'),
        nvidia: overlay.querySelector('#provider-nvidia'),
        gemini: overlay.querySelector('#provider-gemini'),
    };

    // Set initial selection
    if (allRadios[currentProvider]) {
        allRadios[currentProvider].checked = true;
        allCards[currentProvider].classList.add('selected');
    } else {
        allRadios.groq.checked = true;
        allCards.groq.classList.add('selected');
    }

    const handleProviderChange = (newProvider) => {
        saveAiProvider(newProvider);
        // Reset all cards
        Object.values(allCards).forEach(c => c.classList.remove('selected'));
        // Highlight selected
        if (allCards[newProvider]) {
            allCards[newProvider].classList.add('selected');
        }
        updateKeysSection(overlay, newProvider);
        renderKeysList(newProvider);
        updateModelSection(overlay, newProvider);
    };

    // Wire up click handlers for all cards
    for (const [providerKey, card] of Object.entries(allCards)) {
        card.addEventListener('click', () => {
            allRadios[providerKey].checked = true;
            handleProviderChange(providerKey);
        });
    }

    // Wire up radio change handlers
    for (const [providerKey, radio] of Object.entries(allRadios)) {
        radio.addEventListener('change', () => handleProviderChange(providerKey));
    }

    // Initialize keys section for current provider
    updateKeysSection(overlay, currentProvider);
    renderKeysList(currentProvider);
    updateModelSection(overlay, currentProvider);

    // Wire events
    const closeBtn = overlay.querySelector('#settings-close-btn');
    const addBtn = overlay.querySelector('#add-key-btn');
    const input = overlay.querySelector('#new-key-input');

    closeBtn.addEventListener('click', closeSettingsModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeSettingsModal();
    });
    document.addEventListener('keydown', handleEsc);

    addBtn.addEventListener('click', () => addKey(input));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') addKey(input);
    });

    // Wire NVIDIA model selector events
    const nvidiaSelect = overlay.querySelector('#nvidia-model-select');
    const nvidiaRefresh = overlay.querySelector('#nvidia-refresh-models-btn');

    if (nvidiaSelect) {
        nvidiaSelect.addEventListener('change', () => {
            saveSelectedModel(nvidiaSelect.value, 'nvidia');
        });
    }
    if (nvidiaRefresh) {
        nvidiaRefresh.addEventListener('click', () => {
            loadNvidiaModels(overlay, true);
        });
    }

    // Animate in
    requestAnimationFrame(() => {
        overlay.classList.add('active');
    });
}

/**
 * Update the keys section UI based on the selected provider.
 */
function updateKeysSection(overlay, provider) {
    const config = PROVIDERS[provider] || PROVIDERS.gemini;
    const title = overlay.querySelector('#keys-section-title');
    const link = overlay.querySelector('#keys-url-link');
    const input = overlay.querySelector('#new-key-input');

    if (title) title.textContent = `Chaves API ${config.name.split('(')[0].trim()}`;
    if (link) {
        link.href = config.keyUrl;
        link.textContent = config.keyUrlLabel;
    }
    if (input) input.placeholder = config.keyPlaceholder;
}

/**
 * Update model section visibility and content based on provider.
 */
function updateModelSection(overlay, provider) {
    const section = overlay.querySelector('#model-selector-section');
    const groqSelector = overlay.querySelector('#groq-model-selector');
    const nvidiaSelector = overlay.querySelector('#nvidia-model-selector');
    const modelTitle = overlay.querySelector('#model-section-title');
    const modelHint = overlay.querySelector('#model-section-hint');

    if (!section) return;

    // Hide model section for providers without model selection (Gemini)
    if (provider !== 'groq' && provider !== 'nvidia') {
        section.style.display = 'none';
        return;
    }

    section.style.display = '';

    if (provider === 'groq') {
        if (groqSelector) groqSelector.style.display = '';
        if (nvidiaSelector) nvidiaSelector.style.display = 'none';
        if (modelTitle) modelTitle.textContent = 'Modelo Groq';
        if (modelHint) modelHint.textContent = 'Escolha o modelo de IA. O Qwen 3.8 obteve a melhor velocidade (~3s) e notas nos testes.';

        const groqSelect = overlay.querySelector('#groq-model-select');
        if (groqSelect) {
            const currentGroq = getSelectedModel('groq') || 'qwen/qwen3.8-27b';
            groqSelect.innerHTML = GROQ_MODELS.map(m => `
                <option value="${m.id}" ${m.id === currentGroq ? 'selected' : ''}>${m.name}</option>
            `).join('');
            saveSelectedModel(groqSelect.value, 'groq');

            groqSelect.onchange = (e) => {
                saveSelectedModel(e.target.value, 'groq');
            };
        }
    } else if (provider === 'nvidia') {
        if (groqSelector) groqSelector.style.display = 'none';
        if (nvidiaSelector) nvidiaSelector.style.display = '';
        if (modelTitle) modelTitle.textContent = 'Modelo NVIDIA';
        if (modelHint) modelHint.textContent = 'Selecione o modelo de IA. Modelos recomendados aparecem primeiro.';
        loadNvidiaModels(overlay, false);
    }
}

/**
 * Load NVIDIA models into the dropdown.
 */
async function loadNvidiaModels(overlay, forceRefresh) {
    const select = overlay.querySelector('#nvidia-model-select');
    const errorEl = overlay.querySelector('#nvidia-model-error');
    const statusEl = overlay.querySelector('#nvidia-model-status');
    const refreshBtn = overlay.querySelector('#nvidia-refresh-models-btn');

    if (!select) return;

    // Show loading state
    select.innerHTML = '<option value="">Carregando modelos...</option>';
    select.disabled = true;
    if (refreshBtn) refreshBtn.classList.add('spinning');
    if (errorEl) errorEl.style.display = 'none';
    if (statusEl) statusEl.style.display = 'none';

    const keys = getApiKeys('nvidia');
    const apiKey = keys.length > 0 ? keys[0] : null;

    let models;
    let usedFallback = false;

    try {
        models = await fetchNvidiaModels(apiKey, forceRefresh);
        // Check if we got the fallback list
        if (!apiKey) {
            usedFallback = true;
        }
    } catch {
        models = NVIDIA_FALLBACK_MODELS;
        usedFallback = true;
    }

    // Populate select
    const savedModel = getSelectedModel('nvidia');
    select.innerHTML = '';

    if (models.length === 0) {
        select.innerHTML = '<option value="">Nenhum modelo disponível</option>';
        select.disabled = true;
        if (refreshBtn) refreshBtn.classList.remove('spinning');
        return;
    }

    // Add separator between preferred and other models
    let addedPreferred = false;
    let addedOther = false;

    for (const model of models) {
        if (NVIDIA_PREFERRED_IDS.has(model.id) && !addedPreferred) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = '★ Recomendados para currículos';
            select.appendChild(optgroup);
            addedPreferred = true;
        }

        if (!NVIDIA_PREFERRED_IDS.has(model.id) && !addedOther && addedPreferred) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Outros modelos';
            select.appendChild(optgroup);
            addedOther = true;
        }

        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.id;
        if (model.id === savedModel) {
            option.selected = true;
        }

        // Append to last optgroup or directly to select
        const lastGroup = select.querySelector('optgroup:last-of-type');
        if (lastGroup) {
            lastGroup.appendChild(option);
        } else {
            select.appendChild(option);
        }
    }

    // If no saved model, select the first one
    if (!savedModel && models.length > 0) {
        select.value = models[0].id;
        saveSelectedModel(models[0].id, 'nvidia');
    }

    select.disabled = false;
    if (refreshBtn) refreshBtn.classList.remove('spinning');

    // Show status messages
    if (usedFallback && !apiKey) {
        if (errorEl) {
            errorEl.textContent = 'Insira uma API key NVIDIA para carregar a lista completa de modelos.';
            errorEl.style.display = '';
        }
    } else if (usedFallback) {
        if (errorEl) {
            errorEl.textContent = 'Falha ao carregar modelos da API. Usando lista de modelos recomendados.';
            errorEl.style.display = '';
        }
    } else {
        if (statusEl) {
            statusEl.textContent = `${models.length} modelos carregados com sucesso.`;
            statusEl.style.display = '';
            setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        }
    }
}

function closeSettingsModal() {
    const overlay = document.getElementById('settings-modal-overlay');
    if (!overlay) return;
    
    overlay.classList.remove('active');
    overlay.classList.add('closing');
    document.removeEventListener('keydown', handleEsc);

    setTimeout(() => overlay.remove(), 250);

    // Update gear indicator
    const gearBtn = document.getElementById('settings-gear-btn');
    if (gearBtn) updateGearIndicator(gearBtn);
}

function handleEsc(e) {
    if (e.key === 'Escape') closeSettingsModal();
}

function addKey(input) {
    const value = input.value.trim();
    if (!value) return;

    const provider = getAiProvider();
    const config = PROVIDERS[provider];

    // Basic validation
    if (config && config.keyPrefix && !value.startsWith(config.keyPrefix) && value.length < 20) {
        input.style.borderColor = 'var(--color-error)';
        input.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.15)';
        setTimeout(() => {
            input.style.borderColor = '';
            input.style.boxShadow = '';
        }, 1500);
        return;
    }

    const keys = getApiKeys(provider);
    if (keys.includes(value)) {
        input.value = '';
        return; // Already exists
    }

    keys.push(value);
    saveApiKeys(keys, provider);
    input.value = '';
    renderKeysList(provider);

    // Flash success
    input.style.borderColor = 'var(--color-success)';
    input.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.15)';
    setTimeout(() => {
        input.style.borderColor = '';
        input.style.boxShadow = '';
    }, 1000);

    // If NVIDIA, reload models with the new key
    if (provider === 'nvidia') {
        const overlay = document.getElementById('settings-modal-overlay');
        if (overlay) {
            loadNvidiaModels(overlay, true);
        }
    }
}

function removeKey(index, provider) {
    const keys = getApiKeys(provider);
    keys.splice(index, 1);
    saveApiKeys(keys, provider);
    renderKeysList(provider);
}

function maskKey(key) {
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.slice(0, 4) + '•'.repeat(Math.min(key.length - 8, 24)) + key.slice(-4);
}

function renderKeysList(provider) {
    const container = document.getElementById('keys-list');
    if (!container) return;

    const p = provider || getAiProvider();
    const keys = getApiKeys(p);

    if (keys.length === 0) {
        container.innerHTML = `
            <div class="keys-empty">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.3;">
                    <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                </svg>
                <span>Nenhuma chave configurada</span>
            </div>
        `;
        return;
    }

    container.innerHTML = keys.map((key, i) => `
        <div class="key-item animate-fade-in" style="animation-delay:${i * 50}ms;">
            <div class="key-item-info">
                <span class="key-index">${i + 1}</span>
                <code class="key-value">${maskKey(key)}</code>
                ${i === 0 ? '<span class="key-active-badge">Ativa</span>' : ''}
            </div>
            <button class="key-remove-btn" data-index="${i}" aria-label="Remover chave ${i + 1}">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
            </button>
        </div>
    `).join('');

    // Wire remove buttons
    container.querySelectorAll('.key-remove-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const idx = parseInt(btn.dataset.index, 10);
            removeKey(idx, p);
        });
    });
}
