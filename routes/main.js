"use strict";
const {Builder, By, Options} = require("selenium-webdriver");
const fs = require("fs");

const url = "https://moskva.mts.ru/personal/mobilnaya-svyaz/tarifi/vse-tarifi/mobile-tv-inet";

const chrome = require("selenium-webdriver/chrome");
let out_src;

module.exports = function (app) {
    app.get("/", (req,res) => {
        (async function tariffsParsing() {
            try {
                //session-start
                let driver = await new Builder().forBrowser("chrome").build();
                
                //web-page_opening
                await driver.get(url);
                
                //tariff-elements_array-creation
                await driver.findElement(By.css("div.tariffs-more-btn > button")).click()
                
                //сорц страницы    
                out_src = await driver.getPageSource();

                //parsed-array_init
                const parsedData = [];
                
                //tariffs-webelements_array-loading
                const tarifs = await driver.findElements(By.className("card__clickable"));
                
                //tariffs-array_create
                let id = 0;
                for (const tarifElement of tarifs) {
                
                    //tarif-assembly
                    //tarif_init-data
                    const tarif={}
                    tarif.idx = id;        
                    //data-reading
                    let tarif_name = await tarifElement.findElement(By.className("card-title")).getText();

                    let description="";
                    try { description = await tarifElement.findElement(By.className("card-description")).getText()
                    } catch {};

                    let features=await tarifElement.findElements(By.css("li.feature__wrapper"));

                    let benefits = "";
                    try {benefits = await tarifElement.findElement(By.className("benefits-description")).getText()
                    } catch {};

                    let sale = Number((await tarifElement.findElement(By.css("div.price-main > span.price-text")).getText()).replaceAll(" ",""));

                    let price=sale;

                    try {price = Number((await tarifElement.findElement(By.css("div.price-sale > span.price-text")).getText()).replaceAll(" ",""))
                    } catch {};

                    let period = await tarifElement.findElement(By.css("div.price-main > span.price-quota")).getText();
                    
                    let annotation = "";
                    try {annotation = await tarifElement.findElement(By.css("div.price-annotation")).getText()
                    } catch {};
                    
                    //data-parsing
                    //data-parsing_common-information
                    tarif.tarifName=tarif_name;
                    tarif.description = description;
                    let mask=/семейная/;
                    tarif.familySubscribe = mask.test(description.toLowerCase()) || mask.test(tarif_name.toLowerCase()) ;
                    tarif.benefits = benefits;
                    tarif.annotation = annotation;
                    
                    //data-parsing_features__init
                    tarif.minutes = 0;
                    tarif.inetQty = 0;
                    tarif.tvQty = 0;
                    tarif.shareSpeed = 0;

                    //data-parsing_features 
                    for (const featureElement of features) {
                        const feature = await featureElement.findElement(By.css("span")).getText();
                        if (feature.match("минут")) {
                            tarif.minutes = Number(feature.split(" ")[0])
                        };
                        if (feature.match("ГБ")) {
                            tarif.inetQty = Number(feature.split(" ")[0])
                        };
                        if (feature.match("ТВ")) {
                            tarif.tvQty = Number(feature.split(" ")[0])
                        };
                        if (feature.match("Гбит")) {
                            tarif.shareSpeed = Number(feature.split(" ")[0])*1000
                        };
                        if (feature.match("Мбит")) {
                            tarif.shareSpeed = Number(feature.split(" ")[0])
                        };
                    } 
                    
                    //data-parsing_benefits
                    tarif.kion = Boolean(benefits.toLowerCase().includes("kion")); 
                    tarif.socialNetworks = Boolean(benefits.toLowerCase().includes("соцсети"));
                    tarif.messengers = Boolean(benefits.toLowerCase().includes("мессенджеры"));
                    tarif.music = Boolean(benefits.toLowerCase().includes("музыка"));
                    tarif.lines = Boolean(benefits.toLowerCase().includes("строки"));
                    tarif.deffender = Boolean(benefits.toLowerCase().includes("защитник"));
                    tarif.cashback = Boolean(benefits.toLowerCase().includes("кешбэк"));
                    tarif.others = Boolean(benefits.toLowerCase().includes("другие"));
                    
                    //data-parsing_price
                    tarif.priceSale = sale;
                    tarif.price = price;
                    mask=/мес|год/;
                    if (mask.test(period)) {
                        if (period.includes("мес")) {
                            tarif.priceYear = price*12;
                            tarif.priceMonth = price;
                            tarif.monthlyPayment = true;
                        } else {
                            tarif.priceYear = price;
                            tarif.priceMonth = Math.round(price/12);
                            tarif.monthlyPayment = false;
                        }
                        tarif.permanent = true;
                    } else {
                        tarif.priceYear = price;
                        tarif.priceMonth = price;
                        tarif.permanent = false;
                        tarif.monthlyPayment = false;
                    };

                    //tariff assebly done, append-to-array
                    parsedData.push({...tarif})
                    id++;
                    out_src = parsedData;
                }
                //data-saving_to-file__JSON
                fs.writeFileSync("./files/tariffs.json", JSON.stringify(parsedData), "utf8");
                //session-close
                await driver.quit();
            } catch(e) {
                //error-catching
                console.log(e);
            }
            res.end(fs.readFileSync("./files/tariffs.json", "utf8"));
        })();
    })
}


