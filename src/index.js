import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { scrapeAllCompanies } from './scraper.js';
import { filterJobs, getFilterStats } from './filter.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Loads company configuration
 */
function loadConfig() {
  const configPath = join(__dirname, '../config/companies.json');

  try {
    const configData = readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configData);

    // Filter out instruction entries and example
    const companies = config.companies.filter(
      company => !company.notes?.includes('example') && company.url
    );

    if (companies.length === 0) {
      console.error('\n❌ No companies configured!');
      console.error('Please add company URLs to config/companies.json\n');
      process.exit(1);
    }

    return companies;
  } catch (error) {
    console.error('❌ Error loading config:', error.message);
    process.exit(1);
  }
}

/**
 * Saves results to JSON file
 */
function saveResults(allJobs, filteredJobs, errors) {
  const outputDir = join(__dirname, '../output');
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `jobs-${timestamp}.json`;
  const filepath = join(outputDir, filename);

  // Ensure output directory exists
  try {
    mkdirSync(outputDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const output = {
    scrapedAt: new Date().toISOString(),
    totalJobs: filteredJobs.length,
    totalScraped: allJobs.length,
    errors: errors.length > 0 ? errors : undefined,
    jobs: filteredJobs
  };

  try {
    writeFileSync(filepath, JSON.stringify(output, null, 2));
    console.log(`\n✅ Results saved to: ${filepath}`);
    return filepath;
  } catch (error) {
    console.error('❌ Error saving results:', error.message);
    return null;
  }
}

/**
 * Displays summary statistics
 */
function displaySummary(allJobs, filteredJobs, errors) {
  const stats = getFilterStats(allJobs, filteredJobs);

  console.log('\n' + '='.repeat(60));
  console.log('SCRAPING SUMMARY');
  console.log('='.repeat(60));

  console.log(`\nTotal jobs found: ${stats.totalOriginal}`);
  console.log(`Jobs in Germany: ${stats.byLocation}`);
  console.log(`Junior positions: ${stats.byLevel}`);
  console.log(`Suitable experience: ${stats.byExperience}`);
  console.log(`\nFiltered results: ${stats.totalFiltered}`);
  console.log(`Removed: ${stats.removed}`);

  if (errors.length > 0) {
    console.log(`\n⚠️  Errors encountered: ${errors.length}`);
    errors.forEach(err => {
      console.log(`  - ${err.company}: ${err.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));

  // Display sample results
  if (filteredJobs.length > 0) {
    console.log('\nSample results (first 5):');
    filteredJobs.slice(0, 5).forEach((job, i) => {
      console.log(`\n${i + 1}. ${job.title}`);
      console.log(`   Company: ${job.company}`);
      console.log(`   Location: ${job.location}`);
      console.log(`   Experience: ${job.experienceYears}`);
      console.log(`   URL: ${job.url}`);
    });
  }
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Junior Software Developer Job Scraper');
  console.log('Target: Germany | Experience: ≤3 years\n');

  try {
    // Load configuration
    const companies = loadConfig();
    console.log(`Loaded ${companies.length} companies from config\n`);

    // Scrape all companies
    const results = await scrapeAllCompanies(companies);

    // Collect all jobs and errors
    const allJobs = [];
    const errors = [];

    results.forEach(result => {
      if (result.success) {
        allJobs.push(...result.jobs);
      } else {
        errors.push({
          company: result.company,
          error: result.error
        });
      }
    });

    // Filter jobs
    console.log('\n\nApplying filters...');
    const filteredJobs = filterJobs(allJobs);

    // Display summary
    displaySummary(allJobs, filteredJobs, errors);

    // Save results
    saveResults(allJobs, filteredJobs, errors);

    console.log('\n✨ Scraping complete!\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the scraper
main();
