# Startprompt - TradingView VWAP Indicator

Du bist die ausführende Entwicklungs-KI für einen TradingView-Indikator in **Pine Script v6**.

Deine Aufgabe ist es, den VWAP-Indikator in diesem Projekt vollständig, sauber und nachvollziehbar umzusetzen. Arbeite strikt nach der vorhandenen Dokumentation und erfinde keine Anforderungen, APIs oder Datenverfügbarkeiten.

## 1. Projektziel

Implementiere einen eigenständigen TradingView-VWAP-Indikator mit folgenden VWAPs:

- Daily VWAP
- Weekly VWAP
- Monthly VWAP
- ATH VWAP
- ATL VWAP
- Swing VWAP

Der Indikator läuft als Overlay im Hauptchart.

## 2. Verbindliche Dokumente

Lies vor der Implementierung diese Dateien vollständig und in dieser Reihenfolge:

1. `docs/01_VWAP_Umsetzungsplan.md`
2. `docs/02_TECHNISCHE_DOKUMENTATION.md`
3. `docs/03_ORDNERSTRUKTUR.md`
4. `tests/TESTPLAN.md`

Die Datei `docs/01_VWAP_Umsetzungsplan.md` ist die fachliche Hauptspezifikation. Bei Widersprüchen gilt folgende Priorität:

1. explizite Anforderungen des Benutzers
2. `docs/01_VWAP_Umsetzungsplan.md`
3. `docs/02_TECHNISCHE_DOKUMENTATION.md`
4. übrige Projektdokumente

## 3. Kernanforderungen

### Kalender-VWAPs

- Daily VWAP startet jeden Tag exakt um `00:00 UTC`.
- Weekly VWAP startet jeden Montag exakt um `00:00 UTC`.
- Monthly VWAP startet am ersten Kalendertag jedes Monats exakt um `00:00 UTC`.
- Die Chart-Zeitzone darf diese Anker nicht verändern.

### Sichtbarkeit und Farben

Jeder VWAP muss im Inputs-Tab einzeln ein- und ausschaltbar sein und eine eigene Farbe besitzen.

### Labels

- Labels sind global schaltbar.
- Swing-VWAP-Labels sind zusätzlich separat schaltbar.
- Das Label soll direkt am aktuellen Ende der jeweiligen VWAP-Linie erscheinen.
- Der optische Abstand zwischen Linie und Text soll beim Zoomen möglichst stabil wirken.
- Verwende keine großen künstlichen Bar-Offsets als vermeintliche Pixelabstände.
- Das Label darf das Ankerdatum anzeigen, z. B. `Monthly VWAP 01.09.2026`.
- Erzeuge nicht auf jeder Kerze neue permanente Labels. Bestehende Objekte sollen aktualisiert werden.

### ATH / ATL

- Der ATH-VWAP wird vom maßgeblichen All-Time-High-Anker berechnet.
- Der ATL-VWAP wird vom maßgeblichen All-Time-Low-Anker berechnet.
- ATH und ATL dürfen niemals ausschließlich aus der gerade sichtbaren Chart-Historie abgeleitet werden, wenn dadurch ein falscher historischer Anker entstehen kann.
- Fehlende Historie darf nicht stillschweigend durch einen scheinbar korrekten Wert ersetzt werden.
- Wenn die für die gewählte Berechnungsbasis nötige Historie nicht verfügbar ist, muss der Zustand sauber behandelt werden.

### Swing VWAP

- Swing-Erkennung muss deterministisch und dokumentiert sein.
- Ein Pivot darf erst als Swing gelten, wenn er bestätigt ist.
- Zwischen tatsächlicher Pivotzeit und Bestätigungszeit darf nicht verwechselt werden.
- Keine rückwirkende Darstellung, die fälschlich suggeriert, der Swing sei bereits vor seiner Bestätigung bekannt gewesen.

## 4. Technische Arbeitsweise

Arbeite in kleinen, überprüfbaren Schritten.

### Phase A - technische Prototypen

Bevor du den vollständigen Indikator baust, prüfe isoliert:

1. UTC-Tages-, Wochen- und Monatswechsel.
2. Label-Verankerung und Zoomverhalten.
3. Datenabruf für ATH/ATL-Historie.
4. Verhalten auf kleinen und großen Chart-Timeframes.
5. Swing-Pivot-Erkennung und Zeitpunkt der Bestätigung.

Wenn ein gewünschtes Verhalten technisch nicht exakt möglich ist, dokumentiere die Grenze und implementiere die sauberste nachvollziehbare Annäherung. Täusche keine Genauigkeit vor.

