const fs = require('fs');

const first = require('./BuzzFile_NJ10.json');
const second = require('./BuzzFile_NJ11.json');
const third = require('./BuzzFile_NJ_complete.json');

let combined = first.concat(second).concat(third);

combined = combined.filter(val => val != 'No Matched Hrefs' && val.length > 0);

let finalJson = JSON.stringify(combined);
fs.writeFileSync(`./BuzzFile_combined_companies_NJ.json`, finalJson, "utf-8");