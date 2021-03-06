const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const request = require("request");
const parser = require("parse-address");
const pLimit = require('p-limit');
const sleep = require('sleep');
const limit = pLimit(50);

//12 to 13 and 28 to 29

const companiesList = require("./PA_companies.json");
let finalResult = [];
let count = 0;
let writeCount = 0;

// const input = companiesList.map(async (companyArray, idx) => {
async function scrape() {  
    let loopCount = count;
    for (let i = loopCount; i < (loopCount + 50); i++) {
        console.log(i);
        if (i <= companiesList.length - 1) {
            const company = 'CIP INC';
                // companiesList[i][0];
            const searchTerm = company.replace(/ /g, "+");
            // const compState = companiesList[idx][1].toLowerCase();
            const siteUrl = `https://opencorporates.com/companies/us_pa?q=${searchTerm}&utf8=%E2%9C%93`;

            await limit(() => request(
                {
                    method: 'GET',
                    url: 'http://api.scraperapi.com/?api_key=54e9b0fb54b2de5c04096c232e2ae5ab&url=' + siteUrl,
                    headers: {
                        Accept: 'application/json',
                    },
                },
                async () => {
                    const fetchData = async (site) => {
                        const result = await axios.get(site);
                        return cheerio.load(result.data);
                    };
                    async function getData() {
                        const people = [];
                        async function getMatchedHref() {
                            const $ = await fetchData(siteUrl);
                            const entities = [];
                            let el = {};
                            if ($("li.active").length > 1) {
                                $("div ul li.active").each((index, element) => {
                                    if ($(element).find("a").length) {
                                        el["name"] = $(element).find("a").text();
                                        el["href"] = $(element).find("a.company_search_result").attr("href");
                                        entities.push(el);
                                        el = {};
                                    }
                                });
                                const fixedEntities = entities.map(val => {
                                    return {
                                        name: val["name"].toUpperCase().replace(/[^\w\s-&]|_/g, "").trimRight(),
                                        href: val["href"]
                                    };
                                });
                                const fixedCompany = company.toUpperCase().replace(/[^\w\s-&]|_/g, "").trimRight();
                                const matched = fixedEntities.filter(val => val.name == fixedCompany);
                                if (matched && matched.length >= 1) {
                                    return matched.map(matchedName => matchedName.href);
                                }
                                else {
                                    return null;
                                }
                            }
                            else {
                                return null;
                            }
                        }
                        const matchedHrefs = await getMatchedHref();
                        if (matchedHrefs && matchedHrefs.length >= 1) {
                            const peopleInCompanies = [];
                            for (let j = 0; j < matchedHrefs.length; j++) {
                                matchedHref = matchedHrefs[j];
                                const $$ = await fetchData(`https://opencorporates.com${matchedHref}`);
                                async function getRedirect() {
                                    return null;
                                    // $$("dd a.url.external").attr("href");
                                }
                                const registryHref = await getRedirect();
                                if (registryHref) {
                                    console.log("in registry page");
                                    async function getOfficerData() {
                                        const page = await fetchData(registryHref);
                                        let innerPeople = [];
                                        let data = [];
                                        page("table tr td table tr td table tr:nth-child(3) td table tr").each((idx, el) => {
                                            data.push(page(el).text());
                                        });
                                        data = data.slice(2);
                                        data = data.map(val => {
                                            val = val.split("\n");
                                            val = val.filter(el => el.trim() !== "");
                                            return val.map(el => el.trim());
                                        });
                                        for (let i = 0; i < data.length; i++) {
                                            const individual = data[i];
                                            const nameAndTitle = individual[0].trimRight();
                                            const splitData = nameAndTitle.split(/[ ]{2,}/);
                                            const parsedAddress = parser.parseLocation(individual[2]);
                                            const person = { company: company };
                                            const splitName = splitData[0].split(" ");
                                            if (splitName.length == 2) {
                                                person["firstName"] = splitName[0];
                                                person["lastName"] = splitName[1];
                                            }
                                            else if (splitName.length == 3) {
                                                person["firstName"] = splitName[0] + " " + splitName[1];
                                                person["lastName"] = splitName[2];
                                            }
                                            else {
                                                person["fullName"] = splitName.join();
                                            }
                                            person["status"] = splitData[1].trimLeft();
                                            person["address"] =
                                                parsedAddress.number +
                                                " " +
                                                parsedAddress.street +
                                                " " +
                                                parsedAddress.type;
                                            person["city"] = parsedAddress.city;
                                            person["state"] = parsedAddress.state;
                                            person["zipcode"] = parsedAddress.zip;
                                            innerPeople.push(person);
                                        }
                                        return innerPeople;
                                    }
                                    return await getOfficerData();
                                }
                                else {
                                    const innerPeople = [];
                                    let members = [];
                                    let el = {};
                                    $$("dd ul.attribute_list li.attribute_item").each((idx, element) => {
                                        if ($$(element).find("a").length) {
                                            el["name"] = $$(element).find("a").text();
                                            let status = $$(element).html();
                                            status = status.split(',')[1];
                                            if (status) {
                                                el["status"] = status.replace(/[^\w\s-&]|_/g, "").trimLeft().toUpperCase();
                                            }
                                        }
                                        members.push(el);
                                        el = {};
                                    });
                                    for (let i = 0; i < members.length; i++) {
                                        let person = { company: company };
                                        const addressLines = $$("dd.registered_address ul.address_lines li").eq(0).text();
                                        let addressArray = [];
                                        console.log(addressLines);
                                        addressArray = addressLines.split(',');
                                        
                                        // if (addressArray.length < 3) {
                                            // $$("dd.registered_address ul.address_lines li").each((idx, el) => {
                                            //     if (idx < 4) {
                                            //         if (!isNaN($$(el).text())) {
                                            //             person['zipcode'] = $$(el).text();
                                            //         }
                                            //         if (idx == 0) {
                                            //             if (addressArray.length == 2) {
                                            //                 const addressLine = $$(el).text();
                                            //                 person['address'] = addressLine.split(',')[0];
                                            //                 person['address2'] = addressLine ? addressLine.split(',')[1].trimLeft() : '';
                                            //             }
                                            //             else {
                                            //                 person['address'] = $$(el).text();
                                            //             }
                                            //         }
                                            //         if (idx == 1) {
                                            //             person['city'] = $$(el).text();
                                            //         }
                                            //     }
                                            // });
                                            // person['state'] = 'PA';

                                        // }
                                        // else {
                                        if (isNaN(addressArray[addressArray.length - 1])) {
                                            addressArray.pop();
                                        }
                                        let address2 = "";
                                        console.log(addressArray);
                                        console.log(addressArray[0].indexOf('#'));
                                            if (addressArray.length == 5) {
                                                address2 = addressArray[1];
                                                addressArray = addressArray.filter((line, idx) => idx !== 1);
                                            }
                                        
                                        const parsedAddress = parser.parseLocation(addressArray.join());
                                        console.log(parsedAddress);
                                        if (parsedAddress) {
                                            person["address"] =
                                                parsedAddress.number +
                                                " " +
                                                parsedAddress.street +
                                                " " +
                                                parsedAddress.type || "";
                                            if (address2) {
                                                person["address2"] = address2.trimLeft();
                                            }
                                            person["city"] = parsedAddress.city;
                                            person["state"] = parsedAddress.state;
                                            person["zipcode"] = parsedAddress.zip;
                                        // } else {

                                        }
                                        let splitName = members[i].name.split(" ");
                                        if (splitName.length == 2) {
                                            person["firstName"] = splitName[0];
                                            person["lastName"] = splitName[1];
                                        }
                                        else if (splitName.length == 3) {
                                            person["firstName"] = splitName[0] + " " + splitName[1];
                                            person["lastName"] = splitName[2];
                                        }
                                        else {
                                            splitName = splitName.map(val => val.indexOf(',') > -1 ?
                                                val.slice(0, val.indexOf(',')) + val.slice((val.indexOf(',') + 1)) : val);
                                            person["fullName"] = splitName.join(' ');
                                        }
                                        person['status'] = members[i].status;
                                        innerPeople.push(person);
                                        person = {};
                                    } // member loop creating a person
                                    peopleInCompanies.push(innerPeople);
                                } // else block
                                if (peopleInCompanies.length == matchedHrefs.length) {
                                    return peopleInCompanies;
                                }
                            } // end of for loop
                        }
                        else {
                            return "No Data Found";
                        }
                    }
                    try {
                        const people = await getData();
                        finalResult.push(people);
                        count++;
                        console.log('results length = ' + finalResult.length);
                        console.log('count ' + count);
                        if (count % 50 == 0) {
                            console.log('writing ... @ count ' + count);
                            let finalJson = JSON.stringify(finalResult);
                            fs.writeFileSync(`./AllPA${writeCount}.json`, finalJson, "utf-8");
                            writeCount++;
                            scrape();
                        }
                        if (count == companiesList.length - 1) {
                            finalResult = finalResult.filter(val => (val.length > 1 || val[0].length > 0) && val != 'No Data Found');
                            console.log("writing ...");
                            let finalJson = JSON.stringify(finalResult);
                            fs.writeFileSync(`./AllPA.json`, finalJson, "utf-8");
                        }
                    } catch (e) {
                        console.log('err ' + e);
                        sleep.sleep(1);
                    }
                })
            ); //limit()
        }
    }
}
scrape();// loop
// if (officers) {
//     let person = {};
//     async function getOfficerData(href) {
//         const $$$ = await fetchData(`https://opencorporates.com${href}`);

