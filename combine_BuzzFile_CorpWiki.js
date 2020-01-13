const fs = require('fs');

const BuzzFileCos = require('./NJ_complete_final.json');
const CorpWikiCos = require('./BuzzFile_CorpWiki_combine_complete_2.json');


// let reduce = CorpWikiCos.reduce(function (a, b) { return a.concat(b); });
// let reduce2 = BuzzFileCos.reduce(function (a, b) { return a.concat(b); });

// let reducedBuzzFileCos = reduce2.reduce((a, b) => a.concat(b));
// let reducedCorpWikiCos = reduce.reduce((a, b) => a.concat(b));

console.log(BuzzFileCos.length);
console.log(CorpWikiCos.length);

let finalCombine = BuzzFileCos.concat(CorpWikiCos);

// finalCombine = finalCombine.map(val => {
//     return val.filter(person => {
//         if (person.fullName) {
//             console.log(person);
//             return false;
//         } else {
//             return true;
//         }
//     })
// })

let finalJson = JSON.stringify(finalCombine);
fs.writeFileSync(`./ALLcomps_complete.json`, finalJson, "utf-8");
