# CV Fácil — Guia do Design System & Arquitetura Modular

Este documento foi projetado para orientar tanto **desenvolvedores humanos** quanto **IAs de desenvolvimento (LLMs)** na manutenção e evolução da identidade visual do **CV Fácil**.

---

## 1. Tipografia Oficial (Font Hierarchy)

As fontes estão localizadas em `src/assets/fonts/` e declaradas via `@font-face` em `src/styles/fonts.css`:

| Fonte | Arquivo | Categoria / Vibe | Uso Principal |
| :--- | :--- | :--- | :--- |
| **TASA Explorer** | `TASAExplorer-Variable.woff2` | `Display` / `Tech` | Títulos principais (H1, H2), logotipo, números de métrica/score, badges |
| **Clash Grotesk** | `ClashGrotesk-Variable.woff2` | `Sans Serif` / `Neutral & Friendly` | Corpo do texto, botões, campos de formulário, interface do usuário (UI) |
| **Montagu Slab** | `MontaguSlab-Variable.woff2` | `Slab Serif` / `Editorial & Classic` | Citações, seções de prestígio, modelos de currículo executivo e acadêmico |

### Variáveis CSS de Fonte
```css
--font-display: 'TASA Explorer', sans-serif;
--font-sans: 'Clash Grotesk', sans-serif;
--font-serif: 'Montagu Slab', serif;
--font-mono: 'Space Grotesk', monospace;
```

---

## 2. Paleta Oficial (Coolors)

```json
["#131515", "#2b2c28", "#339989", "#7de2d1", "#fffafb"]
```

| Cor | Nome Semântico | Token CSS | Finalidade |
| :--- | :--- | :--- | :--- |
| `#131515` | **Obsidian Black** | `--color-bg`, `--palette-black` | Fundo principal da aplicação (Canvas escuro) |
| `#2b2c28` | **Charcoal Slate** | `--color-bg-card`, `--palette-charcoal` | Superfícies elevadas, cards, painéis e inputs |
| `#339989` | **Pine Green** | `--color-accent-primary`, `--palette-pine` | Acento principal, CTAs, botões ativos, bordas |
| `#7de2d1` | **Aquamarine Glow** | `--color-accent`, `--palette-aqua` | Destaques, brilhos de dither, badges e estados hover |
| `#fffafb` | **Snow White** | `--color-text`, `--palette-snow` | Textos primários de alto contraste e legibilidade |

---

## 3. Estilo Dither (Dithering Matrix System)

Definido em `src/styles/dither.css`:
- **Textura de fundo**: SVG vetorial inline (Bayer 4x4 matrix) que elimina banding de cor e traz textura tátil digital sem pesar no carregamento.
- **Classes de Dither**:
  - `.dither-mesh`: Malha suave radial para fundo da Hero Section.
  - `.dither-card`: Cards com padrão de micro-pontos e elevação tátil.
  - `.dither-badge`: Badges de tecnologia com micro-pulso elétrico.
  - `.dither-border-top`: Borda superior com degradê matricial.
  - `.dither-divider`: Divisor sutil com gradiente dithered.

---

## 4. Animações com Motion Engine (`motion`)

Módulo: `src/lib/motion.js`
- Utiliza a biblioteca oficial `motion` (core do Framer Motion para vanilla JS).
- Oferece física de molas reais (`spring physics`), suporte a `stagger` para listas de cards e interações suaves de elevação no hover e clique.
- **Auto-inicialização**: Inicializado automaticamente no `main.js` e em todas as páginas com elementos declarativos `data-motion="fade-up"` ou classes do design system.

---

## 5. Estrutura dos Arquivos de Estilo (`src/styles/`)

```
src/
├── assets/
│   └── fonts/
│       ├── ClashGrotesk-Variable.woff2
│       ├── MontaguSlab-Variable.woff2
│       └── TASAExplorer-Variable.woff2
├── lib/
│   ├── motion.js         # Motor de animações com spring physics
│   └── layout.js         # Injeção de Navbar e Headers/Footers
├── styles/
│   ├── fonts.css         # @font-face e classes de tipografia
│   ├── variables.css     # Tokens de cores, raios, sombras e transições
│   ├── dither.css        # Padrões dither, malhas e texturas
│   ├── animations.css    # Keyframes e classes CSS utilitárias
│   ├── components.css    # Layout, cards, forms, inputs e modais
│   ├── ats.css           # Relatório ATS, gauges e diffs
│   └── landing.css       # Seções e elementos da Landing Page
└── style.css             # Entry point que importa e organiza os módulos
```
