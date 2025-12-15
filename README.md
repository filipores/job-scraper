# Job Scraper

A Node.js web scraper for finding junior software developer positions in Germany from company career pages.

## Features

- **Targeted Scraping**: Scrapes job listings directly from company career pages (not job boards)
- **Smart Filtering**: Automatically filters for:
  - Junior positions (entry-level, graduate, 0-3 years experience)
  - Germany locations (all major cities and regions)
  - Suitable experience requirements (≤3 years)
- **Configurable**: Easy-to-customize selectors for different career page structures
- **Polite Scraping**: Includes rate limiting and realistic user agents
- **Detailed Output**: JSON output with job title, location, URL, and experience requirements

## Prerequisites

- Node.js (v14 or higher)
- npm

## Installation

1. Clone or download this repository
2. Install dependencies:

```bash
npm install
```

## Configuration

### Adding Companies

Edit `config/companies.json` to add the companies you want to scrape:

```json
{
  "companies": [
    {
      "name": "Company Name",
      "url": "https://company.com/careers",
      "selectors": {
        "jobList": ".job-listing, .career-item",
        "jobTitle": ".job-title, h3",
        "jobLocation": ".location, .job-location",
        "jobLink": "a[href*='job']",
        "jobDescription": ".description, .job-details"
      }
    }
  ]
}
```

### Finding CSS Selectors

1. **Visit the career page** you want to scrape
2. **Right-click** on a job title → Select "Inspect"
3. **Look for patterns** in the HTML structure
4. **Test selectors** in browser console: `document.querySelectorAll('.job-title')`

### Selector Tips

- **Provide multiple selectors** separated by commas as fallbacks
- **Common platforms** to look for:
  - Greenhouse: `.opening`, `.job-title`
  - Lever: `.posting`, `.posting-title`
  - Workday: `[data-automation-id*="job"]`
  - Personio: `.job-list-item`

## Usage

Run the scraper:

```bash
npm start
```

Or:

```bash
npm run scrape
```

## Output

Results are saved to `output/jobs-[timestamp].json`:

```json
{
  "scrapedAt": "2025-12-15T20:00:00.000Z",
  "totalJobs": 25,
  "totalScraped": 100,
  "jobs": [
    {
      "company": "Company Name",
      "title": "Junior Software Developer",
      "location": "Berlin, Germany",
      "url": "https://company.com/careers/job/123",
      "experienceYears": "0-2",
      "extractedAt": "2025-12-15T20:00:00.000Z"
    }
  ]
}
```

## Filtering Logic

### Location Filter
Jobs are included if they mention:
- Germany, Deutschland
- Major German cities (Berlin, Munich, Hamburg, etc.)
- German regions (Bavaria, NRW, etc.)
- Remote positions in Germany

### Junior Position Filter
Jobs are included if they:
- Mention junior keywords (junior, entry-level, graduate, trainee)
- Require ≤3 years of experience
- Do NOT mention senior keywords (senior, lead, principal, etc.)

### Experience Filter
Jobs are included if they require:
- 0-3 years of experience
- Not specified (might be junior)

## Project Structure

```
job-scraper/
├── config/
│   └── companies.json      # Company configuration
├── src/
│   ├── index.js           # Main entry point
│   ├── scraper.js         # Puppeteer scraping logic
│   ├── parser.js          # HTML parsing & data extraction
│   └── filter.js          # Job filtering logic
├── output/                # Scraped results (JSON files)
├── package.json
└── README.md
```

## Troubleshooting

### No jobs found

1. **Check selectors**: Visit the career page and verify your CSS selectors
2. **Check console output**: Look for any error messages
3. **Inspect page structure**: Some pages load content dynamically

### Getting blocked

1. **Increase delays**: Edit `src/scraper.js` to add longer delays
2. **Check robots.txt**: Ensure scraping is allowed (`https://company.com/robots.txt`)
3. **Reduce frequency**: Don't run the scraper too often

### Wrong jobs in results

1. **Adjust filter keywords**: Edit `src/filter.js` to add/remove keywords
2. **Update experience parsing**: Modify experience extraction in `src/parser.js`
3. **Refine selectors**: Make selectors more specific in `companies.json`

## Customization

### Modify Filtering Criteria

Edit `src/filter.js`:
- Add cities to `GERMANY_KEYWORDS`
- Add keywords to `JUNIOR_KEYWORDS`
- Adjust experience threshold in `isSuitableExperience()`

### Change Scraping Behavior

Edit `src/scraper.js`:
- Adjust delays between requests
- Modify timeout values
- Change scrolling behavior for lazy-loaded content

### Customize Output Format

Edit `src/index.js`:
- Modify the `saveResults()` function
- Change filename format
- Add additional metadata

## Best Practices

- **Respect robots.txt**: Check if scraping is allowed
- **Be polite**: Don't scrape too frequently (built-in delays help)
- **Test selectors**: Verify on a few companies before adding many
- **Update regularly**: Career page structures may change over time
- **Legal compliance**: Ensure scraping complies with website terms of service

## Notes

- The scraper runs headless by default (no browser window)
- Results include timestamps for tracking when jobs were found
- Duplicate jobs (same URL) are automatically removed
- Failed scrapes for individual companies don't stop the entire process

## License

MIT
