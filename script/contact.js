import { getLang, onLangChange } from "./i18n.js";
const form=document.querySelector("#contactForm");
const status=document.querySelector("#formStatus");
const submit=document.querySelector("#contactSubmit");
const email=document.querySelector("#contactEmail");
const phone=document.querySelector("#contactPhone");
function localize(){
  const lang=getLang();
  document.querySelectorAll("[data-en][data-hi]").forEach(el=>{el.textContent=el.dataset[lang==="hi"?"hi":"en"];});
  document.documentElement.lang=lang;
  const skip=document.querySelector(".skip-link");
  if(skip) skip.textContent=lang==="hi"?"मुख्य सामग्री पर जाएँ":"Skip to main content";
  if(status) status.textContent="";
}
localize(); onLangChange(localize);
if(form) form.addEventListener("submit",async event=>{
  event.preventDefault();
  const lang=getLang();
  if(!email.value.trim()&&!phone.value.trim()){
    status.textContent=lang==="hi"?"कृपया ईमेल या फोन नंबर दें।":"Please enter an email address or phone number.";
    (email).focus(); return;
  }
  if(!form.reportValidity()) return;
  submit.disabled=true; submit.textContent=lang==="hi"?"भेजा जा रहा है…":"Sending…";
  status.textContent="";
  try{
    const response=await fetch(form.action,{method:"POST",body:new FormData(form),headers:{Accept:"application/json"}});
    const result=await response.json();
    if(!response.ok||!result.success) throw new Error(result.message||"Submission failed");
    status.textContent=lang==="hi"?"आपका संदेश भेज दिया गया है। धन्यवाद!":"Your message has been sent. Thank you!";
    form.reset();
  }catch(error){
    status.textContent=lang==="hi"?"संदेश नहीं भेजा जा सका। कृपया कुछ देर बाद फिर कोशिश करें।":"We couldn’t send your message. Please try again in a moment.";
  }finally{
    submit.disabled=false; submit.textContent=lang==="hi"?"संदेश भेजें":"Send message";
  }
});
