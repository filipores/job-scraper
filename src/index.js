import puppeteer from "puppeteer";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, writeFileSync, existsSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const COOKIES_PATH = join(__dirname, "..", "cookies.json");

dotenv.config({ path: join(__dirname, "..", ".env") });

// Konfiguration aus .env
const CONFIG = {
  email: process.env.STEPSTONE_EMAIL,
  password: process.env.STEPSTONE_PASSWORD,
  gehalt: process.env.GEHALT || "55000",
  startdatum: process.env.STARTDATUM || "01.01.2026",
  suchbegriff: process.env.SUCHBEGRIFF || "Fullstack Entwickler",
  testModus: process.env.TEST_MODUS !== "false",
  headless: process.env.HEADLESS === "true",

  // Fragebogen
  staatsangehoerigkeit: process.env.STAATSANGEHOERIGKEIT || "DE",
  gender: process.env.GENDER || "MR",
  verfuegbarAb: process.env.VERFUEGBAR_AB || "2026-01-01",
  verfuegbarBis: process.env.VERFUEGBAR_BIS || "",
  arbeitsstundenVon: process.env.ARBEITSSTUNDEN_VON || "40",
  arbeitsstundenBis: process.env.ARBEITSSTUNDEN_BIS || "40",
  umzugsbereitschaft: process.env.UMZUGSBEREITSCHAFT || "no",
  gehaltVerhandelbar: process.env.GEHALT_VERHANDELBAR || "yes",
  deutschLevel: process.env.DEUTSCH_LEVEL || "100",
  englischLevel: process.env.ENGLISCH_LEVEL || "75",
  phpLevel: process.env.PHP_LEVEL || "66",
  htmlLevel: process.env.HTML_LEVEL || "100",
  cssLevel: process.env.CSS_LEVEL || "100",
  javascriptLevel: process.env.JAVASCRIPT_LEVEL || "66",
  fullstackLevel: process.env.FULLSTACK_LEVEL || "66",
};

// Validierung der Konfiguration
function validateConfig() {
  if (!CONFIG.email || !CONFIG.password) {
    console.error(
      "❌ Fehler: STEPSTONE_EMAIL und STEPSTONE_PASSWORD müssen in der .env Datei gesetzt sein!"
    );
    process.exit(1);
  }
}

// Wartezeit mit Logging
async function wait(ms, message = "") {
  if (message) console.log(`⏳ ${message}`);
  await new Promise((resolve) => setTimeout(resolve, ms));
}

