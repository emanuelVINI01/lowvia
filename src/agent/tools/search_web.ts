import { AITool } from '../tools';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

export interface SearchWebArgs {
  queries: string[];
  time_range?: 'd' | 'w' | 'm' | 'y';
  allowed_domains?: string[];
  blocked_domains?: string[];
  max_uses?: number;
}

const turndownService = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced'
});
turndownService.remove(['script', 'noscript', 'style', 'head', 'nav', 'footer', 'aside', 'iframe', 'form']);

/**
 * Executes a DuckDuckGo HTML search and returns the top URLs and snippets.
 */
async function searchDuckDuckGo(query: string, time_range?: string): Promise<{ title: string, url: string, snippet: string }[]> {
  const params = new URLSearchParams({ q: query });
  if (time_range) {
    params.append('df', time_range);
  }
  
  const response = await fetch(`https://html.duckduckgo.com/html/?${params.toString()}`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`DuckDuckGo search failed with status ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const results: { title: string, url: string, snippet: string }[] = [];

  $('.result').each((_, el) => {
    const title = $(el).find('.result__title').text().trim();
    const rawLink = $(el).find('.result__url').attr('href') || '';
    const snippet = $(el).find('.result__snippet').text().trim();
    
    let url = rawLink;
    if (rawLink.includes('uddg=')) {
      try {
        const urlParams = new URLSearchParams(rawLink.split('?')[1]);
        url = decodeURIComponent(urlParams.get('uddg') || '');
      } catch (e) {
        url = rawLink;
      }
    } else if (rawLink.startsWith('/')) {
      url = `https://duckduckgo.com${rawLink}`;
    }

    if (title && url && !url.includes('duckduckgo.com/lite')) {
      results.push({ title, url, snippet });
    }
  });

  return results.slice(0, 5); // Return top 5
}

/**
 * Executes a Google Custom Search API request.
 * Requires GOOGLE_API_KEY and GOOGLE_CX environment variables.
 */
