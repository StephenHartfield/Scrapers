const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const request = require("request-promise");
const parser = require("parse-address");
const pLimit = require('p-limit');
const limit = pLimit(50);

const companiesList = require("./leftovers2_companies.json");
let finalResult = [];
let count = 300;
let writeCount = 0;
// let count = 1050;
// let writeCount = 21;

async function scrape() {
    for (let i = count; i < companiesList.length; i++) {
        console.log(i);
        if (i <= companiesList.length - 1) {
            const company =
                'NEWREZ LLC';
                companiesList[count][0];
            console.log(company);
            const searchTerm = company.replace(/ /g, "%20");
            // const compState = companiesList[idx][1].toLowerCase();
            const siteUrl = `https://www.bbb.org/search?find_country=USA&find_loc=${companiesList[i][1]}&find_text=${searchTerm}&page=1`;
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
                                    if ($('div.MuiPaper-root').length > 0) { //if website matches company
                                        $('div.MuiPaper-root.MuiPaper-elevation1.MuiCard-root').each((idx, el) => {
                                            val['company'] = $(el).find('div div div div h3 a').text();
                                            val['phone'] = $(el).find('div div div div p.MuiTypography-root.MuiTypography-gutterBottom').text();
                                            const address = $(el).find('div div div div p strong').text();
                                            const splitAddress = address.split(',');
                                            if (splitAddress.length == 3) {
                                                val['address'] = splitAddress[0];
                                                val['city'] = splitAddress[1];
                                                const stateAndZip = splitAddress[2].trim().split(' ');
                                                val['state'] = stateAndZip[0].trim();
                                                val['zipcode'] = stateAndZip[1].trim();
                                            }
                                            val['href'] = $(el).find('div div div div h3 a').attr('href');
                                            if (val['state'] == companiesList[i][1]) {
                                                entities.push(val);
                                            }
                                            val = {};
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
                                            const results = [];
                                            await limit(() => request({
                                                rejectUnauthorized: false,
                                                url: 'http://api.scraperapi.com/?api_key=54e9b0fb54b2de5c04096c232e2ae5ab&url=' + matched.href,
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

                                                    console.log('here');
                                                    // getting name and status
                                                    if ($$('div.MuiCardContent-root div ul:nth-child(1) li').length) {
                                                        $$('div.MuiCardContent-root div ul:nth-child(1) li').each((idx, el) => {
                                                            let nameAndStatus = $$(el).text().split(',');
                                                            console.log(nameAndStatus);
                                                            // name = name.split('\n')[0].trim();
                                                            let splitName = nameAndStatus[0].split(' ');
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
                                                            singlePerson['status'] = nameAndStatus[1] || '';
                                                            singleCompany.push(singlePerson);
                                                            singlePerson = {};
                                                        })
                                                    }
                                                    singleCompany = singleCompany.map(person => ({
                                                        ...person,
                                                        company: company,
                                                        phone: matched.phone || '',
                                                        address: matched.address,
                                                        city: matched.city,
                                                        state: matched.state,
                                                        zipcode: matched.zipcode
                                                    }))
                                                    console.log(singleCompany);
                                                    results.push(singleCompany);
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
                            if (count % 1 == 0) {
                                setTimeout(() => {
                                    console.log('writing ... @ count ' + count);
                                    let finalJson = JSON.stringify(finalResult);
                                    fs.writeFileSync(`./BBB_output_${writeCount}.json`, finalJson, "utf-8");
                                    writeCount++;
                                }, 1000);
                            }
                            if (count == companiesList.length - 1) {
                                finalResult = finalResult.filter(val => (val.length > 1 || val[0].length > 0) && val != 'No Matched Hrefs');
                                console.log("writing ...");
                                let finalJson = JSON.stringify(finalResult);
                                fs.writeFileSync(`./AllComplete_BBB.json`, finalJson, "utf-8");
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