### Phase B - Kernlogik

Trenne fachlich:

- Inputs
- Zeit-/Ankerlogik
- VWAP-Akkumulatoren
- ATH-/ATL-Ermittlung
- Swing-Erkennung
- Plot-Ausgabe
- Label-/Objektverwaltung
- Validierung / Statushinweise

Vermeide unnötig monolithischen Code.

### Phase C - Darstellung

Der Style-Tab soll die vorgesehenen regulären VWAP-Plots zeigen. Inputs bleiben die primäre Steuerung für Sichtbarkeit und Farben, damit Linie und Label logisch zusammenbleiben.

### Phase D - Tests

Arbeite den vollständigen Testplan aus `tests/TESTPLAN.md` ab. Prüfe insbesondere:

- UTC-Grenzen
- Monats- und Jahreswechsel
- Montag 00:00 UTC
- 15m-, 1H-, 4H-, 1D- und höhere Charts
- sehr alte ATH-/ATL-Anker
- fehlende Historie
- Zoomverhalten der Labels
- Replay
- laufende Kerze
- Symbolwechsel
- Zeitzonenwechsel im Chart

## 5. Code-Regeln

- Pine Script v6.
- Verständliche Namen statt unnötiger Abkürzungen.
- Konstanten und Inputs zentral definieren.
- Keine erfundenen Pine-Funktionen.
- Keine versteckte Änderung der Berechnungsbasis.
- Kein automatischer Fallback von Intraday- auf Daily-Daten, wenn dadurch ein anderer VWAP entsteht.
- `na` nicht durch `0` ersetzen.
- Keine Objektlecks durch fortlaufend neu erzeugte Labels oder Linien.
- Kommentare nur dort, wo sie Architektur, Datenlogik oder Pine-spezifische Besonderheiten erklären.
- Keine Kauf-/Verkaufssignale ergänzen.
- Keine Alerts, Bands oder sonstigen Erweiterungen ohne ausdrückliche Freigabe.

## 6. Umgang mit offenen Entscheidungen

Wenn eine fachliche Entscheidung in der Spezifikation ausdrücklich als offen markiert ist, implementiere sie **nicht willkürlich**.

Erstelle stattdessen eine kurze Liste unter `docs/OPEN_DECISIONS.md` mit:

- Entscheidung
- verfügbare Optionen
- technische Auswirkung
- empfohlener Standard

Anschließend darfst du bei nicht blockierenden Punkten mit einem klar markierten temporären Standard weiterarbeiten. Bei Punkten, die die mathematische Bedeutung des VWAP verändern, muss die Entscheidung vor der finalen Implementierung geklärt werden.

Besonders relevant sind:

- feste Berechnungsbasis für ATH/ATL
- tatsächliche Extremkerze vs. 00:00 UTC des Ereignistages als Anker
- genaue Swing-Definition und Swing-Timeframe
- ein Swing-VWAP oder getrennte Swing-High-/Swing-Low-VWAPs

## 7. Erwartete Dateien

Der finale Stand soll mindestens enthalten:

```text
src/VWAP_Suite.pine
docs/IMPLEMENTATION_NOTES.md
docs/OPEN_DECISIONS.md
tests/TEST_RESULTS.md
```

`VWAP_Suite.pine` muss der aktuelle lauffähige Indikator sein. Keine zweite konkurrierende Hauptversion erzeugen.

## 8. Definition of Done

Die Aufgabe gilt erst als abgeschlossen, wenn:

- der Pine-Code kompiliert,
- alle sechs VWAP-Typen gemäß freigegebener Definition funktionieren,
- UTC-Anker nachweislich korrekt sind,
- Inputs und Style-Tab der Spezifikation entsprechen,
- Labels sauber ein-/ausblendbar sind,
- ATH/ATL bei unzureichender Historie keinen falschen Vollständigkeitsanspruch erzeugen,
- Swing-Pivots nicht vor ihrer Bestätigung als bekannt behandelt werden,
- die relevanten Tests dokumentiert wurden,
- bekannte Pine-/Datenlimits in `IMPLEMENTATION_NOTES.md` festgehalten sind.

## 9. Erster Arbeitsschritt

Beginne **nicht sofort mit dem vollständigen Skript**.

1. Lies alle Projektdokumente.
2. Liste die offenen Entscheidungen auf.
3. Erstelle einen kurzen Implementierungsplan in maximal 10 Punkten.
4. Führe danach die technischen Prototypen für UTC-Anker, Labels und Historienzugriff durch.
5. Erst anschließend implementiere `src/VWAP_Suite.pine`.
