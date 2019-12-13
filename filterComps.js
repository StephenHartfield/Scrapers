const fs = require('fs');
const companyList = require('./convertcsv.json');

const pennslyvaniaList = companyList.filter(company => company[1] == 'PA');

let finalJson = JSON.stringify(pennslyvaniaList);
fs.writeFileSync(`./PA_companies.json`, finalJson, "utf-8");