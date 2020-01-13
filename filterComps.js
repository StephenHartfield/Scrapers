const fs = require('fs');
const companyList = require('./convertcsv.json');

// const CTList = companyList.filter(company => company[1] == 'CT');
const completedList = require('./leftovers_companies.json');
const BuzzAndCorpWiki = require('./BuzzFile_CorpWiki_combine_complete_2.json')
const completeListCos = new Set(completedList.map(company => company[0] ? company[0].company : company.company));
const bAndCWListCos = BuzzAndCorpWiki.map(company => {
    return { company: company[0].company, state: company[0].state };  
});

const leftOvers = completedList.filter(company => {
    for (let i = 0; i < bAndCWListCos.length; i++) {
        if (company[0] == bAndCWListCos[i].company) {
            return false;
        }
    }
    return true;
});

console.log(completedList.length);
console.log(bAndCWListCos.length);
console.log(leftOvers.length);

let finalJson = JSON.stringify(leftOvers);
fs.writeFileSync(`./leftovers2_companies.json`, finalJson, "utf-8");