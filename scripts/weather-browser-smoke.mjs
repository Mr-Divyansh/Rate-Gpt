import assert from "node:assert/strict";
import { chromium } from "playwright";

const baseUrl=(process.env.RATE_GPT_BASE_URL||"http://127.0.0.1:4173").replace(/\/+$/,"");
const viewports=[{name:"mobile",width:390,height:844},{name:"tablet",width:768,height:1024},{name:"desktop",width:1440,height:900}];
const browser=await chromium.launch({headless:true});
let passed=0;
const pass=(name)=>{passed++;console.log("PASS "+name);};

try{
 for(const viewport of viewports){
  const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height}});
  await context.addInitScript(()=>{
   window.__weatherGeoOptions = null;
   Object.defineProperty(navigator,"geolocation",{configurable:true,value:{
    getCurrentPosition(success,error,options){
     window.__weatherGeoOptions = options;
     queueMicrotask(()=>success({coords:{latitude:31.708,longitude:76.932,accuracy:42},timestamp:Date.now()}));
    }
   }});
  });
  const page=await context.newPage();
  const errors=[],searchQueries=[],weatherQueries=[],forecastDayParams=[];
  page.on("pageerror",e=>errors.push(e.message));
  await page.route("https://api.weatherapi.com/v1/search.json**",async route=>{
   const q=new URL(route.request().url()).searchParams.get("q")||"";
   searchQueries.push(q);
   const matches=q.toLowerCase().includes("no-such")?[]:[
    {id:1,name:"Mandi",region:"Himachal Pradesh",country:"India",lat:31.708,lon:76.932},
    {id:2,name:"Mandi Dabwali",region:"Haryana",country:"India",lat:29.98,lon:74.7}
   ];
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(matches)});
  });
  await page.route("https://api.weatherapi.com/v1/forecast.json**",async route=>{
   const requestUrl=new URL(route.request().url());
   const q=requestUrl.searchParams.get("q")||"";
   weatherQueries.push(q);
   forecastDayParams.push(requestUrl.searchParams.get("days"));
   await route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({
    location:{name:q==="auto:ip"?"Approximate Area":"Mandi",region:"Himachal Pradesh",country:"India",localtime:"2026-11-21 17:00"},
    current:{temp_c:21,feelslike_c:22,humidity:45,wind_kph:6,pressure_mb:1012,uv:3,condition:{text:"Partly cloudy",icon:""}},
    forecast:{forecastday:[
     {date:"2026-11-23",day:{maxtemp_c:23,mintemp_c:12,condition:{text:"Partly cloudy"},daily_chance_of_rain:10}},
     {date:"2026-11-24",day:{maxtemp_c:22,mintemp_c:11,condition:{text:"Sunny"},daily_chance_of_rain:0}},
     {date:"2026-11-25",day:{maxtemp_c:20,mintemp_c:10,condition:{text:"Light rain"},daily_chance_of_rain:65}}
    ]}
   })});
  });
  const response=await page.goto(baseUrl+"/weather.html",{waitUntil:"domcontentloaded"});
  assert.equal(response?.status(),200,viewport.name+": weather page returns HTTP 200");
  assert.equal(weatherQueries.length,0,viewport.name+": no automatic weather request");
  assert.equal(searchQueries.length,0,viewport.name+": no automatic location search");
  pass(viewport.name+": no silent location request on page load");

  await page.locator("#locationInput").fill("Mandi");
  await page.waitForFunction(()=>document.querySelectorAll("#weatherSuggestions [role=option]").length===2);
  assert.ok(searchQueries.includes("Mandi"));
  await page.locator("#weatherSuggestions [role=option]").first().click();
  await page.waitForFunction(()=>document.querySelector("#weatherResult")?.hidden===false);
  assert.equal(weatherQueries.at(-1),"31.708,76.932");
  assert.equal(forecastDayParams.at(-1),"3");
  assert.equal(await page.locator("#weatherForecast .weather-forecast-day").count(),3);
  assert.match(await page.locator("#weatherForecast").innerText(),/65%/);
  assert.match(await page.locator("#weatherCity").innerText(),/Mandi, Himachal Pradesh, India/);
  pass(viewport.name+": search suggestions load exact selected coordinates");

  await page.locator("#locationInput").fill("no-such-place");
  await page.waitForFunction(()=>document.querySelector("#weatherStatus")?.textContent?.includes("No matching places"));
  pass(viewport.name+": unmatched search shows clear feedback");

  await page.locator("#useMyLocationBtn").click();
  await page.waitForFunction(()=>document.querySelector("#weatherSourceLabel")?.textContent==="DEVICE LOCATION");
  assert.equal(weatherQueries.at(-1),"31.708,76.932");
  assert.match(await page.locator("#weatherStatus").innerText(),/accuracy.*42/i);
  const geoOptions=await page.evaluate(()=>window.__weatherGeoOptions);
  assert.deepEqual(geoOptions,{enableHighAccuracy:false,timeout:6000,maximumAge:300000},
    viewport.name+": desktop location uses a fast network-assisted request");
  pass(viewport.name+": device location uses fast cached/network-assisted coordinates and reports accuracy");

  await page.locator("#useApproxLocationBtn").click();
  await page.waitForFunction(()=>document.querySelector("#weatherSourceLabel")?.textContent==="APPROXIMATE LOCATION");
  assert.equal(weatherQueries.at(-1),"auto:ip");
  pass(viewport.name+": approximate IP location is opt-in and labelled");

  await page.locator('[data-lang="hi"]').click();
  await page.waitForFunction(()=>document.documentElement.lang==="hi"&&document.querySelector("#weatherPageTitle")?.textContent?.trim()==="आपके आस-पास का मौसम");
  await page.locator('[data-lang="en"]').click();
  await page.waitForFunction(()=>document.documentElement.lang==="en");
  pass(viewport.name+": Hindi and English translations switch");

  const size=await page.evaluate(()=>({viewport:document.documentElement.clientWidth,document:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)}));
  assert.ok(size.document<=size.viewport+2,viewport.name+": no horizontal overflow");
  assert.deepEqual(errors,[],viewport.name+": no uncaught browser errors");
  pass(viewport.name+": responsive layout and browser runtime are clean");
  await context.close();
 }
 console.log("\\nWeather browser checks: "+passed+" passed, 0 failed");
}finally{await browser.close();}
