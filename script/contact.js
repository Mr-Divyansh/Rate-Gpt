import { getLang, onLangChange } from "./i18n.js";

const form = document.querySelector("#contactForm");
const status = document.querySelector("#formStatus");
const submit = document.querySelector("#contactSubmit");
const email = document.querySelector("#contactEmail");
const phone = document.querySelector("#contactPhone");
const consent = document.querySelector("#contactConsent");
const WEB3FORMS_ACCESS_KEY = import.meta.env.VITE_WEB3FORMS_ACCESS_KEY?.trim() ?? "";

function localize() {
  const lang = getLang();
  document.querySelectorAll("[data-en][data-hi]").forEach((el) => {
    const value = el.dataset[lang === "hi" ? "hi" : "en"];
    if (el.id === "contactConsentText") el.innerHTML = value;
    else el.textContent = value;
  });
  document.documentElement.lang = lang;
  const skip = document.querySelector(".skip-link");
  if (skip) skip.textContent = lang === "hi" ? "मुख्य सामग्री पर जाएँ" : "Skip to main content";
  if (status) status.textContent = "";
}

localize();
onLangChange(localize);

if (form) {
  // Web3Forms access keys are public form identifiers. Their standard API is
  // intended for browser submissions; server-side calls require Pro + IP safelisting.
  form.action = "https://api.web3forms.com/submit";
  const accessKeyInput = form.querySelector('input[name="access_key"]') || document.createElement("input");
  accessKeyInput.type = "hidden";
  accessKeyInput.name = "access_key";
  accessKeyInput.value = WEB3FORMS_ACCESS_KEY;
  if (!accessKeyInput.isConnected) form.append(accessKeyInput);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const lang = getLang();

    if (!WEB3FORMS_ACCESS_KEY) {
      status.textContent = lang === "hi"
        ? "संपर्क फ़ॉर्म अभी उपलब्ध नहीं है। कृपया बाद में कोशिश करें।"
        : "The contact form is not configured yet. Please try again later.";
      return;
    }

    if (!email.value.trim() && !phone.value.trim()) {
      status.textContent = lang === "hi"
        ? "कृपया ईमेल या फोन नंबर दें।"
        : "Please enter an email address or phone number.";
      email.focus();
      return;
    }

    if (!form.reportValidity()) return;

    submit.disabled = true;
    submit.textContent = lang === "hi" ? "भेजा जा रहा है…" : "Sending…";
    status.textContent = "";

    try {
      const formData = new FormData(form);
      formData.set("subject", "New Rate-GPT Contact Request");
      formData.set("from_name", "Rate-GPT Contact Form");
      formData.set("botcheck", formData.get("botcheck") || "");

      const response = await fetch(form.action, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || result?.success !== true) {
        throw new Error(result?.message || "Submission failed");
      }

      status.textContent = lang === "hi"
        ? "आपका संदेश भेज दिया गया है। धन्यवाद!"
        : "Your message has been sent. Thank you!";
      form.reset();
    } catch {
      status.textContent = lang === "hi"
        ? "संदेश नहीं भेजा जा सका। कृपया कुछ देर बाद फिर कोशिश करें।"
        : "We couldn’t send your message. Please try again in a moment.";
    } finally {
      submit.disabled = false;
      submit.textContent = lang === "hi" ? "संदेश भेजें" : "Send message";
    }
  });
}
