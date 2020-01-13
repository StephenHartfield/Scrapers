const companiesList = require("./Allcomps_complete.json");
const fs = require("fs");

// let finalResult = companiesList.reduce(function (a, b) { return a.concat(b); })

function filterCompanies(val) {
    if (val.firstName && val.lastName) {
        if (val.firstName.indexOf('THE') == -1 && val.lastName.indexOf('CORPORATION') == - 1 && val.lastName.indexOf('COMPANY') && val.firstName.indexOf('CORPORATION')
            && val.firstName.indexOf('LLC') == - 1 && val.lastName.indexOf('LLC') == - 1 && val.lastName.indexOf('Llc')
            && val.firstName.indexOf('INC') == - 1 && val.lastName.indexOf('INC') == - 1 && val.lastName.indexOf('Inc')
            && val.firstName.indexOf('LLP') == - 1 && val.lastName.indexOf('LLP') == - 1 && val.lastName.indexOf('Llp') == - 1) {
            return true;
        } else {
            return false;
        }
    } else if (val.fullName) {
        if(val.fullName.indexOf('THE') == -1 && val.fullName.indexOf('CORPORATION') == - 1 && val.fullName.indexOf('COMPANY') == - 1 && val.fullName.indexOf('CORPORATE') == - 1
        && val.fullName.indexOf('LLC') == - 1 && val.fullName.indexOf('LLC') == - 1 && val.fullName.indexOf('Llc') == - 1 && val.fullName.indexOf('CORPORATE') == - 1
        && val.fullName.indexOf('INC') == - 1 && val.fullName.indexOf('INC') == - 1 && val.fullName.indexOf('Inc') == -1 && val.fullName.indexOf('CORP') == - 1
            && val.fullName.indexOf('LLP') == - 1 && val.fullName.indexOf('LLP') == - 1 && val.fullName.indexOf('Llp') == - 1 && val.fullName.indexOf('OFFICE') == - 1
            && val.fullName.indexOf('SERVICES') == - 1 && val.fullName.indexOf('ASSOCIATES') == - 1 && val.fullName.indexOf('P.A.') == - 1 && val.fullName.indexOf('P.C.') == - 1
            && val.fullName.indexOf('L.L.C.') == - 1 && val.fullName.indexOf('L.L.P.') == - 1 && val.fullName.indexOf('P.C') == - 1 && val.fullName.indexOf('Institution') == - 1
            && val.fullName.indexOf('Federal') == - 1 && val.fullName.indexOf('Corp') == - 1 && val.fullName.indexOf('ET AL') == - 1 && val.fullName.length > 0
        && !val.fullName.match(/[-]{2}/g)) {
            return true;
        } else {
            return false;
        }
    }
}

function filterOnEach(val) {
    // val = val.reduce((a, b) => a.concat(b));
    val = val.filter(individual => filterCompanies(individual))
    if (val.length == 0) {
        return '';
    } else {
        return val;
    }
}

let finalResult = companiesList.filter(val => val != 'No Data Found' && val.length >= 1);
finalResult = finalResult.map(val => filterOnEach(val));
finalResult = finalResult.filter(val => val != '');
finalResult = finalResult.map(val => val.map(individual => {
    if(individual.address) {
        return ({
            ...individual,
            address: individual.address.replace(/undefined/g, '').trim()
        });
    }
}));
finalResult = finalResult.map(val => val.map(individual => {
    if (individual && individual.fullName) {
        console.log(individual);
        return ({
            company: individual.company || '',
            address: individual.address || '',
            city: individual.city || '',
            state: individual.state || '',
            zipcode: individual.zipcode || '',
            status: individual.status || '',
            firstName: individual.fullName.split(' ')[0].length > 1 ? individual.fullName.split(' ')[0] : individual.fullName.split(' ')[1],
            lastName: individual.fullName.split(',')[0].length > 1 ? individual.fullName.split(',')[1].length > 1 ? individual.fullName.split(',')[1] : individual.fullName.split(',')[2]
            : individual.fullName.split(' ')[2].length > 1 ? individual.fullName.split(' ')[2] : individual.fullName.split(' ')[3]
        });
    } else {
        return individual;
    }
}));
finalResult = finalResult.map(val => val.filter(individual => {
    if (individual && individual.address == "" || individual && individual.city == "" || individual && individual.zipcode == '') {
        return false;
    } else {
        return true;
    }
        
}))



let finalJson = JSON.stringify(finalResult);
fs.writeFileSync(`./Allcomps_complete_2.json`, finalJson, "utf-8");


