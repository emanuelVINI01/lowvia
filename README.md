# Lowvia

Lowvia é um assistente de inteligência artificial em formato de aplicação desktop (Electron), construído com tecnologias modernas como **React, Vite e Tailwind CSS**. Ele foi projetado para rodar modelos locais via **Ollama** e possui capacidades nativas avançadas, incluindo um modo de **Pesquisa Profunda (Deep Research)** que busca e processa informações da web autonomamente.

## 🚀 Principais Funcionalidades

- **Integração Nativa com Ollama:** Executa modelos de linguagem avançados localmente no seu computador, garantindo total privacidade e funcionamento offline (exceto para funcionalidades que precisem da internet, como as pesquisas).
- **Pesquisa Profunda Autônoma (Deep Research):** O assistente é capaz de formular pesquisas na web, navegar nas páginas encontradas, fazer *scraping* do conteúdo e analisar múltiplos links cruzando dados antes de dar uma resposta.
- **Renderização Rica:** Suporte nativo para formatação em Markdown avançada, blocos de código com highlight (Highlight.js) e renderização de expressões matemáticas complexas (KaTeX).
- **Exportação:** Suporte a conversão e geração de relatórios diretos para PDF.
- **Interface Fluida:** Desenvolvido em React com animações pelo Framer Motion e UI responsiva usando Tailwind CSS.
- **Design Premium:** Interface baseada no tema moderno *Yaru Purple* com tipografia elegante (*Plus Jakarta Sans* e *JetBrains Mono*) e micro-animações.

---

## 💬 Comandos Interativos

Lowvia aceita comandos especiais diretamente na barra de entrada de texto:

- **`/pesquisa-profunda`** ou **`/deep-research <sua busca>`**: Ativa o modo de pesquisa detalhado. Lowvia fará pesquisas web cruzadas, extrairá conteúdo de múltiplas fontes via web scraping e criará um relatório exaustivo.
- **`/codigo`** ou **`/code <seu problema>`**: Ativa o modo Desenvolvedor Sênior. Foca em arquiteturas limpas, melhores práticas e gera os ficheiros finais via utilitários.
- **`/model <nome-do-modelo>`**: Troca em tempo de execução o modelo de linguagem configurado no Ollama (exemplo: `/model llama3`).

---

## 📦 Pré-requisitos

Antes de instalar, certifique-se de que a sua máquina atende aos seguintes requisitos:

1. **[Node.js](https://nodejs.org/pt-br/)**: Versão 18 ou superior.
2. **[Git](https://git-scm.com/)**: Para clonar o repositório.
3. **[Ollama](https://ollama.com/)**: O motor de modelos locais. Tem de estar instalado e a correr em *background* na sua máquina (por padrão na porta `11434`).

> **Nota sobre o Ollama:** Após instalar o Ollama, garanta que descarregou algum modelo, pois o assistente vai precisar dele. Você pode puxar um modelo abrindo o terminal e digitando:
> `ollama run llama3` (ou outro modelo da sua preferência).

---

## 🛠️ Como Baixar e Instalar

**1. Clone este repositório:**
Abra o seu terminal e rode o seguinte comando:
```bash
git clone https://github.com/emanuelVINI01/lowvia.git
cd lowvia
```
*(Se estiver apenas com os ficheiros na máquina local, navegue até à pasta do projeto usando `cd /caminho/para/lowvia`)*

**2. Instale as dependências:**
Utilize o NPM (que vem incluído no Node.js) para instalar todas as bibliotecas necessárias:
```bash
npm install
```

---

## 💻 Configuração e Desenvolvimento

O ambiente já está totalmente configurado através do `electron-forge` e do Vite. Não é necessário criar ficheiros `.env` complexos, o agente conecta-se de forma nativa ao Ollama local.

Para iniciar a aplicação em **Modo de Desenvolvimento** (com *Hot Reloading*):
```bash
npm run dev
```
*(O comando `npm start` também funciona de forma equivalente).*

Assim que executar o comando, o Vite irá compilar o código do React (Front-end) e abrirá a janela nativa do Electron da aplicação.

---

## 🏗️ Como Gerar o Executável (Build e Deploy)

Se quiser exportar a aplicação para partilhar com os seus utilizadores ou instalar na sua máquina sem precisar do terminal, pode gerar os binários executáveis finais (como `.deb`, `.rpm`, `.zip` ou instaladores para Windows/Mac, dependendo do seu Sistema Operativo atual).

**1. Empacotar a aplicação** (Apenas gera a pasta com os binários executáveis):
```bash
npm run package
```
Os ficheiros empacotados ficarão disponíveis na pasta `out/`.

**2. Criar os Instaladores (Make)** (Cria os ficheiros de instalação completos):
```bash
npm run make
```
Isto usará o Electron Forge para compilar a aplicação num instalador distribuível pronto a usar (disponível sob `out/make/`). No Linux, gera arquivos do tipo `.deb`.

---

## 📚 Tecnologias Utilizadas

- **Core:** Electron, Node.js
- **Interface:** React 19, Redux Toolkit, TailwindCSS v4, Framer Motion, Lucide React
- **Build & Compilação:** Vite, TypeScript, Electron Forge
- **Inteligência Artificial:** Ollama (NPM package)
- **Scraping e Research:** googlethis, cheerio, turndown
- **Renderização e Exportação:** react-markdown, remark-gfm, remark-math, rehype-katex, rehype-highlight, html2pdf.js

---

## 📝 Licença

Este projeto está sob a licença [MIT](LICENSE). Pode utilizá-lo livremente, modificá-lo e distribuí-lo.
