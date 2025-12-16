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
  await randomWait(300, 800);

  // Tippe Zeichen für Zeichen mit zufälligen Verzögerungen
  for (const char of text) {
    await element.type(char, { delay: Math.random() * 100 + 50 });
  }

  await randomWait(200, 500);
}

// Screenshot für Debugging
async function takeScreenshot(page, name) {
  try {
    const timestamp = new Date().getTime();
    const filepath = join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "output",
      `${name}_${timestamp}.png`
    );
    await page.screenshot({ path: filepath, fullPage: true });
    console.log(`📸 Screenshot gespeichert: ${filepath}`);
  } catch (error) {
    console.log("⚠️  Screenshot konnte nicht erstellt werden:", error.message);
  }
}

// Überprüfe ob Nutzer eingeloggt ist
async function isLoggedIn(page) {
  try {
    // Verschiedene Methoden um Login zu erkennen
    const checks = await page.evaluate(() => {
      // Check 1: Logout-Button vorhanden?
      const logoutButton = document.querySelector(
        'a[href*="logout"], button:has-text("Logout"), a:has-text("Abmelden")'
      );

      // Check 2: Mein Account / Profil Link vorhanden?
      const accountLink = document.querySelector(
        'a[href*="account"], a[href*="profile"], a:has-text("Mein")'
      );

      // Check 3: Nicht auf Login-Seite?
      const notOnLoginPage =
        !window.location.href.includes("/login") &&
        !window.location.href.includes("/account/login");

      // Check 4: User-Menü vorhanden?
      const userMenu = document.querySelector('[data-at="user-menu"]');

      return {
        logoutButton: !!logoutButton,
        accountLink: !!accountLink,
        notOnLoginPage,
        userMenu: !!userMenu,
        url: window.location.href,
      };
    });

    // Login ist erfolgreich wenn mindestens 2 Checks positiv sind
    const positiveChecks = [
      checks.logoutButton,
      checks.accountLink,
      checks.notOnLoginPage,
      checks.userMenu,
    ].filter(Boolean).length;

    return positiveChecks >= 2;
  } catch (error) {
    return false;
  }
}

