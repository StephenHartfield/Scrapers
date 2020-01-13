const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const request = require("request-promise");
const parser = require("parse-address");
const pLimit = require('p-limit');
const sleep = require('sleep');
const limit = pLimit(50);

const companiesList = require("./fullnj_companies.json");
let finalResult = [];
let count = 0;
let writeCount = 0;
// let count = 1050;
// let writeCount = 21;

async function scrape() {
    while(count < companiesList.length) {
            const company =
                // 'HAMLIN BANK AND TRUST COMPANY';
                companiesList[count];
        console.log(company);
            const searchTerm = company.replace(/ /g, "%20");
            // const compState = companiesList[idx][1].toLowerCase();
            const siteUrl = `https://www.corporationwiki.com/search/results?term=${searchTerm}`;
            let retry = 0;
            let maxRetry = 3;
            while (retry < maxRetry) {
                try {
                    await limit(() => request({
                        rejectUnauthorized: false,
                        url: 'http://api.scraperapi.com/?api_key=54e9b0fb54b2de5c04096c232e2ae5ab&url=' + siteUrl,
                        headers: { "Content-Type": "application/json" }
                    },
                        async (error, response, body) => {
                            // const fetchData = async (site) => {
                            //     const result = await axios.get(site);
                            //     return cheerio.load(result.data);
                            // };
                            async function getData() {
                                const people = [];
                                async function getMatchedHref() {
                                    let $;
                                    if (body) {
                                        $ = cheerio.load(body);
                                    } else {
                                        return null;
                                    }
                                    const entities = [];
                                    let val = {};
                                    if ($('.row .col-xs-12.col-lg-5').length > 0) { //if website matches company
                                        console.log('found entity');
                                        $('.row .col-xs-12.col-lg-5').each((idx, el) => {
                                            if ($(el).find('a').length) {
                                                val['name'] = $(el).find('a').text();
                                                val['href'] = $(el).find('a').attr('href');
                                                val['validation'] = $(el).text();
                                                if (val['validation']) {
                                                    let getState = val['validation'].split('\n');
                                                    getState = getState.slice(getState.length - 1).join('').trim();
                                                    cityAndState = getState.split(',');
                                                    if (cityAndState) {
                                                        val['city'] = cityAndState[0].toUpperCase();
                                                        val['state'] = cityAndState[1] ? cityAndState[1].toUpperCase().trimLeft() : 'N/A';
                                                        if (val['state'] == 'NJ') {
                                                            entities.push(val);
                                                        }
                                                    }
                                                }
                                                console.log(val);
                                                val = {};
                                            }
                                        });
                                        if (entities.length > 0) { //if we validated any companies
                                            console.log(entities);
                                            const fixedEntities = entities.map(val => {
                                                return {
                                                    ...val,
                                                    name: val["name"].toUpperCase().replace(/[^\w\s-&]|_/g, "").trim(),
                                                };
                                            });
                                            const fixedCompany = company.toUpperCase().replace(/[^\w\s-&]|_/g, "").trimRight();
                                            const matched = fixedEntities.filter(val => val.name == fixedCompany);
                                            if (matched && matched.length >= 1) {
                                                return matched;
                                            } else {
                                                return null;
                                            }
                                        } else {
                                            return null;
                                        }
                                    }
                                } // getMatchedHref function
                                const matched = await getMatchedHref();
                                if (matched && matched.length >= 1) {
                                    const differentCompanies = []; //putting all matches for search term
                    
                                    for (let j = 0; j < matched.length; j++) { //loop through our links
                                        let matchedSingle = matched[j];
                                        async function getIndividual(href) {
                                            const results = [];
                                            await limit(() => request({
                                                rejectUnauthorized: false,
                                                url: 'http://api.scraperapi.com/?api_key=54e9b0fb54b2de5c04096c232e2ae5ab&url=' + href,
                                                headers: { "Content-Type": "application/json" }
                                            },
                                                async (error, response, body) => {
                                                    let $$;
                                                    if (body) {
                                                        $$ = cheerio.load(body);
                                                    } else {
                                                        return null;
                                                    }
                                                    let singleCompany = [];
                        
                                                    let singlePerson = {};
                        
                                                    // getting name and status
                                                    if ($$('table.list-table tr.bar').length) {
                                                        $$('table.list-table tr.bar').each((idx, el) => {
                                                            let name = $$(el).find('a').text().trim();
                                                            name = name.split('\n')[0].trim();
                                                            splitName = name.split(' ');
                                                            if (splitName.length == 2) {
                                                                singlePerson["firstName"] = splitName[0];
                                                                singlePerson["lastName"] = splitName[1];
                                                            }
                                                            else if (splitName.length == 3) {
                                                                singlePerson["firstName"] = splitName[0] + " " + splitName[1];
                                                                singlePerson["lastName"] = splitName[2];
                                                            }
                                                            else {
                                                                singlePerson["fullName"] = splitName.join();
                                                            }
                                                            let status = $$(el).find('div.text-right div').text().trim().split('\n');
                                                            if (status.length > 1) {
                                                                status = status.filter(val => val.trim() !== '');
                                                                status = status.map(val => val.trim());
                                                            }
                                                            singlePerson['status'] = status.join(', ');
                                                            singlePerson['company'] = company;
                                                            singleCompany.push(singlePerson);
                                                            singlePerson = {};
                                                        })
                                                    }
                                                    console.log(singlePerson);
                                                    // getting address
                                                    if ($$('div.card div.card-body a.list-group-item').length > 0) {
                                                        $$('div.card div.card-body a.list-group-item').each((idx, el) => {
                                                            let testingText = $$(el).find('span[itemprop="address"]').text().toUpperCase();
                                                            if (testingText.indexOf(matchedSingle.city) > -1) {
                                                                let address = $$(el).find('span[itemprop="streetAddress"]').text();
                                                                singlePerson['address'] = address;
                                                                singlePerson['zipcode'] = $$(el).find('span[itemprop="postalCode"]').text();
                                                                if (singleCompany[0] && !singleCompany[0].address) {
                                                                    singleCompany = singleCompany.map(person => {
                                                                        return ({
                                                                            ...person,
                                                                            address: singlePerson['address'],
                                                                            city: matchedSingle.city,
                                                                            state: matchedSingle.state,
                                                                            zipcode: singlePerson['zipcode']
                                                                        })
                                                                    })
                                                                    console.log(results);
                                                                    results.push(singleCompany);
                                                                }
                                                            }
                                                        })
                                                    } else {
                                                        results.push('No Address');
                                                    }
                                                }
                                            ))
                                            return results;
                                        }; //getIndividual
                                        const matchedResults = await getIndividual(matchedSingle.href);
                                        differentCompanies.push(matchedResults);
                                    } //loop through links
                                    return differentCompanies;
                                } else {
                                    return 'No Matched Hrefs';
                                }
                            } //getData function
                            const data = await getData();
                            console.log(data);
                            finalResult.push(data);
                            count++;
                            retry = 3;
                            console.log('finalResult - ' + finalResult.length);
                            console.log('count ' + count);
                            if (count % 100 == 0) {
                                setTimeout(() => {
                                    console.log('writing ... @ count ' + count);
                                    let finalJson = JSON.stringify(finalResult);
                                    fs.writeFileSync(`./CorpWiki_NJ_${writeCount}.json`, finalJson, "utf-8");
                                    writeCount++;
                                }, 1000);
                            }
                            if (count == companiesList.length - 1) {
                                finalResult = finalResult.filter(val => (val.length > 1 || val[0].length > 0) && val != 'No Matched Hrefs');
                                console.log("writing ...");
                                let finalJson = JSON.stringify(finalResult);
                                fs.writeFileSync(`./CorpWiki_NJ_complete.json`, finalJson, "utf-8");
                            }
                        }
                    ))
                } catch (e) {
                    console.log('err ' + e);
                    sleep.sleep(1);
                    retry++;
                }
            }
    } //for loop
}
scrape();                   