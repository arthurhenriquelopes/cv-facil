# DIRETRIZES DE DESIGN & GUIA DE UNSLOP (GEMINI.MD)
> **CV Fácil — Regras Rígidas para Agentes e Desenvolvedores**  
> *Este documento reúne as diretrizes de desintoxicação visual ("De-slop / Unslop") compiladas a partir de discussões e guias de design (Hacker News, Reddit r/webdesign, r/SaaS, Impeccable.style, 925studios).*

---

## 1. O Diagnóstico: Os Trejeitos que Entregam o "Design de IA"
A inteligência artificial opera calculando a média estatística de milhares de páginas corporativas de 2021-2024. O resultado é uma estética homogênea, sem identidade e desprovida de tato humano:

1. **Cardocalypse (A praga dos cards idênticos):** Agrupar absolutamente todo o conteúdo em grids perfeitamente simétricos de 3 cards com bordas sutis e cantos ultra-arredondados.
2. **Glow Spray & Orbes Desconectados:** Manchas radiais difusas de roxo, rosa ou ciano flutuando no fundo sem nenhuma relação com a marca, apenas para preencher o vazio.
3. **Skeleton Wireframes como "Hero Asset":** Colocar no centro da Hero uma simulação vazia de dashboard com barrinhas cinzas piscando (`.preview-line`) e etiquetas fakes como *"ATS 98%"*.
4. **Crimes de Contraste (Dark Mode Ilegível):** Textos secundários em cinza chumbo sobre fundos escuros (`#444` sobre `#121212`), falhando em testes de acessibilidade (WCAG).
5. **Copy Vazio com Jargões de IA:** Títulos que dizem *"Revolucione seu fluxo com sinergia inteligente"*, sem jamais citar o problema real do usuário ou a mecânica do produto.
6. **Pílula "✨ Powered by AI" com Bolinha Pulsante:** Selo padrão de todo MVP feito às pressas que virou sinônimo de ferramenta genérica.
7. **Sobrecarga de Movimento (Motion Overload):** Badges flutuando sozinhas, barras brilhando em loop e animações constantes que roubam a atenção do conteúdo.
8. **Homogeneização de Fontes:** Dependência cega de Inter, Roboto ou Geist sem qualquer tensão tipográfica ou personalidade de marca.

---

## 2. As Aversões Obrigatórias (Zero Tolerância)

Qualquer código ou layout desenvolvido no repositório DEVE seguir estas aversões:

### 🚫 Aversão 1: Proibido o "Cardocalypse"
- **Regra:** Não resolva seções repetindo blocos idênticos de 3 caixas. 
- **Alternativa:** Use listas editoriais, tabelas técnicas assimétricas, tipografia de grande escala (statement typography), dados em faixa horizontal ou diagramações com contraste de peso.

### 🚫 Aversão 2: Proibido Placeholders e Telas Vazias
- **Regra:** Nunca coloque mockups com barrinhas cinzas fingindo ser texto no hero ou no corpo da página.
- **Alternativa:** Mostre **conteúdo real de currículo**: antes vs depois concreto, trechos reais de vagas, palavras-chave auditadas e métricas autênticas.

### 🚫 Aversão 3: Proibido o "Regra da Adição" (Adote o Princípio da Subtração)
- **Regra:** Não adicione uma borda, um gradiente interno ou um container decorativo se a tipografia e o espaçamento em branco já resolverem a hierarquia.
- **Ação:** Delete caixas desnecessárias. Menos camadas = mais sofisticação.

### 🚫 Aversão 4: Proibido Selos e Badges com Animações Infinitas de Pulso
- **Regra:** Zero badges neon com pontinho piscando (`@keyframes pulse`). A animação deve responder à interação do usuário (hover, clique, scroll), não ficar em convulsão autônoma.

### 🚫 Aversão 5: Proibido Texto Ilegível por Falta de Contraste
- **Regra:** Todo texto de leitura deve atingir contraste mínimo WCAG AA.
- **Tokens:** Texto principal sempre em `#fffafb` (Snow White), textos secundários nunca abaixo de 65% de opacidade sobre o fundo `#131515`.

### 🚫 Aversão 6: Proibido o "Blob Glow" Roxo/Ciano Genérico
- **Regra:** Fundo não é aquarela borrada. A textura visual da marca CV Fácil é o **Halftone / Dither pontilhado tátil**, derivado diretamente do logotipo oficial.

---

## 3. A Linguagem Gráfica Oficial: Halftone & Dither Tátil

Para garantir autenticidade única que nenhuma IA genérica produz:
1. **Fundo com Halftone Marcante:** Padrão matricial vetorial presente, com micropontos nas cores exatas da paleta (`#339989` Pine Green, `#7de2d1` Aqua e `#fffafb` Snow) sobre a base sólida `#131515`.
2. **Logotipo Halftone Oficial (`src/assets/logo-halftone.png`):** Protagonista visual do Hero e do Onboarding.
3. **Tipografia Tríplice com Autoridade:**
   - **TASA Explorer:** Display geométrico cirúrgico.
   - **Clash Grotesk:** UI contemporânea, legibilidade absoluta.
   - **Montagu Slab:** Presença editorial clássica para citações e templates executivos.

---

## 4. Checklist de Validação Anti-Slop

Antes de concluir qualquer tela:
- [ ] O layout foge do padrão "3 cards idênticos com ícones coloridos"?
- [ ] O fundo tem o halftone pontilhado autêntico e audível da marca, em vez de blur genérico?
- [ ] Todo o texto fala de dores concretas (robôs ATS, Gupy, Workday, palavras-chave)?
- [ ] A tela tem contraste alto e confortável para leitura prolongada?
- [ ] O botão principal tem peso claro e foco na ação do usuário?
