/**
 * German cities and regions for location filtering
 */
const GERMANY_KEYWORDS = [
  // Country names
  'germany',
  'deutschland',
  'german',
  // Major cities
  'berlin',
  'munich',
  'münchen',
  'hamburg',
  'cologne',
  'köln',
  'frankfurt',
  'stuttgart',
  'düsseldorf',
  'dusseldorf',
  'dortmund',
  'essen',
  'leipzig',
  'bremen',
  'dresden',
  'hanover',
  'hannover',
  'nuremberg',
  'nürnberg',
  'duisburg',
  'bochum',
  'wuppertal',
  'bielefeld',
  'bonn',
  'münster',
  'mannheim',
  'augsburg',
  'karlsruhe',
  'wiesbaden',
  'heidelberg',
  'freiburg',
  'potsdam',
  // Regions
  'bavaria',
  'bayern',
  'nordrhein',
  'westfalen',
  'baden-württemberg',
  'sachsen',
  'hessen',
  'remote germany',
  'remote de'
];

/**
 * Junior position indicators
 */
const JUNIOR_KEYWORDS = [
  'junior',
  'entry-level',
  'entry level',
  'graduate',
  'berufseinsteiger',
  'trainee',
  'associate',
  'nachwuchs'
];

/**
 * Senior position indicators (to exclude)
 */
const SENIOR_KEYWORDS = [
  'senior',
  'lead',
  'principal',
  'staff',
  'architect',
  'manager',
  'director',
  'head of',
  'chief',
  'vp',
  'vice president'
];

/**
 * Checks if a string contains any of the keywords
 */
function containsAny(text, keywords) {
  if (!text) return false;
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword));
}

/**
 * Checks if job is located in Germany
 */
export function isGermanyLocation(job) {
  const location = job.location || '';
  return containsAny(location, GERMANY_KEYWORDS);
}

/**
 * Checks if job is a junior position
 */
export function isJuniorPosition(job) {
  const title = job.title || '';
  const location = job.location || '';
  const combinedText = `${title} ${location}`;

  // Check if it explicitly mentions junior keywords
  const hasJuniorKeyword = containsAny(combinedText, JUNIOR_KEYWORDS);

  // Check if it mentions senior keywords (exclude these)
  const hasSeniorKeyword = containsAny(combinedText, SENIOR_KEYWORDS);

  // Check experience requirements
  const experience = job.experienceYears || '';
  const hasLowExperience =
    experience.includes('0-') ||
    experience.includes('1-') ||
    experience.includes('2-') ||
    experience.includes('Not specified');

  // Job is junior if:
  // 1. It has junior keywords and no senior keywords, OR
  // 2. It has low experience requirements and no senior keywords
  return (hasJuniorKeyword || hasLowExperience) && !hasSeniorKeyword;
}

/**
 * Checks if experience level is suitable (≤3 years)
 */
export function isSuitableExperience(job) {
  const experience = job.experienceYears || '';

  // If not specified, include it (might be junior)
  if (experience === 'Not specified') {
    return true;
  }

  // Extract numbers
  const numbers = experience.match(/\d+/g);
  if (!numbers) return true;

  // Get the minimum required experience
  const minYears = parseInt(numbers[0], 10);

  // Include if minimum is 3 years or less
  return minYears <= 3;
}

/**
 * Filters jobs based on all criteria
 */
export function filterJobs(jobs) {
  const filtered = jobs.filter(job => {
    const inGermany = isGermanyLocation(job);
    const isJunior = isJuniorPosition(job);
    const suitableExp = isSuitableExperience(job);

    return inGermany && isJunior && suitableExp;
  });

  // Remove duplicates by URL
  const seen = new Set();
  const unique = filtered.filter(job => {
    if (seen.has(job.url)) {
      return false;
    }
    seen.add(job.url);
    return true;
  });

  return unique;
}

/**
 * Provides statistics about filtered results
 */
export function getFilterStats(originalJobs, filteredJobs) {
  const totalOriginal = originalJobs.length;
  const totalFiltered = filteredJobs.length;
  const removed = totalOriginal - totalFiltered;

  const germanyCount = originalJobs.filter(isGermanyLocation).length;
  const juniorCount = originalJobs.filter(isJuniorPosition).length;
  const expCount = originalJobs.filter(isSuitableExperience).length;

  return {
    totalOriginal,
    totalFiltered,
    removed,
    byLocation: germanyCount,
    byLevel: juniorCount,
    byExperience: expCount
  };
}
