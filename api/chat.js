// api/chat.js — Gemini / OpenRouter / Groq / Cerebras / NVIDIA AI proxy

function resolveProvider(provider, userKeys) {
    if (Array.isArray(userKeys) && userKeys.length > 0) return provider || 'groq';

    // If requested provider has env key, use it
    if (provider === 'groq' && process.env.GROQ_API_KEY) return 'groq';
    if (provider === 'nvidia' && process.env.NVIDIA_API_KEY) return 'nvidia';
    if (provider === 'gemini' && process.env.GEMINI_API_KEY) return 'gemini';

    // Auto-detect which env key is populated
    if (process.env.GROQ_API_KEY) return 'groq';
    if (process.env.NVIDIA_API_KEY) return 'nvidia';
    if (process.env.GEMINI_API_KEY) return 'gemini';

    return provider || 'groq';
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { messages, temperature, max_tokens, model, userKeys } = req.body;
    const provider = resolveProvider(req.body.provider, userKeys);

    try {
        let data;
        if (provider === 'openrouter') {
            data = await callOpenRouter(messages, { temperature, max_tokens, model, userKeys });
        } else if (provider === 'groq') {
            data = await callGroq(messages, { temperature, max_tokens, model, userKeys });
        } else if (provider === 'cerebras') {
            data = await callCerebras(messages, { temperature, max_tokens, model, userKeys });
        } else if (provider === 'nvidia') {
            data = await callNvidia(messages, { temperature, max_tokens, model, userKeys });
        } else {
            // Default: Gemini (Google AI Studio)
            data = await callGemini(messages, { temperature, max_tokens, model, userKeys });
        }
        res.status(200).json(data);
    } catch (err) {
        console.error(`API Error:`, err.message);
        res.status(500).json({ error: err.message });
    }
}

// ─── Gemini (Google AI Studio) ───────────────────────
let currentGeminiKeyIndex = 0;

/**
 * Convert OpenAI-style messages to Gemini API format.
 * Gemini uses `contents[]` with `parts[]` and a separate `systemInstruction`.
 */
function convertToGeminiFormat(messages) {
    let systemInstruction = null;
    const contents = [];

    for (const msg of messages) {
        if (msg.role === 'system') {
            // Gemini uses a separate systemInstruction field
            systemInstruction = {
                parts: [{ text: msg.content }]
            };
        } else {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        }
    }

    return { systemInstruction, contents };
}

/**
 * Convert Gemini response to OpenAI-compatible format.
 */
function geminiToOpenAIFormat(geminiResponse) {
    const content = geminiResponse?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return {
        choices: [{
            message: {
                role: 'assistant',
                content,
            }
        }]
    };
}

async function callGemini(messages, { temperature = 0.2, max_tokens = 4096, model = 'gemini-2.5-flash', userKeys } = {}) {
    // Prefer user-provided keys, then fall back to server env keys
    const envKeys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
    const clientKeys = Array.isArray(userKeys) ? userKeys.filter(Boolean) : [];
    const keys = [...clientKeys, ...envKeys];

    if (keys.length === 0) {
        throw new Error("Nenhuma chave Google AI Studio configurada. Adicione sua chave nas Configurações (⚙️).");
    }

    const { systemInstruction, contents } = convertToGeminiFormat(messages);

    let lastError = null;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[currentGeminiKeyIndex % keys.length];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

        const body = {
            contents,
            generationConfig: {
                temperature,
                maxOutputTokens: max_tokens,
                responseMimeType: 'application/json',
            },
        };

        // Only add systemInstruction if present
        if (systemInstruction) {
            body.systemInstruction = systemInstruction;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (response.ok) {
                const geminiData = await response.json();
                return geminiToOpenAIFormat(geminiData);
            }

            const errText = await response.text();
            lastError = new Error(`Gemini ${response.status}: ${errText}`);

            // If Rate Limit (429) or Unauthorized (401/403), try the next key
            if (response.status === 429 || response.status === 401 || response.status === 403) {
                console.warn(`Gemini Key ${currentGeminiKeyIndex % keys.length} failed with ${response.status}. Rotating...`);
                currentGeminiKeyIndex++;
                continue;
            }

            throw lastError;
        } catch (fetchError) {
            if (fetchError === lastError) throw fetchError;
            lastError = fetchError;
            currentGeminiKeyIndex++;
        }
    }

    throw new Error(`Todas as chaves Gemini falharam. Último erro: ${lastError?.message || 'Erro desconhecido'}`);
}

