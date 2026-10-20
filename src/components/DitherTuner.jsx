import React, { useState, useEffect, useCallback } from 'react';
import Dither from './Dither.jsx';

const STORAGE_KEY = 'cv_facil_dither_config';

const DEFAULT_CONFIG = {
  opacity: 0.7,
  waveColor: '#339989',
  backgroundColor: '#131515',
  ditherMode: 'bayer',
  colorNum: 4,
  pixelSize: 3,
  waveSpeed: 0.05,
  waveFrequency: 3,
  waveAmplitude: 0.3,
  scale: 1,
  contrast: 1,
  brightness: -0.1,
  mouseEffect: 'erase',
  mouseRadius: 0.3,
  palette: [
    '#131515',
    '#1a332e',
    '#339989',
    '#7de2d1',
    '#fffafb'
  ]
};

export default function DitherTuner() {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch (e) {
      console.warn('Erro ao carregar dither config do localStorage:', e);
    }
    return DEFAULT_CONFIG;
  });

  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [copied, setCopied] = useState(false);

  // Atalho de teclado Alt+B para alternar o Tuner
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'b' || e.key === 'B')) {
        setIsDismissed(false);
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Salvar no localStorage sempre que mudar
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {}
  }, [config]);

  const updateField = (field, value) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleCopy = useCallback(() => {
    const text = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }).catch(err => {
      // Fallback
      prompt('Copie a configuração abaixo:', text);
    });
  }, [config]);

  const handleReset = () => {
    setConfig(DEFAULT_CONFIG);
  };

  return (
    <>
      {/* Canvas Dither no fundo com opacidade controlada em tempo real */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          opacity: config.opacity,
          transition: 'opacity 120ms ease'
        }}
      >
        <Dither
          waveColor={config.waveColor}
          backgroundColor={config.backgroundColor}
          ditherMode={config.ditherMode}
          colorNum={config.colorNum}
          pixelSize={config.pixelSize}
          waveSpeed={config.waveSpeed}
          waveFrequency={config.waveFrequency}
          waveAmplitude={config.waveAmplitude}
          scale={config.scale}
          contrast={config.contrast}
          brightness={config.brightness}
          mouseEffect={config.mouseEffect}
          mouseRadius={config.mouseRadius}
          palette={config.palette}
        />
      </div>

      {/* Botão Flutuante para Abrir/Fechar o Painel */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          pointerEvents: 'auto',
          fontFamily: 'var(--font-tech, monospace)'
        }}
      >
        {!isDismissed ? (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <button
              onClick={() => setIsOpen(prev => !prev)}
              style={{
                background: isOpen ? 'var(--palette-aqua, #7de2d1)' : 'rgba(19, 21, 21, 0.95)',
                color: isOpen ? '#131515' : 'var(--palette-aqua, #7de2d1)',
                border: '1px solid var(--palette-aqua, #7de2d1)',
                padding: '8px 14px',
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <span>{isOpen ? '✕ FECHAR' : '⚙ BG TUNER'}</span>
              {!isOpen && (
                <span
                  style={{
                    background: 'rgba(125,226,209,0.2)',
                    padding: '2px 5px',
                    fontSize: '10px'
                  }}
                >
                  {Math.round(config.opacity * 100)}%
                </span>
              )}
            </button>
            {!isOpen && (
              <button
                onClick={() => setIsDismissed(true)}
                title="Ocultar botão (pressione Alt+B para reabrir)"
                style={{
                  background: 'rgba(19, 21, 21, 0.95)',
                  color: '#888',
                  border: '1px solid rgba(125,226,209,0.3)',
                  padding: '8px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)'
                }}
              >
                ✕
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => setIsDismissed(false)}
            title="Abrir BG Tuner (Alt+B)"
            style={{
              background: 'rgba(19, 21, 21, 0.85)',
              color: 'var(--palette-aqua, #7de2d1)',
              border: '1px solid rgba(125,226,209,0.4)',
              padding: '6px 10px',
              fontSize: '10px',
              cursor: 'pointer',
              opacity: 0.6
            }}
          >
            ⚙
          </button>
        )}

        {/* Modal / Gaveta de Configuração */}
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '46px',
              right: '0',
              width: '340px',
              maxHeight: '80vh',
              overflowY: 'auto',
              background: 'rgba(19, 21, 21, 0.98)',
              border: '1px solid rgba(125, 226, 209, 0.45)',
              boxShadow: '0 20px 50px rgba(0,0,0,0.95)',
              padding: '18px 20px',
              color: '#fffafb',
              backdropFilter: 'blur(16px)'
            }}
          >
            {/* Header do Tuner */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(125,226,209,0.25)',
                paddingBottom: '10px',
                marginBottom: '14px'
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    letterSpacing: '0.15em',
                    color: 'var(--palette-aqua, #7de2d1)'
                  }}
                >
                  BG DITHER CONTROLS
                </div>
                <div style={{ fontSize: '9px', color: '#999', marginTop: '2px' }}>
                  Ajustes em tempo real do WebGL
                </div>
              </div>
              <button
                onClick={handleReset}
                title="Restaurar padrão"
                style={{
                  background: 'transparent',
                  border: '1px solid #444',
                  color: '#aaa',
                  fontSize: '9px',
                  padding: '3px 6px',
                  cursor: 'pointer'
                }}
              >
                RESET
              </button>
            </div>

            {/* Sliders de Controle */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '11px' }}>
              
              {/* Opacidade Principal (Mais Apagado / Mais Válido) */}
              <div style={{ background: 'rgba(51, 153, 137, 0.15)', padding: '8px 10px', border: '1px solid rgba(125,226,209,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--palette-aqua, #7de2d1)' }}>
                    OPACIDADE (FADE)
                  </span>
                  <span style={{ fontWeight: 700 }}>{Math.round(config.opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="1.0"
                  step="0.02"
                  value={config.opacity}
                  onChange={e => updateField('opacity', parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#7de2d1' }}
                />
                <div style={{ fontSize: '9px', color: '#aaa', marginTop: '2px' }}>
                  Deixe mais apagado ou sutil para focar na leitura
                </div>
              </div>

              {/* Brilho */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>BRILHO (DARK/LIGHT)</span>
                  <span style={{ color: '#7de2d1' }}>{config.brightness.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-0.8"
                  max="0.8"
                  step="0.05"
                  value={config.brightness}
                  onChange={e => updateField('brightness', parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#7de2d1' }}
                />
              </div>

              {/* Contraste */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>CONTRASTE</span>
                  <span style={{ color: '#7de2d1' }}>{config.contrast.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.05"
                  value={config.contrast}
                  onChange={e => updateField('contrast', parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#7de2d1' }}
                />
              </div>

              {/* Velocidade da Onda */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>VELOCIDADE (WAVE SPEED)</span>
                  <span style={{ color: '#7de2d1' }}>{config.waveSpeed.toFixed(3)}</span>
                </div>
                <input
                  type="range"
                  min="0.00"
                  max="0.15"
                  step="0.005"
                  value={config.waveSpeed}
                  onChange={e => updateField('waveSpeed', parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#7de2d1' }}
                />
              </div>

              {/* Frequência da Onda */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>FREQUÊNCIA (WAVE FREQ)</span>
                  <span style={{ color: '#7de2d1' }}>{config.waveFrequency.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.2"
                  value={config.waveFrequency}
                  onChange={e => updateField('waveFrequency', parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#7de2d1' }}
                />
              </div>

              {/* Amplitude da Onda */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>AMPLITUDE (WAVE AMP)</span>
                  <span style={{ color: '#7de2d1' }}>{config.waveAmplitude.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="1.0"
                  step="0.05"
                  value={config.waveAmplitude}
                  onChange={e => updateField('waveAmplitude', parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#7de2d1' }}
                />
              </div>

              {/* Tamanho do Pixel Dither */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>PIXEL SIZE (DITHER GRID)</span>
                  <span style={{ color: '#7de2d1' }}>{config.pixelSize}px</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  step="1"
                  value={config.pixelSize}
                  onChange={e => updateField('pixelSize', parseInt(e.target.value, 10))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#7de2d1' }}
                />
              </div>

              {/* Modo Dither */}
              <div>
                <div style={{ marginBottom: '4px' }}>MODO DITHER</div>
                <select
                  value={config.ditherMode}
                  onChange={e => updateField('ditherMode', e.target.value)}
                  style={{
                    width: '100%',
                    background: '#131515',
                    color: '#fff',
                    border: '1px solid #444',
                    padding: '6px',
                    fontSize: '11px',
                    fontFamily: 'inherit'
                  }}
                >
                  <option value="bayer">Bayer (Padrão 8x8)</option>
                  <option value="bayer4">Bayer 4x4</option>
                  <option value="bayer2">Bayer 2x2</option>
                  <option value="halftone">Halftone Pontilhado</option>
                  <option value="lines">Linhas</option>
                  <option value="crosshatch">Crosshatch</option>
                  <option value="noise">Noise Granulado</option>
                  <option value="none">Sem Dither (Onda Pura)</option>
                </select>
              </div>

              {/* Efeito do Mouse */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span>RAIO DO MOUSE</span>
                  <span style={{ color: '#7de2d1' }}>{config.mouseRadius.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.05"
                  max="0.8"
                  step="0.05"
                  value={config.mouseRadius}
                  onChange={e => updateField('mouseRadius', parseFloat(e.target.value))}
                  style={{ width: '100%', cursor: 'pointer', accentColor: '#7de2d1' }}
                />
              </div>

            </div>

            {/* Ação de Exportar */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(125,226,209,0.25)' }}>
              <button
                onClick={handleCopy}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: copied ? '#10b981' : 'var(--palette-pine, #339989)',
                  color: '#fffafb',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'background 150ms ease'
                }}
              >
                <span>{copied ? '✓ COPIADO COM SUCESSO!' : '📋 COPIAR CONFIGURAÇÃO'}</span>
              </button>

              <div
                style={{
                  fontSize: '9px',
                  color: copied ? '#7de2d1' : '#888',
                  textAlign: 'center',
                  marginTop: '8px',
                  lineHeight: 1.4
                }}
              >
                {copied
                  ? 'Configuração copiada! Cole no chat para aplicar definitivamente.'
                  : 'Clique para copiar o JSON. Suas alterações também ficam salvas localmente.'}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
