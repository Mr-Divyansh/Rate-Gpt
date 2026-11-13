/* Tiny EN / हिंदी layer. Static text uses data-i18n="key"; scripts call t("key", {vars}). */
const STRINGS = {
  en: {
    "nav.skip": "Skip to main content",
    "nav.home": "Home",
    "nav.prices": "Mandi prices",
    "nav.about": "About",
    "nav.label": "Main navigation",
    "lang.label": "Language",
    "brand.tag": "Mandi price discovery",

    "field.state": "State",
    "field.district": "District",
    "field.statePh": "Select a state",
    "field.districtPh": "Select a district",

    "home.doc": "Rate-GPT | Mandi Price Discovery",
    "home.title": "What are crops selling for at your mandi?",
    "home.lede": "Pick your state and district to see government-reported minimum, maximum and modal prices, with the date each crop arrived.",
    "home.go": "See prices",
    "home.fine": "Prices are in ₹ per quintal. They are recorded sales, not offers.",
    "board.title": "Latest records from {market}",
    "board.meta": "{district}, {state} · arrivals up to {date}",
    "board.unit": "₹ per quintal",
    "board.loading": "Loading latest records…",
    "board.titleNone": "Latest records",
    "board.trend": "Modal price over the last {n} arrivals · {crop}",
    "board.trendEmpty": "Not enough arrivals to show a trend yet.",
    "board.open": "Open this mandi’s full list",
    "board.empty": "No price records are stored yet.",
    "board.error": "Couldn’t load prices. {reason}",
    "board.retry": "Try again",
    "board.modal": "Modal",

    "read.title": "How to read a mandi rate",
    "read.lead": "Each record gives three prices for one crop on one arrival date. Start with the modal price.",
    "read.example": "Example: wheat, ₹ per quintal",
    "read.min": "Minimum",
    "read.minD": "The lowest price any lot sold for.",
    "read.modal": "Modal",
    "read.modalD": "The price most lots sold at. The best single number to compare.",
    "read.max": "Maximum",
    "read.maxD": "The highest price paid, usually for the best quality.",
    "tips.title": "Before you sell",
    "tip.date": "Check the arrival date. An old record may not match today’s market.",
    "tip.compare": "Compare two or three nearby mandis, then subtract transport costs.",
    "tip.quality": "Quality and moisture in your crop change the price you get.",

    "source.title": "Where these numbers come from",
    "source.body": "Rate-GPT stores prices published on the Government of India’s open data platform (AGMARKNET) and shows them as reported. It doesn’t fill in missing values or predict future prices.",
    "source.sync": "Last sync",
    "source.status": "Data status",
    "source.cta": "See prices",
    "source.more": "About the data",
    "fresh.Fresh data": "Fresh data",
    "fresh.Data is outdated": "Data is outdated",
    "fresh.No successful sync": "No successful sync yet",

    "footer.blurb": "Government-reported mandi prices, presented clearly.",
    "footer.explore": "Explore",
    "footer.source": "Open Government Data",
    "footer.note": "Records are for information and may not match a current offer.",
    "footer.rights": "© {year} Rate-GPT",

    "prices.doc": "Mandi Prices | Rate-GPT",
    "prices.title": "Mandi prices",
    "prices.lede": "Choose a mandi to see the prices recorded there. Search by crop name in English or Hindi.",
    "sync.updated": "{status} · updated {time}",
    "sync.none": "Data status unavailable",
    "sync.never": "No successful sync yet",
    "sync.next": "Next scheduled update in {time}",
    "time.hm": "{h}h {m}m",
    "time.m": "{m} min",
    "sync.nextNone": "Scheduled updates aren’t configured in this environment.",
    "finder.title": "Choose your mandi",
    "finder.recent": "Recent",
    "finder.mandis": "Mandis in {district}",
    "finder.count.one": "{n} mandi with price records",
    "finder.count.other": "{n} mandis with price records",
    "finder.pick": "Choose a state and district to see its mandis.",
    "finder.none": "No mandis with stored prices in this district.",
    "finder.fail": "Couldn’t load locations. {reason}",
    "results.titleSet": "Prices at {market}",
    "results.titleNone": "Crop prices",
    "results.count.one": "{n} record",
    "results.count.other": "{n} records",
    "results.search": "Search crops",
    "results.placeholder": "Search a crop, e.g. wheat or गेहूँ",
    "results.sort": "Sort by",
    "results.reset": "Reset",
    "results.pickMandi": "Choose a mandi above to see its prices.",
    "results.none": "No records match this search. Try another crop name.",
    "results.loading": "Loading prices…",
    "results.showing": "Showing {a} of {b} records",
    "results.more": "Show more",
    "results.unit": "Prices in ₹ per quintal",
    "results.error": "Couldn’t load prices. {reason}",
    "results.retry": "Try again",
    "results.caption": "Crop prices at the selected mandi",
    "sort.date_desc": "Latest arrival",
    "sort.modal_price_asc": "Modal price: low to high",
    "sort.modal_price_desc": "Modal price: high to low",
    "sort.commodity_asc": "Crop name A–Z",
    "col.crop": "Crop",
    "col.arrival": "Arrival date",
    "col.range": "Min – Max",
    "col.modal": "Modal price",
    "col.change": "Since last arrival",
    "delta.up": "Up {amount}",
    "delta.down": "Down {amount}",
    "delta.same": "No change",
    "delta.none": "No earlier record",
    "range.aria": "Minimum {min}, modal {modal}, maximum {max} per quintal",
    "unit.qtl": "per quintal",
    "note.title": "Compare before you sell",
    "note.body": "Prices differ between mandis. Check transport costs, quality and the latest arrival date before you decide.",

    "about.doc": "About | Rate-GPT",
    "about.title": "Better information, better sale.",
    "about.lede": "Rate-GPT makes recorded mandi prices easy to search by crop and location, so you can compare markets in one place.",
    "about.cta": "Explore mandi prices",
    "about.note": "Market prices are observations, not promises. Check the arrival date and confirm details at the mandi.",
    "about.why.title": "Why Rate-GPT exists",
    "about.why.p1": "Mandi prices are reported across many markets and dates, which makes them hard to compare. Rate-GPT brings those records into one searchable view for any crop, state, district and mandi.",
    "about.why.p2": "The goal is practical price discovery. Rate-GPT doesn’t predict what a crop will sell for or replace your own judgement. Use the records alongside crop quality, transport costs and local demand.",
    "about.how.title": "How it works",
    "about.step1.t": "Choose a location",
    "about.step1.d": "Pick a state and district, then a mandi from the list.",
    "about.step2.t": "Find a crop",
    "about.step2.d": "Search the mandi’s stored records and sort them by date or price.",
    "about.step3.t": "Compare the rates",
    "about.step3.d": "Read the minimum, maximum and modal price with the arrival date. Prices are in ₹ per quintal.",
    "about.src.title": "Data source and transparency",
    "about.src.p1": "The intended source is the Government of India Open Government Data platform (AGMARKNET). Rate-GPT stores records from successful syncs and shows the values it holds.",
    "about.src.p2": "Freshness depends on the source and on successful syncs. A sync time is not an arrival date, so use the date on each record. Missing values show as unavailable and are never estimated.",
    "about.src.link": "Visit data.gov.in",
    "about.limits.title": "Limits to keep in mind",
    "about.limit1": "Prices are reported for one crop, market and arrival date. They may not match a current offer.",
    "about.limit2": "Not every mandi, crop or date has data.",
    "about.limit3": "Rate-GPT doesn’t guarantee a sale price and doesn’t account for quality, fees, transport or negotiation.",
    "about.limit4": "Confirm current rates with the mandi before you decide."
  },
  hi: {
    "nav.skip": "मुख्य सामग्री पर जाएँ",
    "nav.home": "होम",
    "nav.prices": "मंडी भाव",
    "nav.about": "हमारे बारे में",
    "nav.label": "मुख्य मेनू",
    "lang.label": "भाषा",
    "brand.tag": "मंडी भाव खोजें",

    "field.state": "राज्य",
    "field.district": "ज़िला",
    "field.statePh": "राज्य चुनें",
    "field.districtPh": "ज़िला चुनें",

    "home.doc": "Rate-GPT | मंडी भाव खोजें",
    "home.title": "आपकी मंडी में फसल का भाव क्या है?",
    "home.lede": "अपना राज्य और ज़िला चुनें। सरकारी रिकॉर्ड के अनुसार हर फसल का न्यूनतम, अधिकतम और मॉडल भाव, आवक की तारीख के साथ देखें।",
    "home.go": "भाव देखें",
    "home.fine": "भाव ₹ प्रति क्विंटल में हैं। ये दर्ज बिक्री के रिकॉर्ड हैं, खरीद का प्रस्ताव नहीं।",
    "board.title": "{market} के ताज़ा रिकॉर्ड",
    "board.meta": "{district}, {state} · आवक {date} तक",
    "board.unit": "₹ प्रति क्विंटल",
    "board.loading": "ताज़ा रिकॉर्ड लोड हो रहे हैं…",
    "board.titleNone": "ताज़ा रिकॉर्ड",
    "board.trend": "पिछली {n} आवक का मॉडल भाव · {crop}",
    "board.trendEmpty": "रुझान दिखाने के लिए अभी पर्याप्त आवक नहीं है।",
    "board.open": "इस मंडी की पूरी सूची खोलें",
    "board.empty": "अभी कोई भाव रिकॉर्ड सहेजा नहीं गया है।",
    "board.error": "भाव लोड नहीं हो सके। {reason}",
    "board.retry": "फिर कोशिश करें",
    "board.modal": "मॉडल",

    "read.title": "मंडी भाव कैसे पढ़ें",
    "read.lead": "हर रिकॉर्ड में एक फसल के लिए एक आवक-तारीख के तीन भाव होते हैं। सबसे पहले मॉडल भाव देखें।",
    "read.example": "उदाहरण: गेहूँ, ₹ प्रति क्विंटल",
    "read.min": "न्यूनतम",
    "read.minD": "सबसे कम भाव, जिस पर कोई माल बिका।",
    "read.modal": "मॉडल",
    "read.modalD": "वह भाव जिस पर सबसे ज़्यादा माल बिका। तुलना के लिए सबसे काम का आँकड़ा।",
    "read.max": "अधिकतम",
    "read.maxD": "सबसे ऊँचा भाव, आमतौर पर सबसे अच्छी क्वालिटी के लिए।",
    "tips.title": "बेचने से पहले",
    "tip.date": "आवक की तारीख देखें। पुराना रिकॉर्ड आज के बाज़ार से मेल नहीं खा सकता।",
    "tip.compare": "आस-पास की दो-तीन मंडियों की तुलना करें, फिर ढुलाई का खर्च घटाकर देखें।",
    "tip.quality": "आपकी फसल की क्वालिटी और नमी से मिलने वाला भाव बदल जाता है।",

    "source.title": "ये आँकड़े कहाँ से आते हैं",
    "source.body": "Rate-GPT भारत सरकार के ओपन डेटा प्लेटफ़ॉर्म (AGMARKNET) पर छपे भाव सहेजता है और उन्हें जैसा दर्ज है वैसा ही दिखाता है। यह छूटे हुए आँकड़े नहीं भरता और आगे के भाव का अनुमान नहीं लगाता।",
    "source.sync": "आख़िरी सिंक",
    "source.status": "डेटा की स्थिति",
    "source.cta": "भाव देखें",
    "source.more": "आँकड़ों के बारे में",
    "fresh.Fresh data": "ताज़ा आँकड़े",
    "fresh.Data is outdated": "आँकड़े पुराने हैं",
    "fresh.No successful sync": "अभी तक कोई सफल सिंक नहीं",

    "footer.blurb": "सरकारी मंडी भाव, साफ़ तरीके से।",
    "footer.explore": "देखें",
    "footer.source": "ओपन गवर्नमेंट डेटा",
    "footer.note": "ये रिकॉर्ड सिर्फ़ जानकारी के लिए हैं और मौजूदा प्रस्ताव से अलग हो सकते हैं।",
    "footer.rights": "© {year} Rate-GPT",

    "prices.doc": "मंडी भाव | Rate-GPT",
    "prices.title": "मंडी भाव",
    "prices.lede": "कोई मंडी चुनें और वहाँ दर्ज भाव देखें। फसल का नाम हिंदी या अंग्रेज़ी में खोजें।",
    "sync.updated": "{status} · अपडेट {time}",
    "sync.none": "डेटा की स्थिति उपलब्ध नहीं",
    "sync.never": "अभी तक कोई सफल सिंक नहीं",
    "sync.next": "अगला निर्धारित अपडेट {time} में",
    "time.hm": "{h} घंटे {m} मिनट",
    "time.m": "{m} मिनट",
    "sync.nextNone": "इस वातावरण में निर्धारित अपडेट चालू नहीं हैं।",
    "finder.title": "अपनी मंडी चुनें",
    "finder.recent": "हाल की",
    "finder.mandis": "{district} की मंडियाँ",
    "finder.count.one": "{n} मंडी में भाव रिकॉर्ड हैं",
    "finder.count.other": "{n} मंडियों में भाव रिकॉर्ड हैं",
    "finder.pick": "मंडियाँ देखने के लिए राज्य और ज़िला चुनें।",
    "finder.none": "इस ज़िले में भाव रिकॉर्ड वाली कोई मंडी नहीं है।",
    "finder.fail": "जगहों की सूची लोड नहीं हो सकी। {reason}",
    "results.titleSet": "{market} के भाव",
    "results.titleNone": "फसलों के भाव",
    "results.count.one": "{n} रिकॉर्ड",
    "results.count.other": "{n} रिकॉर्ड",
    "results.search": "फसल खोजें",
    "results.placeholder": "फसल खोजें, जैसे गेहूँ या wheat",
    "results.sort": "क्रम",
    "results.reset": "रीसेट",
    "results.pickMandi": "ऊपर से कोई मंडी चुनें और उसके भाव देखें।",
    "results.none": "इस खोज से कोई रिकॉर्ड नहीं मिला। फसल का दूसरा नाम आज़माएँ।",
    "results.loading": "भाव लोड हो रहे हैं…",
    "results.showing": "{b} में से {a} रिकॉर्ड दिख रहे हैं",
    "results.more": "और दिखाएँ",
    "results.unit": "भाव ₹ प्रति क्विंटल में",
    "results.error": "भाव लोड नहीं हो सके। {reason}",
    "results.retry": "फिर कोशिश करें",
    "results.caption": "चुनी हुई मंडी में फसलों के भाव",
    "sort.date_desc": "सबसे नई आवक",
    "sort.modal_price_asc": "मॉडल भाव: कम से ज़्यादा",
    "sort.modal_price_desc": "मॉडल भाव: ज़्यादा से कम",
    "sort.commodity_asc": "फसल का नाम A–Z",
    "col.crop": "फसल",
    "col.arrival": "आवक की तारीख",
    "col.range": "न्यूनतम – अधिकतम",
    "col.modal": "मॉडल भाव",
    "col.change": "पिछली आवक से",
    "delta.up": "{amount} बढ़ा",
    "delta.down": "{amount} घटा",
    "delta.same": "कोई बदलाव नहीं",
    "delta.none": "पहले का रिकॉर्ड नहीं",
    "range.aria": "न्यूनतम {min}, मॉडल {modal}, अधिकतम {max} प्रति क्विंटल",
    "unit.qtl": "प्रति क्विंटल",
    "note.title": "बेचने से पहले तुलना करें",
    "note.body": "अलग-अलग मंडियों में भाव अलग होते हैं। फैसला लेने से पहले ढुलाई का खर्च, क्वालिटी और आवक की ताज़ा तारीख देखें।",

    "about.doc": "हमारे बारे में | Rate-GPT",
    "about.title": "बेहतर जानकारी, बेहतर बिक्री।",
    "about.lede": "Rate-GPT दर्ज मंडी भाव को फसल और जगह के हिसाब से खोजना आसान बनाता है, ताकि आप सभी बाज़ार एक ही जगह देख सकें।",
    "about.cta": "मंडी भाव देखें",
    "about.note": "मंडी भाव दर्ज अवलोकन हैं, वादा नहीं। आवक की तारीख देखें और मंडी में जाकर पुष्टि करें।",
    "about.why.title": "Rate-GPT क्यों बना",
    "about.why.p1": "मंडी भाव कई बाज़ारों और तारीखों में दर्ज होते हैं, इसलिए उनकी तुलना मुश्किल है। Rate-GPT इन रिकॉर्ड को एक खोजने लायक जगह पर लाता है: किसी भी फसल, राज्य, ज़िले और मंडी के लिए।",
    "about.why.p2": "मकसद काम का भाव-ज्ञान है। Rate-GPT यह अनुमान नहीं लगाता कि फसल किस भाव बिकेगी, और आपके अपने फैसले की जगह नहीं लेता। रिकॉर्ड को फसल की क्वालिटी, ढुलाई के खर्च और स्थानीय माँग के साथ देखें।",
    "about.how.title": "यह कैसे काम करता है",
    "about.step1.t": "जगह चुनें",
    "about.step1.d": "राज्य और ज़िला चुनें, फिर सूची से मंडी।",
    "about.step2.t": "फसल खोजें",
    "about.step2.d": "मंडी के सहेजे रिकॉर्ड में खोजें और तारीख या भाव से क्रम बदलें।",
    "about.step3.t": "भाव की तुलना करें",
    "about.step3.d": "आवक की तारीख के साथ न्यूनतम, अधिकतम और मॉडल भाव पढ़ें। भाव ₹ प्रति क्विंटल में हैं।",
    "about.src.title": "डेटा स्रोत और पारदर्शिता",
    "about.src.p1": "तय स्रोत भारत सरकार का ओपन गवर्नमेंट डेटा प्लेटफ़ॉर्म (AGMARKNET) है। Rate-GPT सफल सिंक के रिकॉर्ड सहेजता है और जो आँकड़े उसके पास हैं वही दिखाता है।",
    "about.src.p2": "ताज़गी स्रोत और सफल सिंक पर निर्भर करती है। सिंक का समय आवक की तारीख नहीं है, इसलिए हर रिकॉर्ड पर दी गई तारीख देखें। जो आँकड़ा नहीं है वह “उपलब्ध नहीं” दिखता है, अनुमान से नहीं भरा जाता।",
    "about.src.link": "data.gov.in खोलें",
    "about.limits.title": "ध्यान रखने वाली बातें",
    "about.limit1": "भाव एक फसल, एक बाज़ार और एक आवक-तारीख के लिए दर्ज होते हैं। वे मौजूदा प्रस्ताव से अलग हो सकते हैं।",
    "about.limit2": "हर मंडी, फसल या तारीख का डेटा उपलब्ध नहीं होता।",
    "about.limit3": "Rate-GPT बिक्री के भाव की गारंटी नहीं देता और क्वालिटी, शुल्क, ढुलाई या मोल-भाव का हिसाब नहीं रखता।",
    "about.limit4": "फैसला लेने से पहले मंडी से मौजूदा भाव की पुष्टि करें।"
  }
};

const STORAGE_KEY = "rategpt.lang";

function detectLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "hi") return saved;
  } catch {
    /* storage can be blocked; fall through */
  }
  return (navigator.language || "").toLowerCase().startsWith("hi") ? "hi" : "en";
}

let lang = detectLang();

export const getLang = () => lang;
export const getLocale = () => (lang === "hi" ? "hi-IN" : "en-IN");

export function t(key, vars = {}) {
  const template = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? ""));
}

export function tCount(base, n, vars = {}) {
  return t(`${base}.${n === 1 ? "one" : "other"}`, { n, ...vars });
}

export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
    for (const pair of el.dataset.i18nAttr.split(";")) {
      const [attr, key] = pair.split(":").map((s) => s.trim());
      if (attr && key) el.setAttribute(attr, t(key));
    }
  });
}

export function setLang(next) {
  if ((next !== "en" && next !== "hi") || next === lang) return;
  lang = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  applyI18n();
  document.dispatchEvent(new CustomEvent("langchange", { detail: { lang } }));
}

export function onLangChange(callback) {
  document.addEventListener("langchange", () => callback(lang));
}
