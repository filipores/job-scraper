# StepStone Bewerbungsbot

Automatisierter Bot für Bewerbungen auf Fullstack Entwickler Stellen bei StepStone mit "Schnell bewerben" Funktion.

## Installation

1. **Projekt klonen/herunterladen**

2. **Dependencies installieren**
   ```bash
   npm install
   ```

## Verwendung

### Test-Modus (Empfohlen für den Start)

Im Test-Modus stoppt der Bot vor dem finalen Absenden der Bewerbung, damit du alles überprüfen kannst:

```bash
npm start
```

Der Bot wird:

1. ✅ Bei StepStone einloggen
2. ✅ Nach Jobs suchen (Fullstack Entwickler, Deutschland, Home-Office)
3. ✅ Die erste "Schnell bewerben" Stelle finden
4. ✅ Das Formular ausfüllen (Gehalt, Startdatum)
5. ⏸️ **STOPPEN** vor dem Absenden (Browser bleibt 2 Min. offen zur Überprüfung)

### Automatischer Modus

⚠️ **Vorsicht**: Der Bot sendet Bewerbungen automatisch ab!

Um den automatischen Modus zu aktivieren, setze in der `.env` Datei:

```env
TEST_MODUS=false
```

Dann starte den Bot:

```bash
npm start
```

## Entwicklung

### Projektstruktur

```
job-scraper/
├── src/
│   └── index.js          # Hauptdatei des Bots
├── output/               # Für zukünftige Logs/Berichte
├── .env                  # Deine Konfiguration (NICHT committen!)
├── .env.example          # Beispiel-Konfiguration
├── .gitignore           # Git-Ignore Datei
├── package.json         # Node.js Dependencies
└── README.md            # Diese Datei
```

### Zukünftige Erweiterungen

Mögliche Features für die Zukunft:

- [ ] Auf mehrere Stellen gleichzeitig bewerben
- [ ] Blacklist für bestimmte Unternehmen
- [ ] Logging der Bewerbungen in eine Datei
- [ ] E-Mail-Benachrichtigung bei erfolgreicher Bewerbung
- [ ] Wiederverwendung der Browser-Session (schnellerer Start)
- [ ] Bessere Fehlerbehandlung und Retry-Logik

---

Viel Erfolg bei der Jobsuche! 🚀
