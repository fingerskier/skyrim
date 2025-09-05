// csv-to-json.mjs
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const csv = require('csv-parser');

const inputFile = process.argv[2] || 'input.csv';
const outputFile = process.argv[3] || 'output.json';

const results = [];

fs.createReadStream(inputFile)
  .pipe(csv())
  .on('data', (row) => results.push(row))
  .on('end', () => {
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`Converted ${inputFile} → ${outputFile}`);
  });