// Manueller Login - Warte bis Nutzer eingeloggt ist
async function login(page) {
  // Prüfe ob gespeicherte Cookies existieren
  if (existsSync(COOKIES_PATH)) {
    console.log("🍪 Lade gespeicherte Cookies...");
    const cookies = JSON.parse(readFileSync(COOKIES_PATH, "utf8"));
    await page.setCookie(...cookies);
    console.log("✅ Cookies geladen, Login übersprungen\n");

    await page.goto("https://www.stepstone.de/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    return;
  }

  console.log("🔐 Keine Cookies gefunden, führe Login durch...\n");

  const cookie = '[id="ccmgt_explicit_accept"]';
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
  await page.waitForSelector(cookie, {
    timeout: 10000,
  });
  await randomWait(500, 1000);
  await page.click(cookie);

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
async function searchJobs(page) {
  console.log("🔍 Starte Jobsuche...");

  try {
    // Zur Startseite
    await page.goto("https://www.stepstone.de/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await wait(2000, "Lade Startseite...");

    // Suchbegriff eingeben
    console.log(`🔎 Suche nach: "${CONFIG.suchbegriff}"`);
    const searchInput = await page.waitForSelector(
      'input[name="q"], input[data-at="search-input"]',
      { timeout: 10000 }
    );
    await searchInput.click({ clickCount: 3 }); // Text markieren
    await searchInput.type(CONFIG.suchbegriff, { delay: 100 });

    // Ort eingeben (Deutschland)
    console.log("📍 Setze Ort: Deutschland");
    const locationInput = await page.$(
      'input[name="location"], input[data-at="location-input"]'
    );
    if (locationInput) {
      await locationInput.click({ clickCount: 3 });
      await locationInput.type("Deutschland", { delay: 100 });
    }

    // Suche starten
    console.log("🚀 Starte Suche...");
    await page.click('button[type="submit"], button[data-at="search-button"]');

    await wait(3000, "Warte auf Suchergebnisse...");

    // Home-Office Filter setzen
    console.log("🏠 Setze Home-Office Filter...");
    try {
      // Warte auf Filter-Optionen
      await page.waitForSelector('[data-at="filter"]', { timeout: 5000 });

      // Klicke auf Home-Office Filter
      const homeOfficeFilter = await page.$(
        'button:has-text("Home Office"), a:has-text("Home Office"), [data-testid*="homeoffice"]'
      );
      if (homeOfficeFilter) {
        await homeOfficeFilter.click();
        await wait(2000, "Home-Office Filter aktiviert");
      } else {
        console.log("⚠️  Home-Office Filter nicht gefunden, fahre ohne fort");
      }
    } catch (e) {
      console.log("⚠️  Konnte Home-Office Filter nicht setzen:", e.message);
    }

    console.log("✅ Jobsuche abgeschlossen!");
  } catch (error) {
    console.error("❌ Fehler bei der Jobsuche:", error.message);
    throw error;
  }
}

// Finde erste "Schnell bewerben" Stelle
async function findQuickApplyJob(page) {
  console.log('⚡ Suche nach "Schnell bewerben" Stellen...');

  try {
    // Warte auf Job-Liste
    await page.waitForSelector('[data-at="job-item"], article', {
      timeout: 10000,
    });
    await wait(2000);

    // Scrolle durch die Seite um alle Jobs zu laden
    await page.evaluate(() => {
      window.scrollBy(0, 1000);
    });
    await wait(1000);

    // Suche nach "Schnell bewerben" Button
    const quickApplyButtons = await page.$$(
      '[data-at="quick-apply-button"], button:has-text("Schnell bewerben")'
    );

    if (quickApplyButtons.length === 0) {
      console.log('❌ Keine "Schnell bewerben" Stellen gefunden!');
      return null;
    }

    console.log(
      `✅ ${quickApplyButtons.length} "Schnell bewerben" Stelle(n) gefunden!`
    );

    // Klicke auf den ersten "Schnell bewerben" Button
    console.log('🎯 Öffne erste "Schnell bewerben" Stelle...');
    await quickApplyButtons[0].click();
    await wait(3000, "Lade Stellenanzeige...");

    return true;
  } catch (error) {
    console.error("❌ Fehler beim Suchen der Stelle:", error.message);
    return null;
  }
}

// Bewerbung ausfüllen
async function fillApplication(page) {
  console.log("📝 Fülle Bewerbungsformular aus...");

  try {
    // Warte auf Bewerbungsformular
    await page.waitForSelector('form, [data-at="application-form"]', {
      timeout: 10000,
    });
    await wait(2000);

    // Gehaltsvorstellung eingeben
    console.log(`💰 Trage Gehaltsvorstellung ein: ${CONFIG.gehalt}€`);
    const salaryInput = await page.$(
      'input[name*="salary"], input[placeholder*="Gehalt"]'
    );
    if (salaryInput) {
      await salaryInput.click({ clickCount: 3 });
      await salaryInput.type(CONFIG.gehalt, { delay: 100 });
    }

    // Startdatum eingeben
    console.log(`📅 Trage Startdatum ein: ${CONFIG.startdatum}`);
    const startDateInput = await page.$(
      'input[name*="start"], input[placeholder*="Datum"]'
    );
    if (startDateInput) {
      await startDateInput.click({ clickCount: 3 });
      await startDateInput.type(CONFIG.startdatum, { delay: 100 });
    }

    await wait(2000);

    console.log("✅ Formular ausgefüllt!");

    // Test-Modus: Stoppe hier
    if (CONFIG.testModus) {
      console.log("\n⚠️  TEST-MODUS AKTIV - Bewerbung wird NICHT abgesendet!");
      console.log("📋 Du kannst jetzt das Formular überprüfen.");
      console.log(
        "💡 Um automatisch zu versenden, setze TEST_MODUS=false in der .env Datei"
      );
      console.log("\n⏸️  Browser bleibt offen zur Überprüfung...");

      // Warte 2 Minuten, damit der Benutzer das Formular überprüfen kann
      await wait(120000, "Warte 2 Minuten...");
      return true;
    }

    // Bewerbung absenden (nur wenn TEST_MODUS=false)
    console.log("📤 Sende Bewerbung ab...");
    const submitButton = await page.$(
      'button[type="submit"], button:has-text("Bewerben")'
    );
    if (submitButton) {
      await submitButton.click();
      await wait(3000, "Warte auf Bestätigung...");
      console.log("✅ Bewerbung abgesendet!");
    }

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

    // 1. Login
    await login(page);

    // 2. Jobs suchen
    await searchJobs(page);

    // 3. Erste "Schnell bewerben" Stelle finden
    const jobFound = await findQuickApplyJob(page);

    if (!jobFound) {
      console.log("❌ Keine passende Stelle gefunden. Beende Bot.");
      await browser.close();
      return;
    }

    // 4. Bewerbung ausfüllen
    await fillApplication(page);

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
