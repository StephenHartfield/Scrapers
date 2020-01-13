const fs = require('fs');

const first = require('./CorpWiki_NJ_.json');
const second = require('./CorpWiki_NJ_.json');
const third = require('./CorpWiki_NJ_.json');
const fourth = require('./CorpWiki_NJ_.json');
const sixth = require('./CorpWiki_NJ_.json');
const seventh = require('./CorpWiki_NJ_.json');

let combined = first.concat(second).concat(third).concat(fourth).concat(fifth).concat(sixth).concat(seventh).concat(eighth)
    .concat(ninth).concat(tenth).concat(eleventh).concat(twelth).concat(thirteenth).concat(fourteenth);

combined = combined.filter(val => val != 'No Matched Hrefs' && val.length > 0);

let finalJson = JSON.stringify(combined);
fs.writeFileSync(`./CorpWiki_combined_companies_NJ.json`, finalJson, "utf-8");