//         const company = $$$('div#attributes dl.attributes dd.company a').text();
//         const name = $$$('div#attributes dl.attributes dd.name a').text();
//         const address = $$$('div#attributes dl.attributes').text();
//         const status = $$$('div#attributes dl.attributes dd.position').text();

//         const page = await browser.newPage();
//         await page.waitFor(1000);
//         await page.goto(`https://opencorporates.com${href}`, { waitUntil: "load", timeout: 0 });
//         const attributes = await page.$("div#attributes dl.attributes");
//         const text = await page.evaluate(attributes => attributes.textContent, attributes);

//         console.log(text);
//     }
//     getOfficerData(officers[0].href);
// }
//         let tries = 0;
//         async function getData() {
//           const $$ = await fetchData(
//             `http://search.sunbiz.org${activeEntities[tries].href}`
//           );
//           if ($$(".searchResultDetail div:nth-child(7)").length === 0) {
//             tries++;
//             return getData();
//           } else {
//             return $$(".searchResultDetail div:nth-child(7)").text();
//           }
//         }
//         const data = await getData();

//         const fixedData = data.split("\n");
//         const filtered = fixedData.filter(el => /\S/.test(el));

//         const trimmed = filtered.map(el => {
//           el = el.replace(/^\s+/g, "");
//           el = el.replace(/\s+$/g, "");
//           return el;
//         });
//         let count = 0;
//         let person = {};
//         let final = [];
//         let isFive = false;
//         for (var i = 2; i < trimmed.length; i++) {
//           if (trimmed[i].match(/^Title/)) {
//             person = {};
//             person["company"] = company;
//             count = 0;
//             person["status"] = trimmed[i];
//             isFive = /([A-Z]{2}) (\d{5})/.test(trimmed[i + 4]);
//           }
//           if (count === 1) {
//             if (trimmed[i].indexOf(",") > -1) {
//               const splitName = trimmed[i].split(",");
//               person["lastName"] = splitName[0];
//               person["firstName"] = splitName[1].replace(/^\s+/g, "");
//             } else {
//               person["fullName"] = trimmed[i];
//             }
//           }
//           if (count == 2) {
//             person["address"] = trimmed[i];
//           }
//           if (count == 3) {
//             if (isFive) {
//               person["address2"] = trimmed[i];
//               i++;
//             }
//             const splitAddress = trimmed[i].split(",");
//             person["city"] = splitAddress[0].replace(/,/g, "");
//             let splitStateAndZip;
//             if (splitAddress[1] == "") {
//               splitStateAndZip = splitAddress[2];
//             } else {
//               splitStateAndZip = splitAddress[1];
//             }
//             splitStateAndZip = splitStateAndZip.trim().split(" ");
//             person["state"] = splitStateAndZip[0];
//             person["zipcode"] = splitStateAndZip[1];

//             final.push(person);
//           }
//           count++;
//         }
//         // console.log(final);
//         return final;
//       }
//       // scrape();
//       const returnedFinal = await scrape();
//       finalResult.push(returnedFinal);

//       if (idx === companiesList.length - 1) {
//         setTimeout(() => {
//           console.log("writing ...");
//           let finalJson = JSON.stringify(finalResult);
//           fs.writeFileSync("./FL2.json", finalJson, "utf-8");
//         }, 3000);
//       }
//     }
//   );
// });
