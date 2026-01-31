/**
 * Web Plugin - Autonomous web browsing and research
 * Scrape, search, and synthesize information from the internet
 */

import puppeteer from 'puppeteer';

let browser = null;
let page = null;

async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browser;
}

async function getPage() {
    if (!page || page.isClosed()) {
        const b = await getBrowser();
        page = await b.newPage();
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    }
    return page;
}

const tools = [
    {
        name: 'web_search',
        description: 'Search the web and return summarized results. Use this to find current information.',
        parameters: {
            type: 'object',
            properties: {
                query: { type: 'string', description: 'Search query' },
                num_results: { type: 'number', description: 'Number of results to return (default: 5)' }
            },
            required: ['query']
        },
        async execute({ query, num_results = 5 }) {
            try {
                const p = await getPage();
                const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

                await p.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 15000 });

                // Extract search results
                const results = await p.evaluate((limit) => {
                    const items = [];
                    document.querySelectorAll('.g').forEach((el, i) => {
                        if (i >= limit) return;
                        const title = el.querySelector('h3')?.textContent || '';
                        const link = el.querySelector('a')?.href || '';
                        const snippet = el.querySelector('.VwiC3b')?.textContent || '';
                        if (title && link) {
                            items.push({ title, link, snippet });
                        }
                    });
                    return items;
                }, num_results);

                if (results.length === 0) {
                    return 'No search results found.';
                }

                return results.map((r, i) =>
                    `${i + 1}. **${r.title}**\n   ${r.link}\n   ${r.snippet}`
                ).join('\n\n');

            } catch (error) {
                return `Search failed: ${error.message}`;
            }
        }
    },
    {
        name: 'browse_webpage',
        description: 'Visit a webpage and extract its main content. Use for reading articles, documentation, etc.',
        parameters: {
            type: 'object',
            properties: {
                url: { type: 'string', description: 'URL to visit' },
                extract: {
                    type: 'string',
                    description: 'What to extract: "text" (main content), "html" (raw HTML), "links" (all links), "tables" (data tables)'
                }
            },
            required: ['url']
        },
        async execute({ url, extract = 'text' }) {
            try {
                const p = await getPage();
                await p.goto(url, { waitUntil: 'networkidle2', timeout: 20000 });

                let result;

                switch (extract) {
                    case 'html':
                        result = await p.content();
                        break;

                    case 'links':
                        result = await p.evaluate(() => {
                            return Array.from(document.querySelectorAll('a[href]'))
                                .map(a => ({ text: a.textContent?.trim(), href: a.href }))
                                .filter(l => l.text && l.href.startsWith('http'))
                                .slice(0, 50);
                        });
                        result = result.map(l => `- [${l.text}](${l.href})`).join('\n');
                        break;

                    case 'tables':
                        result = await p.evaluate(() => {
                            const tables = [];
                            document.querySelectorAll('table').forEach((table, i) => {
                                const rows = [];
                                table.querySelectorAll('tr').forEach(tr => {
                                    const cells = Array.from(tr.querySelectorAll('td, th'))
                                        .map(cell => cell.textContent?.trim());
                                    rows.push(cells.join(' | '));
                                });
                                tables.push(`Table ${i + 1}:\n${rows.join('\n')}`);
                            });
                            return tables.join('\n\n');
                        });
                        break;

                    default: // text
                        result = await p.evaluate(() => {
                            // Try to find main content
                            const selectors = ['article', 'main', '.content', '.post', '#content', '.article'];
                            for (const sel of selectors) {
                                const el = document.querySelector(sel);
                                if (el) return el.textContent?.trim();
                            }
                            // Fallback to body
                            return document.body.innerText.slice(0, 10000);
                        });
                }

                // Truncate if too long
                if (typeof result === 'string' && result.length > 8000) {
                    result = result.slice(0, 8000) + '\n\n[Content truncated...]';
                }

                return result;

            } catch (error) {
                return `Failed to browse ${url}: ${error.message}`;
            }
        }
    },
    {
        name: 'fill_form',
        description: 'Fill out a form on a webpage',
        parameters: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'CSS selector for the input field' },
                value: { type: 'string', description: 'Value to enter' }
            },
            required: ['selector', 'value']
        },
        async execute({ selector, value }) {
            try {
                const p = await getPage();
                await p.type(selector, value);
                return `Filled ${selector} with value`;
            } catch (error) {
                return `Failed to fill form: ${error.message}`;
            }
        }
    },
    {
        name: 'click_element',
        description: 'Click an element on the current webpage',
        parameters: {
            type: 'object',
            properties: {
                selector: { type: 'string', description: 'CSS selector for element to click' }
            },
            required: ['selector']
        },
        async execute({ selector }) {
            try {
                const p = await getPage();
                await p.click(selector);
                await p.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => { });
                return `Clicked ${selector}`;
            } catch (error) {
                return `Failed to click: ${error.message}`;
            }
        }
    },
    {
        name: 'screenshot_webpage',
        description: 'Take a screenshot of the current webpage',
        parameters: {
            type: 'object',
            properties: {
                path: { type: 'string', description: 'Path to save screenshot (optional)' }
            }
        },
        async execute({ path = '/tmp/webpage_screenshot.png' }) {
            try {
                const p = await getPage();
                await p.screenshot({ path, fullPage: false });
                return `Screenshot saved to ${path}`;
            } catch (error) {
                return `Screenshot failed: ${error.message}`;
            }
        }
    },
    {
        name: 'research_topic',
        description: 'Deep research on a topic - searches multiple sources and synthesizes information',
        parameters: {
            type: 'object',
            properties: {
                topic: { type: 'string', description: 'Topic to research' },
                depth: { type: 'string', description: 'Research depth: "quick" (3 sources), "normal" (5), "deep" (10)' }
            },
            required: ['topic']
        },
        async execute({ topic, depth = 'normal' }) {
            const numSources = { quick: 3, normal: 5, deep: 10 }[depth] || 5;

            try {
                const p = await getPage();

                // Search Google
                await p.goto(`https://www.google.com/search?q=${encodeURIComponent(topic)}`, {
                    waitUntil: 'networkidle2',
                    timeout: 15000
                });

                // Get search result links
                const links = await p.evaluate((limit) => {
                    return Array.from(document.querySelectorAll('.g a'))
                        .map(a => a.href)
                        .filter(h => h.startsWith('http') && !h.includes('google.com'))
                        .slice(0, limit);
                }, numSources);

                // Visit each link and extract content
                const research = [];
                for (const link of links.slice(0, numSources)) {
                    try {
                        await p.goto(link, { waitUntil: 'domcontentloaded', timeout: 10000 });

                        const content = await p.evaluate(() => {
                            const title = document.title;
                            const selectors = ['article', 'main', '.content', '.post'];
                            for (const sel of selectors) {
                                const el = document.querySelector(sel);
                                if (el) return { title, text: el.textContent?.slice(0, 2000) };
                            }
                            return { title, text: document.body.innerText.slice(0, 2000) };
                        });

                        research.push({
                            url: link,
                            title: content.title,
                            excerpt: content.text?.slice(0, 500)
                        });
                    } catch (e) {
                        // Skip failed pages
                    }
                }

                if (research.length === 0) {
                    return 'Could not gather research on this topic.';
                }

                return research.map((r, i) =>
                    `**Source ${i + 1}: ${r.title}**\nURL: ${r.url}\n${r.excerpt}...`
                ).join('\n\n---\n\n');

            } catch (error) {
                return `Research failed: ${error.message}`;
            }
        }
    }
];

// Cleanup on exit
process.on('exit', async () => {
    if (browser) await browser.close();
});

export default { tools };
