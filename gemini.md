# DIRETRIZES DE DESIGN, ARQUITETURA RAG & GUIA ANTI-SLOP (GEMINI.MD)
> **CV Fácil — Regras Rígidas para Agentes e Desenvolvedores**  
> *Este documento reúne as diretrizes de desintoxicação visual ("De-slop / Unslop"), arquitetura de RAG, Engenharia de ATS, Fine-Tuning supervisionado e memória interativa do projeto baseadas no Guia Mestre (28/10/2026).*

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

### 🚫 Aversão 3: Proibido a "Regra da Adição" (Adote o Princípio da Subtração)
- **Regra:** Não adicione uma borda, um gradiente interno ou um container decorativo se a tipografia e o espaçamento em branco já resolverem a hierarquia.
- **Ação:** Delete caixas desnecessárias. Menos camadas = mais sofisticação.

### 🚫 Aversão 4: Proibido Selos e Badges com Animações Infinitas de Pulso
- **Regra:** Zero badges neon com pontinho piscando (`@keyframes pulse`). A animação deve responder à interação do usuário (hover, clique, scroll), não ficar em convulsão autônoma.

### 🚫 Aversão 5: Proibido Texto Ilegível por Falta de Contraste
- **Regra:** Todo texto de leitura deve atingir contraste mínimo WCAG AA.
- **Tokens:** Texto principal sempre em `#fffafb` (Snow White), textos secundários nunca abaixo de 65% de opacidade sobre o fundo `#131515`.

### 🚫 Aversão 6: Proibido o "Blob Glow" Roxo/Ciano Genérico
- **Regra:** Fundo não é aquarela borrada. A textura visual da marca CV Fácil é o **Halftone / Dither pontilhado tátil**, derivado diretamente do logotipo oficial.

### 🚫 Aversão 7: Proibido Cantos Arredondados
- **Regra:** Em todo o ecossistema visual, `border-radius: 0 !important;`. Botões, caixas, modais e containers têm bordas 100% retas e brutalistas.

---

## 3. A Linguagem Gráfica Oficial: Halftone & Dither Tátil

Para garantir autenticidade única que nenhuma IA genérica produz:
1. **Fundo com Halftone Marcante:** Shader WebGL oficial (`src/components/Dither.jsx` / `DitherTuner.jsx`) sintonizado nos valores de referência (`opacity: 0.7`, `pixelSize: 3`, `brightness: -0.1`, `waveSpeed: 0.05`).
2. **Logotipo Halftone Oficial (`src/assets/logo-halftone.png`):** Protagonista visual do Hero e do Onboarding.
3. **Tipografia Tríplice com Autoridade:**
   - **TASA Explorer:** Display geométrico cirúrgico.
   - **Clash Grotesk:** UI contemporânea, legibilidade absoluta.
   - **Montagu Slab:** Presença editorial clássica para citações e templates executivos.

---

## 4. Checklist de Validação Anti-Slop

Antes de concluir qualquer tela:
- [ ] O layout foge do padrão "3 cards idênticos com ícones coloridos"?
- [ ] O fundo tem o halftone pontilhado autêntico da marca, em vez de blur genérico?
- [ ] Todo o texto fala de dores concretas (robôs ATS, Gupy, Workday, palavras-chave)?
- [ ] A tela tem contraste alto e confortável para leitura prolongada?
- [ ] Todos os elementos mantêm bordas estritamente retas (`border-radius: 0`)?

---

## 5. Diretiva de Memória Contínua & Registro Interativo no RAG

> **REGRA DE RESPONSABILIDADE DO AGENTE:**
> Qualquer decisão arquitetural, técnica, de segurança ou de design DEVE ser gravada imediatamente e interativamente no RAG em `rag/corpus/decisions_log.json` através do módulo `rag/engine/decision_recorder.js`.
> **O usuário NÃO precisa pedir "salva isso".** Sempre que uma definição for tomada ou alinhada, o agente deve registrar a entrada com `id`, `category`, `context`, `decision` e `impacted_files`.

---

## 6. Arquitetura de RAG & Engenharia de ATS (Guia Mestre)

1. **O que vai no RAG vs o que vai no Prompt:**
   - **No Prompt (Contexto de 1M tokens):** O currículo integral do candidato e a descrição completa da vaga. **PROIBIDO fatiar o CV do usuário em chunks de RAG.**
   - **No RAG (`rag/corpus/`):** Conhecimento externo curado e versionado:
     - Regras de parsers ATS por plataforma (`ats_parsers.json`: Workday, Taleo, Greenhouse, Gupy, Lever).
     - Taxonomia de ocupações CBO e competências tecnológicas (`taxonomies_skills.json`).
     - Frameworks de escrita de bullets (`bullet_mastery.json`: Fórmula XYZ do Google, Método STAR, verbos de ação em PT-BR).
     - Sistema de design e decisões do projeto (`design_system.json`, `decisions_log.json`).

2. **Cálculo de Score ATS Honesto & Híbrido:**
   - **Determinístico Primeiro:** Avalie dados de contato, cabeçalhos padronizados, datas e layout antes de chamar o LLM via `rag/engine/ats_evaluator.js`.
   - **Zero Promessa Falsa:** Nunca prometa "100% de aprovação no ATS" (plataformas como Greenhouse não reprovam automaticamente). Chame de *Índice de Compatibilidade e Legibilidade ATS*.
   - **Anti-Stuffing Ativo:** Penalize repetição mecânica ou blocos soltos de palavras-chave.
   - **Sub-scores Explicáveis:** Divida o score em legibilidade para parser, presença de métricas/verbos, requisitos obrigatórios e alinhamento de senioridade.

---

## 7. Diretrizes de Fine-Tuning & Não-Alucinação

1. **Fine-Tuning ensina formato e comportamento, não fatos.**
2. **Datasets Curados (`rag/fine_tuning/datasets/`):**
   - Pares estritamente validados no schema oficial do Gemini (`systemInstruction`, `contents` com `user` e `model`).
   - `bullet_rewriter.jsonl`: Transformação de bullets fracos para XYZ sem inventar fatos.
   - `cv_parser_structured.jsonl`: Extração precisa para JSON estruturado.
3. **Regra de Não-Alucinação (Anti-Hallucination):**
   - O modelo NUNCA pode inventar empresas, métricas, cursos ou diplomas que o usuário não possua. Se faltar a métrica exata, deve sugerir marcadores como `[~X%]` para validação humana.

---

## 8. Segurança de Entrada & Conformidade LGPD

1. **Sanitização de Injeção de Prompt:** Todo texto de CV e de vaga de emprego deve passar pelo `rag/engine/security_sanitizer.js` para neutralizar tentativas de prompt injection (`ignore previous instructions`, `system prompt override`, tags `<system>`).
2. **Proteção de Dados (LGPD):** Números de CPF são ofuscados automaticamente.
3. **Artigo 20 da LGPD (Revisão Humana):** O usuário tem o direito inalienável de revisar, editar e auditar qualquer alteração sugerida pela IA antes da exportação final do currículo.
