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

// Menschlichere Texteingabe
async function humanType(page, selector, text) {
  await page.waitForSelector(selector, { timeout: 10000 });
  const element = await page.$(selector);
  await element.click();

  // Tippe Zeichen für Zeichen mit zufälligen Verzögerungen
  for (const char of text) {
    await element.type(char, { delay: Math.random() * 100 + 50 });
  }
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

    // await acceptCookie(page);

    // await humanType(page, '[placeholder="(Jobtitel, Kompetenz oder Firmenname)"]', CONFIG.suchbegriff)

    // await randomWait(100, 200);

    // await humanType(page, '[placeholder="(Ort oder 5-stellige PLZ)"]', "Deutschland")

    // await randomWait(100, 200);

    // await page.click('[aria-label="Jobs finden"]');

    // await wait(3000, "Warte auf Suchergebnisse...");

    // await page.click('[data-at="applicationMethod-option-schnelle-bewerbung"]');
    // console.log("✅ Schnelle Bewerbung Filter geklickt");

    // // Warte auf DOM-Stabilisierung nach Filter-Klick
    // await randomWait(2000, 3000);

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

      await newPage.click('.job-ad-display-wg9eq6');

      await randomWait(3000, 4000);

      const pages1 = await browser.pages();

      const newPage1 = pages1[pages1.length - 1];

      await randomWait(3000, 4000);
      const applyElement = await newPage1.$('[type="submit"]')
      console.log("gefunden", applyElement)
      if (applyElement) {
        await fillApplication(newPage1);
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
  //TODO 
  // wie hat er das mit dem submit gelöst
  try {
    await wait(2000);

    // Prüfe ob Submit-Button existiert
    const submitExists = await page.$('[type="submit"]');
    console.log("Submit-Button gefunden:", !!submitExists);

    // Klicke Checkbox
    const checkboxClicked = await page.evaluate(() => {
      const checkbox = document.querySelector('.apply-application-process-renderer-wwjaa3');
      if (checkbox) {
        checkbox.scrollIntoView({ behavior: 'instant', block: 'center' });
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
        submit.scrollIntoView({ behavior: 'instant', block: 'center' });
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

    // 4. Bewerbung ausfüllen
    await fillApplication(jobPage);

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