// Zufällige Wartezeit (menschlicher)
async function randomWait(min = 1000, max = 3000) {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function acceptCookie(page) {
  const cookie = '[id="ccmgt_explicit_accept"]';
  await page.waitForSelector(cookie, {
    timeout: 10000,
  });
  await randomWait(200, 500);
  await page.click(cookie);

}

// Manueller Login - Warte bis Nutzer eingeloggt ist
async function login(page) {
  if (existsSync(COOKIES_PATH)) {
    const cookies = JSON.parse(readFileSync(COOKIES_PATH, "utf8"));
    await page.setCookie(...cookies);
    console.log("✅ Cookies geladen, Login übersprungen\n");
    return;
  }

  console.log("🔐 Keine Cookies gefunden, führe Login durch...\n");

  const login = '[aria-label="Login"]';
  const signin = '[href="/de-DE/candidate/login"]';
  const email = '[name="email"]';
  const pw = '[name="password"]';
  const weiter = '[aria-label="Weiter"]';
  const einloggen = '[aria-label="Melden Sie sich bei Ihrem Konto an"]';

  await page.goto("https://www.stepstone.de/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  await randomWait(2000, 3000);

  console.log("🍪 Suche Cookie-Banner...");
  await acceptCookie(page);

  await page.evaluate(() => window.scrollTo(0, 0));

  console.log("🔑 Klicke auf Login-Button...");
  await page.waitForSelector(login, {
    timeout: 10000,
  });
  await randomWait(500, 1000);
  await page.click(login);
  console.log("✅ Login-Button geklickt\n");

  console.log("🔑 Klicke auf Signin-Button...");
  await page.waitForSelector(signin, {
    timeout: 10000,
  });
  await randomWait(500, 1000);
  await page.click(signin);
  console.log("✅ Signin-Button geklickt\n");

  console.log("📧 Gebe Email ein...");
  await page.waitForSelector(email, {
    timeout: 10000,
  });
  await page.type(email, CONFIG.email);
  console.log("✅ Email eingegeben\n");

  console.log("➡️  Klicke auf Weiter...");
  await page.waitForSelector(weiter, {
    timeout: 10000,
  });
  await randomWait(500, 1000);
  await page.click(weiter);
  console.log("✅ Weiter geklickt\n");

  console.log("🔑 Gebe Passwort ein...");
  await page.waitForSelector(pw, {
    timeout: 10000,
  });
  await page.type(pw, CONFIG.password);
  console.log("✅ Passwort eingegeben\n");

  console.log("🔓 Klicke auf Einloggen...");
  await page.waitForSelector(einloggen, {
    timeout: 10000,
  });
  await randomWait(500, 1000);
  await page.click(einloggen);
  console.log("✅ Einloggen geklickt\n");

  await randomWait(3000, 5000);

  // Speichere Cookies nach erfolgreichem Login
  const cookies = await page.cookies();
  writeFileSync(COOKIES_PATH, JSON.stringify(cookies, null, 2));
  console.log("✅ Cookies gespeichert für zukünftige Logins\n");
}

// Suche nach Jobs
async function searchJobs(page, browser) {
  console.log("🔍 Starte Jobsuche...");

  try {
    // Zur Startseite
    await page.goto("https://www.stepstone.de/jobs/fullstack-entwickler/in-deutschland?radius=30&action=facet_selected%3bapplicationMethod%3bINTERNAL&am=INTERNAL&searchOrigin=membersarea", {
      waitUntil: "networkidle2",
    });

    await randomWait(100, 200);

    // Warte auf neue Job-Elemente
    await page.waitForSelector('article[data-testid="job-item"]', {
      timeout: 10000
    });

    // Re-query direkt vor Verwendung (GitHub Issue #6033: Verhindert "detached node" Fehler)
    const jobItems = await page.$$('article[data-testid="job-item"]');

    await randomWait(100, 200);

    // Durchlaufe Job-Items bis ein StepStone-Job gefunden wird
    for (let i = 1; i < jobItems.length; i++) {
      console.log(`\n🔍 Prüfe Job ${i + 1} von ${jobItems.length}...`);

      // Klicke auf Job-Item via evaluate (robuster gegen DOM-Änderungen)
      await page.evaluate((index) => {
        const jobs = document.querySelectorAll('article[data-testid="job-item"]');
        if (jobs[index]) jobs[index].click();
      }, i);

      await randomWait(3000, 4000);

      // Hole alle Tabs und nimm das letzte (das neue)
      const pages = await browser.pages();
      const newPage = pages[pages.length - 1];

      // await randomWait(3000, 4000);

      await newPage.waitForSelector('.job-ad-display-wg9eq6');

      // Prüfe ob Button disabled ist                                                  
      const isDisabled = await newPage.evaluate(() => {
        const button = document.querySelector('.job-ad-display-wg9eq6');
        return button.disabled || button.hasAttribute('disabled');
      });

      if (isDisabled) {
        console.log('⚠️ Button ist disabled - schließe Tab und versuche nächsten Job');
        await newPage.close();
        await randomWait(1000, 2000);
        continue;
      }

      const genderSelect = await newPage.$('.apply-application-process-renderer-uskhxb');

      if (genderSelect) {
        await newPage.select(genderSelect, CONFIG.gender);
      }


      await newPage.click('.job-ad-display-wg9eq6');

      await randomWait(3000, 4000);

      const pages1 = await browser.pages();

      const newPage1 = pages1[pages1.length - 1];

      await randomWait(3000, 4000);
      const applyElement = await newPage1.$('[type="submit"]')
      if (applyElement) {
        await fillApplication(newPage1);
        // Prüfe ob Fragebogen erscheint und fülle aus
        await fillQuestions(newPage1);
      }
      await newPage1.close();
    }

    // Keine StepStone-Jobs gefunden
    console.log("❌ Alle Jobs leiten zu externen Seiten weiter!");
    return null;
  } catch (error) {
    console.error("❌ Fehler bei der Jobsuche:", error.message);
    throw error;
  }
}

// Prüfe ob "Schnell bewerben" auf Job-Detail-Seite verfügbar ist
async function findQuickApplyJob(page) {
  console.log('⚡ Prüfe "Schnell bewerben" auf Job-Seite...');

  try {
    // Warte auf Job-Detail-Seite
    await randomWait(2000, 3000);

    // await wait(200000)
    // Suche nach "Schnell bewerben" Button auf der Detail-Seite
    const quickApplyButton = await page.$('[data-testid="harmonised-apply-button"]');

    // Klicke auf "Schnell bewerben"
    console.log('🎯 Klicke auf "Schnell bewerben"...');
    await quickApplyButton.click();
    await wait(3000, "Lade Bewerbungsformular...");

    return true;
  } catch (error) {
    console.error("❌ Fehler beim Öffnen der Bewerbung:", error.message);
    return false;
  }
}

// Bewerbung ausfüllen
async function fillApplication(page) {
  console.log("📝 Fülle Bewerbungsformular aus...");

  try {
    // Prüfe ob Submit-Button existiert
    const submitExists = await page.$('[type="submit"]');
    console.log("Submit-Button gefunden:", !!submitExists);

    // Klicke Checkbox
    const checkboxClicked = await page.evaluate(() => {
      const checkbox = document.querySelector('.apply-application-process-renderer-wwjaa3');
      if (checkbox) {
        checkbox.click();
        return true;
      }
      return false;
    });

    if (checkboxClicked) {
      console.log("✅ Checkbox geklickt");
      // Warte bis Submit-Button aktiviert wird
      await randomWait(2000, 3000);
    }

    // Klicke Submit-Button
    const submitClicked = await page.evaluate(() => {
      const submit = document.querySelector('[type="submit"]');
      if (submit && !submit.disabled) {
        submit.click();
        return true;
      }
      return false;
    });

    if (submitClicked) {
      console.log("✅ Bewerbung abgeschickt!");
    } else {
      console.log("❌ Submit-Button nicht klickbar (disabled oder nicht gefunden)");
    }

    await randomWait(3000, 5000);

    return true;
  } catch (error) {
    console.error("❌ Fehler beim Ausfüllen der Bewerbung:", error.message);
    return false;
  }
}

// Definition aller Fragebogen-Felder
const QUESTION_FIELDS = [
  { selector: 'select[name*="nationality"]', value: () => CONFIG.staatsangehoerigkeit, type: 'select', label: 'Staatsangehörigkeit' },
  { selector: 'input[name*="available_since"]', value: () => CONFIG.verfuegbarAb, type: 'input', label: 'Verfügbar ab' },
  { selector: 'input[name*="available_until"]', value: () => CONFIG.verfuegbarBis, type: 'input', label: 'Verfügbar bis', optional: true },
  { selector: 'input[name*="hours_start"]', value: () => CONFIG.arbeitsstundenVon, type: 'input', label: 'Arbeitsstunden von' },
  { selector: 'input[name*="hours_end"]', value: () => CONFIG.arbeitsstundenBis, type: 'input', label: 'Arbeitsstunden bis' },
  { selector: 'select[name*="willingness_to_relocate"]', value: () => CONFIG.umzugsbereitschaft, type: 'select', label: 'Umzugsbereitschaft' },
  { selector: 'select[name*="is_salary_flexible"]', value: () => CONFIG.gehaltVerhandelbar, type: 'select', label: 'Gehalt verhandelbar' },
  { selector: 'select[name*="language__DOT__de"]', value: () => CONFIG.deutschLevel, type: 'select', label: 'Deutsch-Level' },
  { selector: 'select[name*="language__DOT__en"]', value: () => CONFIG.englischLevel, type: 'select', label: 'Englisch-Level' },
  { selector: 'select[name*="tool__DOT__31"]', value: () => CONFIG.phpLevel, type: 'select', label: 'PHP-Level' },
  { selector: 'select[name*="tool__DOT__4816"]', value: () => CONFIG.htmlLevel, type: 'select', label: 'HTML-Level' },
  { selector: 'select[name*="tool__DOT__32"]', value: () => CONFIG.cssLevel, type: 'select', label: 'CSS-Level' },
  { selector: 'select[name*="tool__DOT__5"]', value: () => CONFIG.javascriptLevel, type: 'select', label: 'JavaScript-Level' },
  { selector: 'select[name*="tool__DOT__778018"]', value: () => CONFIG.fullstackLevel, type: 'select', label: 'Full Stack-Level' },
];

// Generische Funktion zum Ausfüllen eines Feldes
async function fillField(page, field) {
  const fieldValue = field.value();

  // Überspringe optionale Felder ohne Wert
  if (field.optional && !fieldValue) {
    return { filled: false, missing: false };
  }

  const element = await page.$(field.selector);
  if (!element) {
    // Feld nicht gefunden
    return { filled: false, missing: true, label: field.label, selector: field.selector };
  }

  if (field.type === 'select') {
    await page.select(field.selector, fieldValue);
  } else if (field.type === 'input') {
    await page.type(field.selector, fieldValue);
  } else if (field.type === 'checkbox') {
    await page.evaluate((selector) => {
      const checkbox = document.querySelector(selector);
      if (checkbox && !checkbox.checked) {
        checkbox.click();
      }
    }, field.selector);
  }

  console.log(`✅ ${field.label}: ${fieldValue}`);
  await randomWait(500, 1000);
  return { filled: true, missing: false };
}

// Fragebogen ausfüllen (optionale Seite nach Submit)
async function fillQuestions(page) {
  console.log("📋 Prüfe ob Fragebogen-Seite vorhanden ist...");

  try {
    // Warte kurz ob Fragebogen erscheint
    await randomWait(2000, 3000);

    // Prüfe ob Fragebogen-Seite existiert
    const questionForm = await page.$('[data-testid="atsiQuestionsSection"]');

    if (!questionForm) {
      console.log("ℹ️  Kein Fragebogen vorhanden - überspringe");
      return true;
    }

    console.log("📝 Fragebogen gefunden - fülle aus...");

    // Fülle alle Felder aus und sammle fehlende
    const missingFields = [];
    for (const field of QUESTION_FIELDS) {
      const result = await fillField(page, field);
      if (result.missing && !field.optional) {
        missingFields.push({ label: result.label, selector: result.selector });
      }
    }

    // Prüfe ob es unbekannte required Felder gibt
    const unknownRequiredFields = await page.evaluate(() => {
      const allInputs = document.querySelectorAll('input[required], select[required], textarea[required]');
      const unknown = [];

      allInputs.forEach(input => {
        // Prüfe ob Feld leer ist
        if (!input.value && input.type !== 'checkbox') {
          unknown.push({
            name: input.name || input.id,
            type: input.type || input.tagName.toLowerCase(),
            label: input.labels?.[0]?.textContent?.trim() || 'Unbekannt'
          });
        }
      });

      return unknown;
    });

    // Warne bei fehlenden bekannten Feldern
    if (missingFields.length > 0) {
      console.log("\n⚠️  WARNUNG: Bekannte Felder nicht gefunden:");
      missingFields.forEach(f => {
        console.log(`   ❌ ${f.label} (${f.selector})`);
      });
    }

    // Stoppe bei unbekannten required Feldern
    if (unknownRequiredFields.length > 0) {
      console.log("\n🛑 FEHLER: Unbekannte Pflichtfelder gefunden!");
      console.log("   Diese Felder müssen zu QUESTION_FIELDS hinzugefügt werden:\n");
      unknownRequiredFields.forEach(f => {
        console.log(`   ❌ ${f.label}`);
        console.log(`      Name: ${f.name}`);
        console.log(`      Type: ${f.type}\n`);
      });
      throw new Error('Unbekannte Pflichtfelder gefunden - bitte QUESTION_FIELDS erweitern!');
    }

    const legalCheckbox = await page.$('input[type="checkbox"][data-testid*="legal"]');
    if (legalCheckbox) {
      await page.evaluate(() => {
        const checkbox = document.querySelector('input[type="checkbox"][data-testid*="legal"]');
        if (checkbox && !checkbox.checked) {
          checkbox.click();
        }
      });
      console.log("✅ Workwise-Zustimmung geklickt");
      await randomWait(1000, 2000);
    }

    // Submit-Button klicken
    console.log("📤 Sende Fragebogen ab...");
    await randomWait(1000, 2000);

    const submitClicked = await page.evaluate(() => {
      const submit = document.querySelector('[data-testid="sendApplication"]');
      if (submit && !submit.disabled) {
        submit.click();
        return true;
      }
      return false;
    });

    if (submitClicked) {
      console.log("✅ Fragebogen abgeschickt!");
    } else {
      console.log("❌ Fragebogen Submit-Button nicht klickbar");
    }

    return true;
  } catch (error) {
    console.error("❌ Fehler beim Ausfüllen des Fragebogens:", error.message);
    return false;
  }
}

// Hauptfunktion
async function main() {
  console.log("🤖 StepStone Bewerbungsbot gestartet\n");
  console.log("═══════════════════════════════════════");
  console.log(`📊 Konfiguration:`);
  console.log(`   • Suchbegriff: ${CONFIG.suchbegriff}`);
  console.log(`   • Gehalt: ${CONFIG.gehalt}€`);
  console.log(`   • Startdatum: ${CONFIG.startdatum}`);
  console.log(`   • Test-Modus: ${CONFIG.testModus ? "JA ✅" : "NEIN ❌"}`);
  console.log(`   • Headless: ${CONFIG.headless ? "JA" : "NEIN"}`);
  console.log(`   • Login: MANUELL 👤`);
  console.log("═══════════════════════════════════════\n");

  validateConfig();

  let browser;

  try {
    // Browser starten
    console.log("🌐 Starte Browser...");
    browser = await puppeteer.launch({
      headless: CONFIG.headless,
      args: [
        "--start-maximized",
        "--disable-blink-features=AutomationControlled",
        "--lang=de-DE",
      ],
      defaultViewport: null, // Nutze echte Bildschirmgröße
    });

    console.log("✅ Browser gestartet!");

    const page = await browser.newPage();
    console.log("✅ Neue Seite erstellt!");

    await login(page);

    const jobPage = await searchJobs(page, browser);

    if (!jobPage) {
      console.log("❌ Keine StepStone-Jobs gefunden (nur externe Weiterleitungen). Beende Bot.");
      await browser.close();
      return;
    }

    const jobFound = await findQuickApplyJob(jobPage);

    if (!jobFound) {
      console.log("❌ Keine passende Stelle gefunden. Beende Bot.");
      await browser.close();
      return;
    }

    // Bewerbung wird bereits in searchJobs ausgefüllt
    console.log("\n✅ Bot erfolgreich beendet!");

    if (!CONFIG.testModus) {
      await wait(5000);
      await browser.close();
    }
  } catch (error) {
    console.error("\n❌ Fehler beim Ausführen des Bots:");
    console.error("Fehlertyp:", error.name);
    console.error("Nachricht:", error.message);
    if (error.stack) {
      console.error("Stack:", error.stack);
    }
    console.error("\n💡 Tipps zur Fehlerbehebung:");
    console.error(
      "   • Stelle sicher, dass deine .env Datei korrekt konfiguriert ist"
    );
    console.error("   • Überprüfe deine Internetverbindung");
    console.error("   • Versuche den Bot erneut zu starten");
    if (browser) {
      try {
        await browser.close();
      } catch (closeError) {
        console.error(
          "Fehler beim Schließen des Browsers:",
          closeError.message
        );
      }
    }
    process.exit(1);
  }
}

// Bot starten
main();
