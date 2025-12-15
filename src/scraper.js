import puppeteer from 'puppeteer';
import { parseJobListings } from './parser.js';

/**
 * Delays execution for a specified number of milliseconds
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Scrapes job listings from a single company's career page
 */
export async function scrapeCompany(company, browser) {
  const { name, url, selectors } = company;

  console.log(`\nScraping ${name}...`);
  console.log(`URL: ${url}`);

  let page;
  try {
    page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Navigate to the career page
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for dynamic content to load
    await delay(2000);

    // Scroll to load lazy-loaded content
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight / 2);
    });
    await delay(1000);
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await delay(1000);

    // Extract job listings using the parser
    const jobs = await parseJobListings(page, company);

    console.log(`Found ${jobs.length} job listings`);

    // Be polite - wait before closing
    await delay(2000);

    return {
      success: true,
      company: name,
      jobs,
      error: null
    };

  } catch (error) {
    console.error(`Error scraping ${name}: ${error.message}`);
    return {
      success: false,
      company: name,
      jobs: [],
      error: error.message
    };
  } finally {
    if (page) {
      await page.close();
    }
  }
}

/**
 * Scrapes all companies in the configuration
 */
export async function scrapeAllCompanies(companies) {
  console.log(`Starting scraper for ${companies.length} companies...\n`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];

  try {
    for (const company of companies) {
      const result = await scrapeCompany(company, browser);
      results.push(result);

      // Rate limiting: wait between companies
      if (companies.indexOf(company) < companies.length - 1) {
        console.log('Waiting before next company...');
        await delay(3000);
      }
    }
  } finally {
    await browser.close();
  }

  return results;
}
