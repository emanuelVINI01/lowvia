# Lowvia

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

<!-- TODO: Add a high-quality screenshot or GIF of your application here -->
> 🖼️ *Add a screenshot or GIF of Lowvia here to show off your UI!*

Lowvia is an AI assistant in the form of a desktop application (Electron), built with modern technologies such as **React, Vite, and Tailwind CSS**. It is designed to run local models via **Ollama** and features advanced native capabilities, including a **Deep Research** mode that autonomously searches and processes information from the web.

## 🚀 Key Features

- **Native Ollama & OpenRouter Integration:** Runs advanced language models locally on your computer via Ollama ensuring privacy, or connects to the cloud via **OpenRouter** for accessing state-of-the-art models like GPT-4, Claude 3, and more.
- **Autonomous Deep Research:** The assistant can formulate web searches, navigate found pages, scrape content, and analyze multiple links to cross-reference data before providing an answer.
- **Rich Rendering:** Native support for advanced Markdown formatting, syntax-highlighted code blocks (Highlight.js), and rendering of complex mathematical expressions (KaTeX).
- **Exporting:** Support for converting and generating direct PDF reports.
- **Fluid Interface:** Developed in React with animations by Framer Motion and a responsive UI using Tailwind CSS.
- **Premium Design:** Interface based on the modern *Yaru Purple* theme with elegant typography (*Plus Jakarta Sans* and *JetBrains Mono*) and micro-animations.

---

## 💬 Interactive Commands

Lowvia accepts special commands directly in the text input bar:

- **`/deep-research <your search>`** or **`/pesquisa-profunda`**: Activates the detailed research mode. Lowvia will perform cross-referenced web searches, extract content from multiple sources via web scraping, and create an exhaustive report.
- **`/code <your problem>`** or **`/codigo`**: Activates the Senior Developer mode. Focuses on clean architectures, best practices, and generates the final files via utilities.
- **`/model <model-name>`**: Changes the language model configured in Ollama at runtime (e.g., `/model llama3`).

---

## 📦 Prerequisites

Before installing, make sure your machine meets the following requirements:

1. **[Node.js](https://nodejs.org/en/)**: Version 18 or higher.
2. **[Git](https://git-scm.com/)**: To clone the repository.
3. **[Ollama](https://ollama.com/)**: The engine for local models. It must be installed and running in the background on your machine (default port `11434`).

> **Note on Ollama:** After installing Ollama, ensure you have downloaded a model, as the assistant will need one. You can pull a model by opening your terminal and typing:
> `ollama run llama3` (or any other model of your choice).

---

## 🛠️ How to Download and Install

**1. Clone this repository:**
Open your terminal and run the following command:
```bash
git clone https://github.com/emanuelVINI01/lowvia.git
cd lowvia
```

*(If you only have the files locally, navigate to the project folder using `cd /path/to/lowvia`)*

**2. Install dependencies:**
Use NPM (included with Node.js) to install all required libraries:
```bash
npm install
```

---

## 📖 Tutorial: Getting Started with Providers

Lowvia supports both local models (Ollama) and cloud models (OpenRouter).

### Using Local Models (Ollama)
1. Make sure Ollama is running in the background.
2. In the Lowvia settings, select **Ollama** as your provider.
3. The default host is `http://127.0.0.1:11434`.
4. Make sure you have pulled at least one model via terminal (e.g., `ollama run llama3`).

### Using Cloud Models (OpenRouter)
If your computer cannot run heavy local models, or if you want to use advanced models like GPT-4o or Claude 3.5 Sonnet, you can use OpenRouter:
1. Create an account at [OpenRouter](https://openrouter.ai/).
2. Generate an API Key in your OpenRouter account settings.
3. Open Lowvia, go to the settings menu, and switch the provider to **OpenRouter**.
4. Paste your API Key in the designated field.
5. Select the model you wish to use (e.g., `openai/gpt-4o`).

---

## 💻 Configuration and Development

The environment is fully configured via `electron-forge` and Vite. There is no need to create complex `.env` files; the agent connects natively to the local Ollama instance.

To start the application in **Development Mode** (with *Hot Reloading*):
```bash
npm run dev
```
*(The `npm start` command works equivalently).*

Once you run the command, Vite will compile the React code (Front-end) and open the application's native Electron window.

---

## 🏗️ How to Generate the Executable (Build and Deploy)

If you want to export the application to share with users or install on your machine without needing the terminal, you can generate final executable binaries (such as `.deb`, `.rpm`, `.zip`, or installers for Windows/Mac, depending on your current Operating System).

**1. Package the application** (Only generates the folder with executable binaries):
```bash
npm run package
```
The packaged files will be available in the `out/` folder.

**2. Create Installers (Make)** (Creates full installation files):
```bash
npm run make
```
This uses Electron Forge to compile the application into a ready-to-use distributable installer (available under `out/make/`). On Linux, it generates `.deb` files.

---

## 📚 Technologies Used

- **Core:** Electron, Node.js
- **Interface:** React 19, Redux Toolkit, TailwindCSS v4, Framer Motion, Lucide React
- **Build & Compilation:** Vite, TypeScript, Electron Forge
- **Artificial Intelligence:** Ollama (Local), OpenRouter (Cloud API)
- **Scraping and Research:** googlethis, cheerio, turndown
- **Rendering & Export:** react-markdown, remark-gfm, remark-math, rehype-katex, rehype-highlight, html2pdf.js

---

## 🤖 Agents Architecture

Lowvia relies on a structured agent architecture to handle complex requests. To learn more about how the agents are structured and operate under the hood, please read our [Agents Documentation](AGENTS.MD).

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! 
Feel free to check the [issues page](https://github.com/emanuelVINI01/lowvia/issues). For more detailed instructions on how to contribute, please see our [Contribution Guidelines](CONTRIBUTING.md).

---

## 📝 License

This project is licensed under the [MIT License](LICENSE). You are free to use, modify, and distribute it.
