/**
 * Script to split the countries.json file into separate JSON files per country
 * Each file will contain an array of cities for that country
 *
 * Usage: node tools/split-countries.js
 */

const fs = require('fs');
const path = require('path');

// Paths
const inputFile = path.join(__dirname, '../frontend/public/data/countries.json');
const outputDir = path.join(__dirname, '../frontend/public/data/cities');

// Country name to file-safe slug mapping
function toSlug(countryName) {
  return countryName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Read the countries JSON
console.log('Reading countries.json...');
const countriesData = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Create a mapping file for country name -> slug
const countryMapping = {};

// Process each country
let count = 0;
for (const [countryName, cities] of Object.entries(countriesData)) {
  const slug = toSlug(countryName);
  countryMapping[countryName] = slug;

  // Write cities to individual file
  const outputFile = path.join(outputDir, `${slug}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(cities, null, 0));
  count++;
}

// Write the mapping file
const mappingFile = path.join(outputDir, '_index.json');
fs.writeFileSync(mappingFile, JSON.stringify(countryMapping, null, 2));

console.log(`Done! Created ${count} city files in ${outputDir}`);
console.log(`Mapping file created at ${mappingFile}`);
