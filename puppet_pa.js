const puppeteer = require('puppeteer');
const request = require("request");
const fs = require('fs');

const companies = require('./pa-companies.json');
const result = [];
(async () => {
    
    const url = `https://www.corporations.pa.gov/Search/corpsearch`;
    const browser = await puppeteer.launch();
    for (let i = 0; i < 100; i++) {
        const idx = i;
        let searchTerm = 'SONSHINE I LP';
        request(
            {
                method: 'GET',
                url: 'http://api.scraperapi.com/?api_key=54e9b0fb54b2de5c04096c232e2ae5ab&url=' + url,
                headers: {
                    Accept: 'application/json',
                },
            },
            async () => {
                async function scrape(searchTerm) {
                    const page = await browser.newPage();
                    await page.waitFor(1000);
                    await page.goto(url);
                    await page.waitForSelector('#txtSearchTerms');
                    await page.evaluate(searchTerm => {
                        let input = document.querySelector("#txtSearchTerms");
                        input.value = searchTerm;
                    }, searchTerm);
                    await page.click("#btnSearch");
                    let count = 0;
                    let found = false;
                    console.log(searchTerm);
                    async function paginationHandle() {
                        await page.waitForSelector('#btnBackToSearchBottom');
                        const names = await page.evaluate(() => {
                            let names = Array.from(document.querySelectorAll("table tr td a"));
                            return names.map(name => name.innerHTML);
                        });

                        const fixedNames = names.map(name => {
                            return name.toUpperCase().replace(/[^\w\s]|_/g, "");
                        });
                        let matchName = "";
                        let matchEntityNum = "";
                        for (let i = 0; i < fixedNames.length; i++) {
                            if (fixedNames[i] == searchTerm) {
                                matchName = fixedNames[i];
                                matchEntityNum = fixedNames[i + 1];
                            }
                        }
                        if (matchName) {
                            await page.waitFor(200);
                            await page.evaluate(matchEntityNum => {
                                let names = document.querySelectorAll("table tr td a");
                                for (let i = 0; i < names.length; i++) {
                                    if (names[i].innerHTML == matchEntityNum) {
                                        names[i].click();
                                    }
                                }
                            }, matchEntityNum);
                            found = true;
                        } else {
                            try {
                              await page.waitForSelector('#gvResults_next');
                              await page.$('#gvResults_next')
                              .then((el) => el.getProperty("className")) // Returns a jsHandle of that property
                              .then((cn) => cn.jsonValue()) // This converts the className jsHandle to a space delimitedstring       
                              .then((classNameString) => classNameString.split(" ")) // Splits into array
                              .then(async (x) => {
                                  const nextDisabled = x.find(val => val == 'disabled');
                                  if (!nextDisabled) {
                                      count++;
                                      await page.click("#gvResults_next");
                                      await page.waitFor(20);
                                      await paginationHandle();
                                    } else {
                                        found = false;
                                    }
                                });
                            } catch (error) {
                                found = false;
                            }
                        }
                    }
                    await paginationHandle();
                    if (!found) {
                        console.log('not found');
                        return {};
                    } else {
                        await page.waitForNavigation();

                        const values = await page.evaluate(() => {
                            const tableValues = Array.from(
                                document.querySelectorAll(".row .col-md-6:nth-child(2) table tr td")
                            );
                            return tableValues.map(val => val.textContent);
                        });
                        console.log(values);
                        if (values.length > 0) {
                            let person = {};
                            let people = [];
                            for (let i = 0; i < values.length; i++) {
                                person["company"] = searchTerm;
                                if (values[i] === "Name") {
                                    let fullName = values[i + 1].split(" ");
                                    fullName = fullName.filter(val => val !== " " && val !== "");
                                    if (fullName.length > 1) {
                                        if (fullName.length > 2) {
                                            person["firstName"] = fullName[0] + " " + fullName[1];
                                            person["lastName"] = fullName[2];
                                        } else {
                                            person["firstName"] = fullName[0];
                                            person["lastName"] = fullName[1];
                                        }
                                    } else {
                                        person["fullName"] = fullName.join(" ");
                                    }
                                    console.log(person);
                                }
                                if (values[i] === "Title") {
                                    person["status"] = values[i + 1];
                                }
                                if (values[i] === "Address") {
                                    let fullAddress = values[i + 1];

                                    let splitAddress = fullAddress.split(/[ ]{2,}/);
                                    if (splitAddress[0] && splitAddress[1]) {
                                        const address = splitAddress[0];
                                        let addressLine = splitAddress[1];
                                        addressLine = addressLine.replace(address, "");
                                        addressLine = addressLine.trimLeft();

                                        let zipcode = addressLine.match(/\d+$/g);
                                        if (zipcode && zipcode.length < 5) {
                                            let hyphenIdx = addressLine.indexOf("-");
                                            if (hyphenIdx > -1) {
                                                addressLine = addressLine.slice(0, hyphenIdx);
                                                zipcode = addressLine.match(/\d+$/g);
                                            }
                                        }
                                        addressLine = addressLine.replace(zipcode, "");
                                        addressLine = addressLine.trimRight();
                                        const state = addressLine.match(/[A-Z]{2}$/);
                                        addressLine = addressLine.replace(state, '');
                                        addressLine = addressLine.trimRight();
                                        const city = addressLine;

                                        person["address"] = address ? address : 'N/A';
                                        person["city"] = city ? city : 'N/A';
                                        person["state"] = state ? state.join() : 'N/A';
                                        person["zipcode"] = zipcode ? zipcode.join() : 'N/A';
                                    }
                                }
                            }
                            people.push(person);
                            person = {};
                            console.log('found and returning data');
                            console.log(people);
                            return people;
                        } else {
                            console.log('found but with no values');
                            const t1values = await page.evaluate(() => {
                                const tableValues = Array.from(
                                    document.querySelectorAll(".row .col-md-6:nth-child(1) table tr td")
                                );
                                return tableValues.map(val => val.textContent);
                            });
                            console.log(t1values);
                            return null;
                        }
                        // )
                    }
                }
                let people = await scrape(searchTerm);
                console.log(people);
                if (people.length > 0) {
                    result.push(people);
                    people = [];
                } else {
                    result.push('No Data Found');
                } 
                if (result.length == 99) {
                    console.log("writing ...");
                    setTimeout(() => {
                        let finalJson = JSON.stringify(result);
                        fs.writeFileSync("./PA3.json", finalJson, "utf-8");
                        setTimeout(() => browser.close(), 1000);
                    }, 5000);
                }
            }
        )
    }
})();

