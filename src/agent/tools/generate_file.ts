import { AITool } from '../tools';
import { marked } from 'marked';
// @ts-ignore
import html2pdf from 'html2pdf.js';

export interface GenerateFileArgs {
  filename: string;
  content: string;
}

export const generateFileTool: AITool = {
  name: 'generate_file',
  description: 'Generates a file and downloads it to the user\'s computer. Supports PDF (.pdf), Markdown (.md), Text (.txt), HTML (.html), or Code (.ts, .py, etc). If generating a PDF, the content must be Markdown and it will be rendered into a beautiful formatted PDF. For other extensions, the content will be saved raw.',
  parameters: {
    filename: {
      type: 'string',
      description: 'The exact filename with extension (e.g., "report.pdf", "data.md", "script.py", "summary.txt").',
      required: true
    },
    content: {
      type: 'string',
      description: 'The complete content of the file. If filename ends in .pdf, this must be Markdown which will be converted to PDF. Otherwise, it will be saved exactly as provided.',
      required: true
    }
  },
  execute: async (args: Record<string, any>) => {
    try {
      const { filename, content } = args as GenerateFileArgs;
      
      if (!filename || !content) {
        return 'Error: Both filename and content are required.';
      }

      const extension = filename.split('.').pop()?.toLowerCase();

      // Handling PDF Generation
      if (extension === 'pdf') {
        const parsedHtml = await marked.parse(content);

        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '-9999px';
        container.style.width = '800px'; 
        container.style.padding = '40px';
        container.style.backgroundColor = 'white';
        container.style.color = 'black';
        container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        
        container.innerHTML = `
          <style>
            h1, h2, h3 { color: #111; margin-top: 1.5em; margin-bottom: 0.5em; }
            h1 { border-bottom: 2px solid #eaeaea; padding-bottom: 0.3em; }
            p { line-height: 1.6; margin-bottom: 1em; color: #333; }
            code { background: #f4f4f4; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.9em; }
            pre { background: #f4f4f4; padding: 15px; border-radius: 6px; overflow-x: auto; margin-bottom: 1em; }
            pre code { background: transparent; padding: 0; }
            blockquote { border-left: 4px solid #ddd; padding-left: 15px; color: #666; margin-left: 0; }
            ul, ol { margin-bottom: 1em; padding-left: 20px; }
            li { margin-bottom: 0.5em; line-height: 1.6; color: #333;}
            table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f9f9f9; }
            a { color: #0366d6; text-decoration: none; }
          </style>
          <div>
            <p style="text-align: right; color: #999; font-size: 0.8em; margin-bottom: 2em;">Gerado por Lowvia Agent</p>
            ${parsedHtml}
          </div>
        `;

        document.body.appendChild(container);

        const opt = {
          margin:       15,
          filename:     filename,
          image:        { type: 'jpeg' as const, quality: 0.98 },
          html2canvas:  { scale: 2, useCORS: true },
          jsPDF:        { unit: 'mm' as const, format: 'a4', orientation: 'portrait' as const }
        };

        await html2pdf().set(opt).from(container).save();
        document.body.removeChild(container);

      } else {
        // Handling RAW File Generation (MD, TXT, HTML, PY, etc)
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 1000);
      }

      return `Successfully generated and saved file: "${filename}".`;
    } catch (e: any) {
      return `Failed to generate file: ${e.message}`;
    }
  }
};
