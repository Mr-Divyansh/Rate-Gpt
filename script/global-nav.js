const navigationLinks=[["Home","index.html"],["Mandi Prices","mandi-prices.html"],["About Us","about.html"]];
const currentPage=window.location.pathname.split("/").pop()?.toLowerCase()||"index.html";
const makeLink=([label,href],footer=false)=>{const link=document.createElement("a");link.href=href;link.textContent=label;if(href===currentPage){link.classList.add("is-current");link.setAttribute("aria-current","page");}return link;};
function renderHeader(header){
 const logoSrc=header.querySelector(".brand img")?.getAttribute("src")||"Images/Logo.jpeg";
 header.className="global-site-header";header.replaceChildren();
 const inner=document.createElement("div");inner.className="global-header-inner";
 const brand=document.createElement("a");brand.className="global-brand";brand.href="index.html";brand.setAttribute("aria-label","Rate-GPT home");
 const logo=document.createElement("img");logo.src=logoSrc;logo.alt="";logo.width=42;logo.height=42;logo.decoding="async";brand.append(logo);
 const brandText=document.createElement("span");brandText.append(document.createTextNode("Rate-GPT"));const tagline=document.createElement("small");tagline.textContent="MARKET INTELLIGENCE";brandText.append(tagline);brand.append(brandText);
 const nav=document.createElement("nav");nav.className="global-navigation";nav.id="globalNavigation";nav.setAttribute("aria-label","Main navigation");navigationLinks.forEach(item=>nav.append(makeLink(item)));
 const actions=document.createElement("div");actions.className="global-header-actions";
 const menu=document.createElement("button");menu.className="global-menu-toggle";menu.type="button";menu.setAttribute("aria-controls",nav.id);menu.setAttribute("aria-expanded","false");menu.setAttribute("aria-label","Open navigation");for(let i=0;i<3;i++)menu.append(document.createElement("span"));
 actions.append(menu);inner.append(brand,nav,actions);header.append(inner);
 const backdrop=document.createElement("div");backdrop.className="global-nav-backdrop";backdrop.setAttribute("aria-hidden","true");document.body.append(backdrop);
 const close=()=>{nav.classList.remove("is-open");backdrop.classList.remove("is-visible");menu.setAttribute("aria-expanded","false");menu.setAttribute("aria-label","Open navigation");document.body.classList.remove("global-menu-open");};
 const open=()=>{nav.classList.add("is-open");backdrop.classList.add("is-visible");menu.setAttribute("aria-expanded","true");menu.setAttribute("aria-label","Close navigation");document.body.classList.add("global-menu-open");const first=nav.querySelector("a");if(first)first.focus({preventScroll:true});};
 menu.addEventListener("click",()=>menu.getAttribute("aria-expanded")==="true"?close():open());
 backdrop.addEventListener("click",close);nav.addEventListener("click",e=>{if(e.target instanceof Element&&e.target.closest("a"))close();});
 document.addEventListener("keydown",e=>{if(e.key==="Escape"&&menu.getAttribute("aria-expanded")==="true"){close();menu.focus();}});
 window.addEventListener("resize",()=>{if(window.innerWidth>900)close();},{passive:true});
}
function renderFooter(footer){
 footer.className="global-site-footer";footer.replaceChildren();
 const inner=document.createElement("div");inner.className="global-footer-inner";
 const main=document.createElement("div");main.className="global-footer-main";
 const summary=document.createElement("section");summary.className="global-footer-summary";
 const brand=document.createElement("a");brand.className="global-footer-brand";brand.href="index.html";
 const logo=document.createElement("img");logo.src="Images/Logo.jpeg";logo.alt="";logo.width=42;logo.height=42;logo.loading="lazy";logo.decoding="async";
 const brandName=document.createElement("span");brandName.textContent="Rate-GPT";brand.append(logo,brandName);
 const desc=document.createElement("p");desc.textContent="Clear access to government-reported mandi price records, helping farmers explore markets with better information.";
 const source=document.createElement("a");source.className="global-footer-source";source.href="https://data.gov.in/";source.target="_blank";source.rel="noopener noreferrer";source.textContent="Explore Open Government Data ↗";summary.append(brand,desc,source);
 const explore=document.createElement("section");const exploreTitle=document.createElement("h2");exploreTitle.className="global-footer-heading";exploreTitle.textContent="Explore";const links=document.createElement("nav");links.className="global-footer-links";links.setAttribute("aria-label","Footer navigation");navigationLinks.forEach(item=>links.append(makeLink(item,true)));explore.append(exploreTitle,links);
 const cta=document.createElement("section");cta.className="global-footer-cta";const ctaTitle=document.createElement("h2");ctaTitle.className="global-footer-heading";ctaTitle.textContent="Make informed market decisions";const ctaText=document.createElement("p");ctaText.textContent="Browse available crop prices, compare reported market rates and always check the arrival date.";const ctaLink=document.createElement("a");ctaLink.className="global-footer-cta-link";ctaLink.href="mandi-prices.html";ctaLink.append(document.createTextNode("Explore mandi prices"),document.createTextNode(" →"));cta.append(ctaTitle,ctaText,ctaLink);
 main.append(summary,explore,cta);
 const bottom=document.createElement("div");bottom.className="global-footer-bottom";const copyright=document.createElement("p");copyright.textContent="© "+new Date().getFullYear()+" Rate-GPT. All rights reserved.";const note=document.createElement("p");note.textContent="Market records are informational and may not reflect a current offer.";bottom.append(copyright,note);inner.append(main,bottom);footer.append(inner);
}
const header=document.querySelector("header.site-header");if(header)renderHeader(header);
let footer=document.querySelector("footer.site-footer");if(!footer){footer=document.createElement("footer");document.body.append(footer);}renderFooter(footer);
