# Ordnerstruktur - VWAP Indicator

## Empfohlene Projektstruktur

```text
VWAP_Indicator_Project/
│
├─ README.md
│
├─ prompts/
│  └─ START_PROMPT.md
│
├─ docs/
│  ├─ 01_VWAP_Umsetzungsplan.md
│  ├─ 02_TECHNISCHE_DOKUMENTATION.md
│  ├─ 03_ORDNERSTRUKTUR.md
│  ├─ IMPLEMENTATION_NOTES.md
│  └─ OPEN_DECISIONS.md
│
├─ src/
│  └─ VWAP_Suite.pine
│
└─ tests/
   ├─ TESTPLAN.md
   └─ TEST_RESULTS.md
```

## Zweck der Dateien

### `README.md`

Kurzer Einstieg in das Projekt. Enthält Ziel, Dokumentreihenfolge, Startpunkt und aktuellen Entwicklungsstatus.

### `prompts/START_PROMPT.md`

Prompt für die ausführende Code-KI. Dieser Prompt soll zusammen mit dem Projektordner übergeben werden.

### `docs/01_VWAP_Umsetzungsplan.md`

Fachliche Hauptspezifikation. Enthält Anforderungen, Annahmen, Datenlogik, UI-Vorgaben, historische Genauigkeit und Erweiterungsideen.

### `docs/02_TECHNISCHE_DOKUMENTATION.md`

Technische Architektur und Implementierungsregeln für Pine Script.

### `docs/03_ORDNERSTRUKTUR.md`

Diese Datei. Beschreibt die Rolle aller Projektdateien.

### `docs/IMPLEMENTATION_NOTES.md`

Wird von der ausführenden KI während der Implementierung gepflegt. Enthält:

- tatsächlich verwendete Pine-Techniken
- technische Abweichungen von ursprünglichen Ideen
- bekannte TradingView-Limits
- Performance-Entscheidungen
- Besonderheiten bei Requests und Historie
- Version des zuletzt getesteten Codes

### `docs/OPEN_DECISIONS.md`

Nur offene fachliche Entscheidungen. Keine allgemeinen TODOs. Sobald eine Entscheidung getroffen wurde, dokumentiert die KI die gewählte Lösung und markiert sie als entschieden.

### `src/VWAP_Suite.pine`

Einzige produktive Hauptdatei des Indikators.

Keine Dateien wie:

```text
VWAP_final.pine
VWAP_final2.pine
VWAP_new.pine
VWAP_working.pine
```

Versionshistorie gehört in Git, nicht in Dateinamen.

### `tests/TESTPLAN.md`

Verbindliche Prüfliste vor Abschluss.

### `tests/TEST_RESULTS.md`

Dokumentierte Ergebnisse der tatsächlichen Tests. Pro Test mindestens:

```text
Test-ID
Datum
Symbol
Chart-Timeframe
Erwartung
Ergebnis
Status PASS / FAIL / BLOCKED
Bemerkung
```

## Optional bei später wachsendem Projekt

Falls später zusätzliche Tools, Screenshots oder Referenzdaten dazukommen:

```text
references/
├─ screenshots/
└─ notes/
```

Für V1 ist dieser Ordner nicht nötig.
