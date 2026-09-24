# Academia+ ⚡🏋️‍♂️

> Aplicativo móvel de acompanhamento de treinos e nutrição intuitiva de **baixíssimo esforço cognitivo ("clicou, fez")**, com foco em ergonomia no **Samsung Galaxy A54 (19.5:9)**, estética **Light Mode Premium Minimalista**, funcionamento **100% Offline-First** via **IndexedDB (Dexie.js)** e pronto para deploy contínuo na **Vercel via GitHub**.

---

## ✨ Principais Diferenciais & Funcionalidades

### 1. 🎨 Design System: Light Mode Premium (Galaxy A54)
- **Zero Dark Mode**: Paleta clara de alto contraste (branco puro `#ffffff`, bases suaves `#f8fafc` / `#f1f5f9`, bordas discretas `#e2e8f0`).
- **Cores Funcionais:**
  - **Azul Cobalto / Elétrico (`#2563eb`):** Ações primárias, rotinas e destaques.
  - **Verde Esmeralda (`#10b981`):** Séries batidas e metas diárias atingidas.
  - **Coral / Vermelho Vibrante (`#ef4444`):** Botão de fadiga muscular (X) e botões de escape calórico.
- **Ergonomia do Polegar (Thumb Zone):**
  - Alvos de toque com no mínimo **48px** de altura.
  - Navegação inferior ancorada com safe-areas para tela 19.5:9 do Galaxy A54.
  - Microinterações táteis e feedback auditivo suave via **Web Audio API** (sem arquivos mp3 externos).

---

### 2. 🏋️‍♂️ Módulo de Treinos (ABCD sem Vínculo de Dia Fixo)
- **Rotina Pré-Carregada de Alta Performance:**
  - **Treino A (PULL):** Barra Fixa no Graviton, Remada Baixa na Polia, Crucifixo Invertido Peck Deck, Rosca Direta Banco Inclinado, Rosca Martelo.
  - **Treino B (LOWER 1):** Leg Press 45° Bilateral, Cadeira Extensora, Cadeira Flexora, Leg Press 45° Unilateral, Elevação de Panturrilha em Pé, Abdominal Polia Alta Corda.
  - **Treino C (PUSH):** Supino Reto, Supino Inclinado c/ Halteres, Elevação Lateral Polia Baixa, Crucifixo Peck Deck, Mergulho Paralelas Graviton, Tríceps Polia Corda, Tríceps Francês.
  - **Treino D (LOWER 2):** Stiff / RDL c/ Halteres, Leg Press 45° Pés Altos/Afastados, Cadeira Flexora, Cadeira Extensora, Panturrilha em Pé, Abdominal Polia Corda.
- **Card de Exercício de Fricção Zero:**
  - **Carga pré-preenchida** com a última sessão realizada.
  - Botões rápidos de incremento **`[-2kg]`** e **`[+2kg]`** e digitação direta.
  - **Blocos arredondados de séries:** 1 tap marca a série como feita (animação esmeralda) e **dispara o timer de descanso automaticamente**.
  - **Botão "Substituir":** Modal com 2 a 3 variações equivalentes pré-cadastradas para troca instantânea no dia.
  - **Botão "Pular por Fadiga" (X Vermelho):** Salva o motivo de interrupção por falha no histórico.
- **Timer de Descanso Flutuante Desacoplado:**
  - Permanece ativo na base da tela sem travar a navegação.
  - Controles de `+30s`, `-15s`, pausar e bip sonoro + vibração ao zerar.
- **Finalização Comemorativa:**
  - Cálculo automático de tonelagem total levantada (kg × reps), animação de confetes e avanço do ciclo ABCD.

---

### 3. 🥗 Nutrição Intuitiva & Controle de Escapes
- **Perfil do Usuário:** Homem, 21 anos, 1,85 m, 98 kg (Recomposição Corporal, 185g proteína, 4.0L água).
- **Toggle Mestre de Suplementação:**
  - `[ Tomou Whey hoje? (+50g proteína / 2 scoops) ]`
  - Se ATIVADO: Reduz dinamicamente a meta de sólidos para **~135g**.
  - Se DESLIGADO: Alerta sutil para reforçar carnes/ovos no almoço e jantar (**~185g sólidos**).
- **Taps Rápidos por Refeição:**
  - **Café da manhã:** `Café c/ Leite` | `Café c/ Leite + Tapioca c/ Queijo` | `Adicionei Ovos`
  - **Almoço:** `Padrão (2 bifes + arroz/feijão)` | `Pesado (3 bifes)` | `Leve`
  - **Lanche:** `Sem lanche` | `Tapioca c/ Café` | `Shake`
  - **Jantar:** `Subway (carne/salada)` | `Prato caseiro c/ carne` | `Outro`
- **Água (Meta 4,0L):**
  - Barra de progresso e botões `+250ml (Copo)`, `+500ml (Garrafa)` e `-250ml`.
- **Botões Rápidos de Escape Calórico (Sem Culpa):**
  - **`+ Besteira (~600 kcal)`:** Cookies, Eskibom, bolo (contador cumulativo diário).
  - **`+ Super Besteira (~1.200 a 1.500+ kcal)`:** Refeição livre / rodízio com feedback objetivo:
    > *"Super besteira registrada. Mantenha os treinos pesados amanhã e foque na hidratação."*

---

### 4. 📈 Evolução, Métricas & Backup
- **Pesagem Semanal:** Registro rápido de peso com gráfico SVG minimalista de evolução.
- **Sobrecarga Progressiva:** Gráfico de linha interativo por exercício selecionado mostrando a evolução da carga máxima ao longo do tempo com badge de PR (Recorde Pessoal).
- **Histórico Completo de Sessões:** Listagem de treinos anteriores com total de séries e volume.
- **Backup & Restauração JSON:**
  - Exportação completa de todas as tabelas em arquivo `academia_backup_YYYY-MM-DD.json`.
  - Importação e restauração com validação e confirmação.

---

## 🚀 Como Executar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor de desenvolvimento local
npm run dev

# 3. Compilar e testar a versão final PWA
npm run build
npm run preview
```

---

## 📱 Instalação no Samsung Galaxy A54 (PWA)

1. Acesse o endereço da aplicação no navegador **Google Chrome** ou **Samsung Internet**.
2. Toque no botão de menu (os **3 pontinhos ⋮** no canto superior direito).
3. Toque em **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
4. O app será instalado como um aplicativo nativo independente, sem barras do navegador, com suporte a **tela cheia**, **vibração háptica** e **funcionamento 100% offline**.

---

## 🌐 Deploy Contínuo na Vercel via GitHub

O projeto já está estruturado com `vercel.json` (rewrites SPA) e Service Worker com auto-atualização (`registerType: 'autoUpdate'`).

1. Crie um repositório no seu GitHub (ex: `Academia-Plus`).
2. Vincule o repositório local e envie os commits:
   ```bash
   git remote add origin https://github.com/SEU-USUARIO/Academia-Plus.git
   git branch -M main
   git push -u origin main
   ```
3. Acesse [vercel.com](https://vercel.com) e clique em **"Add New Project"**.
4. Importe o repositório do GitHub. O Vercel detectará o Vite automaticamente.
5. Clique em **Deploy**.
6. **Pronto!** Sempre que fizer um `git push`, a Vercel compila e seu celular se atualiza automaticamente em segundo plano quando você abrir o aplicativo.
