/**
 * Tries multiple CSS selectors and returns the first match
 */
function trySelectors(element, selectorString) {
  if (!selectorString) return null;

  const selectors = selectorString.split(',').map(s => s.trim());

  for (const selector of selectors) {
    try {
      const result = element.querySelector(selector);
      if (result) return result;
    } catch (e) {
      // Invalid selector, continue to next
      continue;
    }
  }

  return null;
}

/**
 * Tries multiple CSS selectors and returns all matches
 */
function trySelectorAll(element, selectorString) {
  if (!selectorString) return [];

  const selectors = selectorString.split(',').map(s => s.trim());

  for (const selector of selectors) {
    try {
      const results = element.querySelectorAll(selector);
      if (results && results.length > 0) return Array.from(results);
    } catch (e) {
      // Invalid selector, continue to next
      continue;
    }
  }

  return [];
}

/**
 * Extracts experience requirements from job description text
 */
function extractExperienceYears(description) {
  if (!description) return 'Not specified';

  const text = description.toLowerCase();

  // Patterns for experience requirements
  const patterns = [
    /(\d+)\+?\s*(?:-\s*(\d+))?\s*(?:years?|yrs?|jahre)\s*(?:of)?\s*(?:experience|erfahrung)/i,
    /(?:experience|erfahrung).*?(\d+)\+?\s*(?:-\s*(\d+))?\s*(?:years?|yrs?|jahre)/i,
    /(\d+)\+?\s*(?:-\s*(\d+))?\s*(?:jahre|years?|yrs?)/i
  ];

  for (const pattern of patterns) {
    const match = description.match(pattern);
    if (match) {
      const min = match[1];
      const max = match[2];
      return max ? `${min}-${max}` : `${min}+`;
    }
  }

  // Check for entry-level indicators
  if (
    text.includes('entry level') ||
    text.includes('entry-level') ||
    text.includes('berufseinsteiger') ||
    text.includes('no experience') ||
    text.includes('graduate') ||
    text.includes('junior')
  ) {
    return '0-2';
  }

  return 'Not specified';
}

/**
 * Parses job listings from a page
 */
export async function parseJobListings(page, company) {
  const { name: companyName, selectors } = company;

  // Extract job data using page.evaluate to run in browser context
  const jobs = await page.evaluate((selectors, companyName) => {
    // Helper functions (re-defined in browser context)
    function trySelectors(element, selectorString) {
      if (!selectorString) return null;
      const selectors = selectorString.split(',').map(s => s.trim());
      for (const selector of selectors) {
        try {
          const result = element.querySelector(selector);
          if (result) return result;
        } catch (e) {
          continue;
        }
      }
      return null;
    }

    function trySelectorAll(element, selectorString) {
      if (!selectorString) return [];
      const selectors = selectorString.split(',').map(s => s.trim());
      for (const selector of selectors) {
        try {
          const results = element.querySelectorAll(selector);
          if (results && results.length > 0) return Array.from(results);
        } catch (e) {
          continue;
        }
      }
      return [];
    }

    // Find all job listing elements
    const jobElements = trySelectorAll(document, selectors.jobList);

    if (jobElements.length === 0) {
      console.warn('No job listings found with the provided selectors');
      return [];
    }

    const extractedJobs = [];

    for (const jobElement of jobElements) {
      try {
        // Extract title
        const titleElement = trySelectors(jobElement, selectors.jobTitle);
        const title = titleElement ? titleElement.textContent.trim() : null;

        // Extract location
        const locationElement = trySelectors(jobElement, selectors.jobLocation);
        const location = locationElement ? locationElement.textContent.trim() : null;

        // Extract URL
        const linkElement = trySelectors(jobElement, selectors.jobLink);
        let url = null;
        if (linkElement) {
          url = linkElement.href;
          // Handle relative URLs
          if (url && !url.startsWith('http')) {
            url = new URL(url, window.location.origin).href;
          }
        }

        // Extract description for experience parsing
        const descElement = trySelectors(jobElement, selectors.jobDescription);
        const description = descElement ? descElement.textContent.trim() : null;

        // Only include if we at least have a title
        if (title) {
          extractedJobs.push({
            company: companyName,
            title,
            location: location || 'Not specified',
            url: url || window.location.href,
            description,
            extractedAt: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Error extracting job data:', error);
      }
    }

    return extractedJobs;
  }, selectors, companyName);

  // Process experience extraction in Node context
  const processedJobs = jobs.map(job => ({
    ...job,
    experienceYears: extractExperienceYears(job.description),
    // Remove description from final output to keep it clean
    description: undefined
  }));

  return processedJobs;
}
