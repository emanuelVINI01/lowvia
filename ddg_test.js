const cheerio = require('cheerio');
fetch('https://html.duckduckgo.com/html/?q=test', { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' } })
  .then(r => r.text())
  .then(html => {
    const $ = cheerio.load(html);
    const results = [];
    $('.result').each((i, el) => {
      const title = $(el).find('.result__title').text().trim();
      const link = $(el).find('.result__url').attr('href');
      const snippet = $(el).find('.result__snippet').text().trim();
      if (title && link) results.push({ title, link, snippet });
    });
    console.log(results.slice(0, 3));
  });