// ─── OpenRouter (OpenAI-compatible) ──────────────────
let currentOpenRouterKeyIndex = 0;

async function callOpenRouter(messages, { temperature = 0.2, max_tokens = 4096, model = 'google/gemini-2.5-flash-preview-05-20:free', userKeys } = {}) {
    // Prefer user-provided keys, then fall back to server env keys
    const envKeys = (process.env.OPENROUTER_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
    const clientKeys = Array.isArray(userKeys) ? userKeys.filter(Boolean) : [];
    const keys = [...clientKeys, ...envKeys];

    if (keys.length === 0) {
        throw new Error("Nenhuma chave OpenRouter configurada. Adicione sua chave nas Configurações (⚙️).");
    }

    let lastError = null;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[currentOpenRouterKeyIndex % keys.length];

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://cvfacil.vercel.app',
                'X-Title': 'CVFacil - Gerador de Currículo ATS',
            },
            body: JSON.stringify({
                model,
                messages,
                temperature,
                max_tokens,
            }),
        });

        if (response.ok) {
            return await response.json();
        }

        const errText = await response.text();
        lastError = new Error(`OpenRouter ${response.status}: ${errText}`);

        if (response.status === 429 || response.status === 401 || response.status === 403) {
            console.warn(`OpenRouter Key ${currentOpenRouterKeyIndex % keys.length} failed with ${response.status}. Rotating...`);
            currentOpenRouterKeyIndex++;
            continue;
        }

        throw lastError;
    }

    throw new Error(`Todas as chaves OpenRouter falharam. Último erro: ${lastError?.message || 'Erro desconhecido'}`);
}

// ─── Cerebras (OpenAI-compatible) ────────────────────
let currentCerebrasKeyIndex = 0;

async function callCerebras(messages, { temperature = 0.2, max_tokens = 4096, model = 'gpt-oss-120b', userKeys } = {}) {
    const envKeys = (process.env.CEREBRAS_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
    const clientKeys = Array.isArray(userKeys) ? userKeys.filter(Boolean) : [];
    const keys = [...clientKeys, ...envKeys];

    if (keys.length === 0) {
        throw new Error("Nenhuma chave Cerebras configurada. Adicione sua chave nas Configurações (⚙️).");
    }

    let lastError = null;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[currentCerebrasKeyIndex % keys.length];

        try {
            const response = await fetch('https://api.cerebras.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature,
                    max_tokens,
                }),
            });

            if (response.ok) {
                return await response.json();
            }

            const errText = await response.text();
            lastError = new Error(`Cerebras ${response.status}: ${errText}`);

            if (response.status === 429 || response.status === 401 || response.status === 403) {
                console.warn(`Cerebras Key ${currentCerebrasKeyIndex % keys.length} failed with ${response.status}. Rotating...`);
                currentCerebrasKeyIndex++;
                continue;
            }

            throw lastError;
        } catch (fetchError) {
            if (fetchError === lastError) throw fetchError;
            lastError = fetchError;
            currentCerebrasKeyIndex++;
        }
    }

    throw new Error(`Todas as chaves Cerebras falharam. Último erro: ${lastError?.message || 'Erro desconhecido'}`);
}

// ─── NVIDIA Build / NIM API (OpenAI-compatible) ──────
let currentNvidiaKeyIndex = 0;