async function searchGoogleAPI(query: string, time_range?: string): Promise<{ title: string, url: string, snippet: string }[]> {
  const metaEnv = typeof import.meta !== 'undefined' ? (import.meta as any).env : {};
  const apiKey = process.env.GOOGLE_API_KEY || metaEnv?.VITE_GOOGLE_API_KEY;
  const cx = process.env.GOOGLE_CX || metaEnv?.VITE_GOOGLE_CX;
  
  if (!apiKey || !cx) {
    throw new Error('Google API Key or CX not configured');
  }

  const params = new URLSearchParams({
    key: apiKey,
    cx: cx,
    q: query,
  });

  if (time_range) {
    // Map d, w, m, y to Google dateRestrict formats
    params.append('dateRestrict', time_range);
  }

  const response = await fetch(`https://customsearch.googleapis.com/customsearch/v1?${params.toString()}`, {
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    throw new Error(`Google Search API failed with status ${response.status}`);
  }

  const data = await response.json();
  const results: { title: string, url: string, snippet: string }[] = [];

  if (data.items && Array.isArray(data.items)) {
    for (const item of data.items) {
      if (item.title && item.link) {
        results.push({
          title: item.title,
          url: item.link,
          snippet: item.snippet || ''
        });
      }
    }
  }

  return results.slice(0, 5);
}

/**
 * Scrapes a URL, sanitizes the DOM to prevent IDPI, and returns clean Markdown.
 */
async function scrapeUrl(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; LowviaBot/1.0; +http://lowvia.local)',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(15000) // 15 seconds timeout for scraping
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // IDPI Mitigation & Sanitization (Remove zero-sizing payloads, trackers, non-content tags)
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

/**
 * Basic Keyword Reranking (TF/BM25 approximation)
 * Splits markdown into chunks and returns the most relevant ones.
 */
function filterAndRerankChunks(markdown: string, query: string, maxTokensApprox: number = 2000): string {
  const chunks = markdown.split(/\n\n+|## /).map(c => c.trim()).filter(c => c.length > 50);
  const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  
  const scoredChunks = chunks.map(chunk => {
    const lowerChunk = chunk.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      // Very basic term frequency score
      const occurrences = (lowerChunk.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      if (occurrences > 0) score += occurrences + 1; // boost for containing the word at all
    }
    return { chunk, score };
  });

  // Sort by score descending
  scoredChunks.sort((a, b) => b.score - a.score);

  // Take top chunks until maxTokensApprox is reached (assuming 1 char ~ 0.25 tokens roughly, 1 token ~ 4 chars)
  let resultText = '';
  let currentCharCount = 0;
  const maxCharCount = maxTokensApprox * 4;

  for (const { chunk, score } of scoredChunks) {
    if (score === 0 && resultText.length > 0) continue; // Skip zero-score chunks if we already have some content
    
    if (currentCharCount + chunk.length > maxCharCount) {
      // Truncate the last chunk if needed, but it's better to just break
      if (currentCharCount === 0) {
        resultText = chunk.substring(0, maxCharCount) + '...';
      }
      break;
    }
    
    resultText += chunk + '\n\n...\n\n';
    currentCharCount += chunk.length;
  }

  return resultText.trim();
}

export const searchWebTool: AITool = {
  name: 'search_web',
  description: 'Executes a Deep Research web search. Use this for recent events, facts, or complex queries requiring multiple sources. Provide queries to search the web, scrape top results, and extract clean relevant context.',
  parameters: {
    queries: {
      type: 'array',
      items: { type: 'string' },
      description: 'An array of distinct search queries. Use query reformulation (Rephrase and Respond) to decompose complex requests into specific sub-queries.',
      required: true
    },
    time_range: {
      type: 'string',
      description: 'Optional. Restrict search to the past day (d), week (w), month (m), or year (y).',
      required: false
    },
    allowed_domains: {
      type: 'array',
      items: { type: 'string' },
      description: 'Optional. Restrict search to specific trusted domains (e.g., ["github.com", "wikipedia.org"]).',
      required: false
    },
    blocked_domains: {
      type: 'array',
      items: { type: 'string' },
      description: 'Optional. Exclude specific domains known for spam or irrelevant info.',
      required: false
    }
  },
  execute: async (args: Record<string, any>) => {
    try {
      const { queries, time_range, allowed_domains, blocked_domains } = args as SearchWebArgs;
      
      if (!queries || !Array.isArray(queries) || queries.length === 0) {
        return 'Error: You must provide an array of search queries.';
      }

      let aggregatedResults = '';

      // Limit to max 3 parallel queries to avoid rate limits
      const activeQueries = queries.slice(0, 3);

      for (let query of activeQueries) {
        // Apply domain filters directly to the DDG query using site: syntax
        if (allowed_domains && allowed_domains.length > 0) {
          query += ` site:${allowed_domains.join(' OR site:')}`;
        }
        if (blocked_domains && blocked_domains.length > 0) {
          query += ` -site:${blocked_domains.join(' -site:')}`;
        }

        aggregatedResults += `=== SEARCH RESULTS FOR: "${query}" ===\n`;

        try {
          // Attempt Google API first if configured
          let searchResults: { title: string, url: string, snippet: string }[] = [];
          let searchSource = 'Google';
          
          try {
            searchResults = await searchGoogleAPI(query, time_range);
          } catch (googleErr: any) {
            // Fallback to DuckDuckGo if Google API is not configured or fails
            searchSource = 'DuckDuckGo (Google API fallback)';
            searchResults = await searchDuckDuckGo(query, time_range);
          }
          
          if (searchResults.length === 0) {
            aggregatedResults += `No results found for "${query}" via ${searchSource}.\n\n`;
            continue;
          }

          // Limit to top 2 results to scrape per query to conserve bandwidth and context
          const topResults = searchResults.slice(0, 2);
          
          for (const res of topResults) {
            aggregatedResults += `Source (${searchSource}): [${res.title}](${res.url})\n`;
            try {
              const markdown = await scrapeUrl(res.url);
              // Rerank and extract only relevant chunks
              const relevantContext = filterAndRerankChunks(markdown, query);
              aggregatedResults += `Content:\n${relevantContext || res.snippet}\n\n`;
            } catch (err: any) {
              // Fallback to the DDG snippet if scraping fails (Fallback strategy)
              aggregatedResults += `Content (Snippet Only - Scrape Failed): ${res.snippet}\n\n`;
            }
          }
        } catch (searchErr: any) {
          aggregatedResults += `Search engine error for "${query}": ${searchErr.message}\n\n`;
        }
      }

      return aggregatedResults;
    } catch (e: any) {
      return `Failed to execute search_web: ${e.message}`;
    }
  }
};
