import { AITool } from '../tools';
import { z } from 'zod';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

export interface ReadUrlArgs {
  url: string;
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});
turndownService.remove(['script', 'noscript', 'style', 'head', 'nav', 'footer', 'aside', 'iframe', 'form']);

/**
 * Scrapes a URL, sanitizes the DOM to prevent IDPI, and returns clean Markdown.
 */
async function scrapeUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000) // 15 seconds timeout
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // IDPI Mitigation & Sanitization
  $('script, style, noscript, nav, footer, header, aside, iframe, svg, form, [style*="display: none"], [style*="display:none"]').remove();
  
  // Convert relative URLs to absolute URLs so the agent can navigate them
  $('a').each((_, el) => {
    const href = $(el).attr('href');
    if (href) {
      try {
        $(el).attr('href', new URL(href, url).href);
      } catch { /* ignore invalid */ }
    }
  });

  // Try to find the main content article
  let contentHtml = $('main').html() || $('article').html() || $('#content').html() || $('.content').html() || $('body').html() || html;
  
  const markdown = turndownService.turndown(contentHtml);
  return markdown;
}

export const readUrlTool: AITool = {
  name: 'read_url',
  description: 'Reads the content of a specific webpage URL. Fetches the page, removes ads/scripts/nav, and returns pure Markdown text. Use this to dive deep into a source discovered via search_web, or when the user provides a direct link.',
  parameters: {
    url: {
      type: 'string',
      description: 'The full URL of the webpage to read (e.g. "https://example.com").',
      required: true
    }
  },
  schema: z.object({
    url: z.string().url().describe("The exact URL to scrape")
  }),
  execute: async (args: Record<string, any>) => {
    try {
      const { url } = args as ReadUrlArgs;
      
      if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        return 'Error: You must provide a valid absolute URL starting with http:// or https://.';
      }

      let content = await scrapeUrl(url);

      // Truncate to prevent context window overflow (approx 12000 chars ~ 3000 tokens)
      const MAX_CHARS = 12000;
      if (content.length > MAX_CHARS) {
        content = content.substring(0, MAX_CHARS) + '\n\n...[Content truncated due to length limits]';
      }

      return `=== CONTENT EXTACTED FROM: ${url} ===\n\n${content}`;
    } catch (e: any) {
      return `Failed to read URL: ${e.message}`;
    }
  }
};