async function callNvidia(messages, { temperature = 0.2, max_tokens = 4096, model = 'meta/llama-3.3-70b-instruct', userKeys } = {}) {
    const envKeys = (process.env.NVIDIA_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
    const clientKeys = Array.isArray(userKeys) ? userKeys.filter(Boolean) : [];
    const keys = [...clientKeys, ...envKeys];

    if (keys.length === 0) {
        throw new Error("Nenhuma chave NVIDIA Build configurada. Adicione sua chave nas Configurações (⚙️).");
    }

    let lastError = null;

    for (let i = 0; i < keys.length; i++) {
        const key = keys[currentNvidiaKeyIndex % keys.length];

        try {
            const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${key}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model,
                    messages,
                    temperature,
                    max_tokens,
                }),
            });

            if (response.ok) {
                return await response.json();
            }

            const errText = await response.text();
            lastError = new Error(`NVIDIA ${response.status}: ${errText}`);

            if (response.status === 429 || response.status === 401 || response.status === 403) {
                console.warn(`NVIDIA Key ${currentNvidiaKeyIndex % keys.length} failed with ${response.status}. Rotating...`);
                currentNvidiaKeyIndex++;
                continue;
            }

            throw lastError;
        } catch (fetchError) {
            if (fetchError === lastError) throw fetchError;
            lastError = fetchError;
            currentNvidiaKeyIndex++;
        }
    }

    throw new Error(`Todas as chaves NVIDIA falharam. Último erro: ${lastError?.message || 'Erro desconhecido'}`);
}

// ─── Groq (OpenAI-compatible) — Legacy ───────────────
let currentKeyIndex = 0;

async function callGroq(messages, { temperature = 0.2, max_tokens = 4096, model = 'qwen/qwen3.8-27b', userKeys } = {}) {
    // Prefer user-provided keys, then fall back to server env keys
    const envKeys = (process.env.GROQ_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
    const clientKeys = Array.isArray(userKeys) ? userKeys.filter(Boolean) : [];
    const keys = [...clientKeys, ...envKeys];

    if (keys.length === 0) {
        throw new Error("Nenhuma chave Groq configurada. Adicione sua chave nas Configurações (⚙️).");
    }

    let lastError = null;
    const chosenModel = model || 'qwen/qwen3.8-27b';

    for (let i = 0; i < keys.length; i++) {
        const key = keys[currentKeyIndex % keys.length];
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: chosenModel,
                messages,
                temperature,
                max_tokens,
            }),
        });

        if (response.ok) {
            return await response.json();
        }

        const errText = await response.text();
        lastError = new Error(`Groq ${response.status}: ${errText}`);
        
        // If Rate Limit (429), rotate or auto-wait and retry
        if (response.status === 429) {
            if (keys.length > 1 && i < keys.length - 1) {
                console.warn(`Key ${currentKeyIndex % keys.length} hit 429 rate limit. Rotating to next key...`);
                currentKeyIndex++;
                continue;
            }

            // Inspect wait time in Groq error (e.g. "Please try again in 7.515s")
            const waitMatch = errText.match(/try again in ([\d.]+)s/i);
            const waitSec = waitMatch ? parseFloat(waitMatch[1]) + 0.5 : 7;
            if (waitSec <= 15) {
                console.warn(`Groq 429 Rate Limit. Aguardando ${waitSec.toFixed(1)}s antes de retentar automaticamente...`);
                await new Promise(r => setTimeout(r, Math.ceil(waitSec * 1000)));

                const retryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${key}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: chosenModel,
                        messages,
                        temperature,
                        max_tokens,
                    }),
                });

                if (retryRes.ok) {
                    return await retryRes.json();
                }
                const retryErr = await retryRes.text();
                lastError = new Error(`Groq ${retryRes.status}: ${retryErr}`);
                continue;
            }
        }

        if (response.status === 401) {
            console.warn(`Key ${currentKeyIndex % keys.length} failed with 401. Rotating...`);
            currentKeyIndex++;
            continue;
        }

        // For other errors (e.g. 400 Bad Request), don't retry, just throw
        throw lastError;
    }

    // Se esgotar todas as chaves
    throw new Error(`Todas as chaves Groq falharam. Último erro: ${lastError.message}`);
}
