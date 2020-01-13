const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const request = require("request-promise");
const parser = require("parse-address");
const pLimit = require('p-limit');
const limit = pLimit(50);

const companiesList = require("./fullnj_companies.json");
let finalResult = [];
let count = 1200;
let writeCount = 12;
// let count = 1050;
// let writeCount = 21;

async function scrape() {
    for (let i = count; i < companiesList.length; i++) {
        console.log(i);
        if (i <= companiesList.length - 1) {
            const company =
                // 'Loder Properties, Inc.';
                companiesList[count];
            const searchTerm = company.replace(/ /g, "-");
            // const compState = companiesList[idx][1].toLowerCase();
            const siteUrl = `https://www.buzzfile.com/Search/Company/Results?searchTerm=${searchTerm}&type=1`;
            let retryNum = 0;
            const maxRetry = 3;
            while (retryNum < maxRetry) {
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
                                    if ($('table#companyList tr').length > 0) { //if website matches company
                                        $('table#companyList tr').each((idx, el) => {
                                            if ($(el).find('td a').length) {
                                                val['company'] = $(el).find('td:nth-child(2) a').text();
                                                val['href'] = $(el).find('td a').attr('href');
                                                val['state'] = $(el).find('td div.company-list-state-column a').text().trim();
                                                val['city'] = $(el).find('td div.company-list-city-column a').text().trim().toUpperCase();
                                                val['address'] = $(el).find('td.hidden-xs:nth-child(4) div a').text().trim();
                                                val['zipcode'] = $(el).find('td div.company-list-zipcode-column a').text().trim();
                                                if (val['state'] == 'NJ') {
                                                    entities.push(val);
                                                }
                                                console.log(val);
                                                val = {};
                                            }
                                        });
                                        if (entities.length > 0) { //if we validated any companies
                                            const fixedEntities = entities.map(val => {
                                                return {
                                                    ...val,
                                                    company: val["company"].toUpperCase().replace(/[^\w\s-&]|_/g, "").trim(),
                                                };
                                            });
                                            const fixedCompany = company.toUpperCase().replace(/[^\w\s-&]|_/g, "").trimRight();
                                            const matched = fixedEntities.filter(val => val.company == fixedCompany);
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
                                        async function getIndividual(matched) {
                                            url = 'https://www.buzzfile.com' + matched.href;
                                            console.log(url);
                                            const results = [];
                                            await limit(() => request({
                                                rejectUnauthorized: false,
                                                url: 'http://api.scraperapi.com/?api_key=54e9b0fb54b2de5c04096c232e2ae5ab&url=' + url,
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
                                                    if ($$('div#1 div table tr').length) {
                                                        $$('div#1 div table').each((idx, el) => {
                                                            let name = $$(el).find('tr td span[itemprop="employee"]').text().trim();
                                                            // name = name.split('\n')[0].trim();
                                                            let splitName = name.split(' ');
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
                                                            let status = $$(el).find('tr td span[itemprop="contactType"]').text().trim();
                                                            let phone = $$(el).find('tr td span[itemprop="telephone"]').text().trim();
                                                            singlePerson['status'] = status || '';
                                                            singlePerson['company'] = company;
                                                            singlePerson['phone'] = phone || '';
                                                            singlePerson['address'] = matched.address;
                                                            singlePerson['city'] = matched.city;
                                                            singlePerson['state'] = matched.state;
                                                            singlePerson['zipcode'] = matched.zipcode;
                                                            singleCompany.push(singlePerson);
                                                            singlePerson = {};
                                                        })
                                                    }

                                                    results.push(singleCompany);
                                                    // getting address
                                                    // if ($$('div.card div.card-body a.list-group-item').length > 0) {
                                                    //     $$('div.card div.card-body a.list-group-item').each((idx, el) => {
                                                    //         let testingText = $$(el).find('span[itemprop="address"]').text().toUpperCase();
                                                    //         if (testingText.indexOf(matchedSingle.city) > -1) {
                                                    //             let address = $$(el).find('span[itemprop="streetAddress"]').text();
                                                    //             singlePerson['address'] = address;
                                                    //             singlePerson['zipcode'] = $$(el).find('span[itemprop="postalCode"]').text();
                                                    //             if (singleCompany[0] && !singleCompany[0].address) {
                                                    //                 singleCompany = singleCompany.map(person => {
                                                    //                     return ({
                                                    //                         ...person,
                                                    //                         address: singlePerson['address'],
                                                    //                         city: matchedSingle.city,
                                                    //                         state: matchedSingle.state,
                                                    //                         zipcode: singlePerson['zipcode']
                                                    //                     })
                                                    //                 })
                                                    //                 results.push(singleCompany);
                                                    //             }
                                                    //         }
                                                    //     })
                                                    // } else {
                                                    //     results.push('No Address');
                                                    // }
                                                } //async callback
                                            ))
                                            return results;
                                        }; //getIndividual
                                        const matchedResults = await getIndividual(matchedSingle);
                                        differentCompanies.push(matchedResults);
                                    } //loop through links
                                    return differentCompanies;
                                } else {
                                    return 'No Matched Hrefs';
                                }
                            } //getData function
                            const data = await getData();
                            finalResult.push(data);
                            count++;
                            retryNum = 3;
                            console.log('finalResult - ' + finalResult.length);
                            console.log('count ' + count);
                            if (count % 100 == 0) {
                                setTimeout(() => {
                                    console.log('writing ... @ count ' + count);
                                    let finalJson = JSON.stringify(finalResult);
                                    fs.writeFileSync(`./BuzzFile_NJ${writeCount}.json`, finalJson, "utf-8");
                                    writeCount++;
                                }, 1000);
                            }
                            if (count == companiesList.length - 1) {
                                finalResult = finalResult.filter(val => (val.length > 1 || val[0].length > 0) && val != 'No Matched Hrefs');
                                console.log("writing ...");
                                let finalJson = JSON.stringify(finalResult);
                                fs.writeFileSync(`./BuzzFile_NJ_complete.json`, finalJson, "utf-8");
                            }
                        }
                    ))
                } catch (e) {
                    console.log('eer ' + e.code);
                    retryNum++;
                }
            }
        } //if block
    } //for loop
}
scrape();                   