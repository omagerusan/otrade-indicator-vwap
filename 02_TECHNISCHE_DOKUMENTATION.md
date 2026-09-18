# Technische Dokumentation - VWAP Suite

## 1. Zweck

Dieses Dokument ergänzt die ausführliche Produktspezifikation in `01_VWAP_Umsetzungsplan.md`. Es beschreibt die empfohlene Code-Architektur, Verantwortlichkeiten der einzelnen Logikblöcke und Regeln für Wartbarkeit und Tests.

Zielplattform: **TradingView / Pine Script v6**.

---

## 2. Architekturprinzipien

Der Indikator soll logisch in sieben Bereiche gegliedert sein:

```text
1. Metadaten und Konstanten
2. Inputs
3. Zeit- und Ankerlogik
4. VWAP-Berechnung
5. ATH/ATL- und Swing-Ermittlung
6. Plot- und Objektverwaltung
7. Status / Validierung
```

Auch wenn Pine Script am Ende in einer Datei liegt, soll der Quelltext diese Schichten klar erkennbar trennen.

---

## 3. Input-Modell

### 3.1 Gruppe `VWAP`

Vorgesehene Hauptinputs:

- Daily VWAP: sichtbar + Farbe
- Weekly VWAP: sichtbar + Farbe
- Monthly VWAP: sichtbar + Farbe
- ATH VWAP: sichtbar + Farbe
- ATL VWAP: sichtbar + Farbe
- Swing VWAP: sichtbar + Farbe
- Swing VWAP Width
- Label VWAPS
- Label Swing VWAP

Checkbox und Farbauswahl sollen möglichst in derselben Input-Zeile stehen. Dazu `group` und `inline` verwenden.

### 3.2 Darstellung

Sinnvolle zusätzliche Darstellungsinputs, soweit bereits durch die Hauptspezifikation erlaubt:

- Label-Größe
- Ankerdatum im Label anzeigen
- Datumsformat
- optionaler kleiner Label-Bar-Offset

Ein Bar-Offset ist keine Pixelgarantie und soll standardmäßig `0` bleiben.

---

## 4. UTC-Kalenderlogik

Die Kalender-VWAPs sind **UTC-basiert**, unabhängig von Börsen- oder Chartzeitzone.

### Daily

Neuer Anker, wenn ein neuer UTC-Kalendertag beginnt.

### Weekly

Neuer Anker ausschließlich montags um 00:00 UTC.

### Monthly

Neuer Anker am ersten Tag eines neuen UTC-Kalendermonats um 00:00 UTC.

### Anforderungen

- Sommer-/Winterzeit darf die Anker nicht verschieben.
- Chart-Zeitzonenwechsel dürfen die berechneten UTC-Anker nicht verändern.
- Monatswechsel Dezember -> Januar separat testen.
- Wochenwechsel über Jahresgrenzen testen.

---

## 5. Generische VWAP-Akkumulation

Ein anchored VWAP benötigt konzeptionell zwei laufende Summen:

```text
sumPV  = Summe(source * volume)
sumVol = Summe(volume)
vwap   = sumPV / sumVol
```

Beim Ankerwechsel werden beide Summen zurückgesetzt und mit der ersten eingeschlossenen Quellkerze neu aufgebaut.

### Preisquelle

Die fachliche Hauptspezifikation legt die Preisquelle fest. Eine spätere Änderung der Quelle muss explizit erfolgen; sie darf nicht stillschweigend pro VWAP unterschiedlich sein.

### Volumen

Bei fehlendem oder nicht sinnvoll verfügbarem Volumen muss der Indikator einen definierten Zustand verwenden. Keinen künstlichen Ersatzwert erzeugen.

---

## 6. Berechnungs-Timeframe vs. Chart-Timeframe

Dies ist einer der wichtigsten Architekturpunkte.

Der Chart-Timeframe bestimmt nur die Darstellung. Die mathematische VWAP-Basis darf nicht versehentlich mit dem Chart-Timeframe wechseln, wenn dadurch auf 5m, 15m, 1H und 1D unterschiedliche Definitionen desselben VWAP entstehen.

Für jede VWAP-Kategorie muss deshalb eindeutig dokumentiert sein:

```text
Anchor source
Calculation timeframe
Price source
Volume source
History requirement
```

Ein Wechsel auf einen gröberen Timeframe als Fallback ist nur zulässig, wenn der Benutzer dies ausdrücklich als eigene Berechnungsmethode gewählt hat.

---

## 7. ATH- und ATL-Architektur

ATH und ATL bestehen technisch aus zwei getrennten Problemen:

### A. Extrempunkt bestimmen

Gesucht wird das relevante historische All-Time-High bzw. All-Time-Low des Symbols innerhalb der verfügbaren und fachlich definierten Datenhistorie.

### B. VWAP ab diesem Anker berechnen

Ab dem definierten Anker müssen alle Preis-Volumen-Beiträge der festgelegten Berechnungsbasis berücksichtigt werden.

Diese beiden Aufgaben dürfen nicht vermischt werden.

### Datenvollständigkeit

Wenn zwar das Datum des ATH bekannt ist, aber die Intraday-Daten für die gewünschte VWAP-Basis ab diesem Zeitpunkt nicht verfügbar sind, darf der resultierende Wert nicht als vollständig korrekter Intraday-VWAP dargestellt werden.

Vorgesehene Zustände:

```text
COMPLETE
INCOMPLETE_HISTORY
NO_DATA
NOT_INITIALIZED
```

Die konkrete technische Umsetzung kann ohne Enum erfolgen, die Logik soll aber äquivalent erkennbar sein.

---

## 8. Swing-VWAP-Architektur

Die Swing-Erkennung muss unabhängig vom eigentlichen VWAP-Akkumulator entwickelt werden.

Empfohlene Pipeline:

```text
OHLC-Daten
  -> Swing-/Pivot-Erkennung
  -> bestätigter Pivot
  -> fachlicher Ankerzeitpunkt
  -> neuer Swing-VWAP-Anker
  -> VWAP-Akkumulation
```

Wichtig: Ein Pivot wird erst nach den benötigten rechten Bars bestätigt. Der Indikator muss intern unterscheiden zwischen:

- Zeit der Pivotkerze
- Zeitpunkt, an dem der Pivot bestätigt wurde
- tatsächlichem VWAP-Anker laut Produktdefinition

Diese Werte können verschieden sein.

---

## 9. Plot-Architektur

Reguläre VWAPs sollen möglichst über `plot()` ausgegeben werden, damit sie im TradingView Style-Tab sauber erscheinen.

Vorgesehene Style-Einträge:

```text
Daily VWAP
Weekly VWAP
Monthly VWAP
ATH VWAP
ATL VWAP
```

Für Swing darf abhängig von der finalen Darstellungslogik ein Plot oder eine verwaltete Linie verwendet werden. Die UI-Vorgabe aus der Hauptspezifikation hat Vorrang.

### Sichtbarkeit

Berechnungen sollen nicht nur deshalb unterbrochen werden, weil eine Linie ausgeblendet ist. Darstellung und Berechnung sauber trennen.

---

## 10. Label-Architektur

Für jeden sichtbaren VWAP existiert maximal ein aktuelles rechtes Label.

### Lebenszyklus

```text
wenn Label noch nicht existiert:
    erzeugen
sonst:
    Position, Text und Farbe aktualisieren

wenn VWAP oder Labels deaktiviert:
    vorhandenes Label löschen oder verbergen
```

Keine neue permanente Labelinstanz pro Bar erzeugen.

### Position

- y = aktueller VWAP-Wert
- x = aktueller rechter Chart-/Bar-Anker
- transparentes Label
- Textfarbe = VWAP-Farbe
- Labeltext rechts des Ankers

Der Standard soll keinen großen horizontalen Bar-Abstand verwenden.

### Textformat

Beispiele:

```text
Daily VWAP 18.09.2026
Weekly VWAP 14.09.2026
Monthly VWAP 01.09.2026
ATH VWAP 12.08.2026
ATL VWAP 21.11.2022
Swing VWAP 17.09.2026
```

Das Datum beschreibt den **fachlichen Anker**, nicht automatisch die erste auf dem Bildschirm sichtbare Kerze.

---

## 11. Realtime und Repainting

Ein laufender VWAP verändert sich naturgemäß mit neuen Preis-/Volumendaten. Das ist normales Realtime-Verhalten.

Separat davon ist zu prüfen:

- ob Swing-Pivots erst nach Bestätigung verwendet werden,
- ob historische Requests nach Reload andere Werte liefern,
- ob Lower-Timeframe-Daten historisch vollständig verfügbar sind,
- ob ein Wert nur scheinbar historisch rekonstruiert wurde.

Der Indikator darf nicht pauschal als `non-repainting` bezeichnet werden, solange diese Fälle nicht exakt abgegrenzt wurden.

---

## 12. Fehler- und Grenzfallbehandlung

### Kein Volumen

Keinen VWAP durch Division durch 0 erzeugen.

### Fehlende Historie

ATH/ATL nicht durch einen auf der geladenen Teilhistorie gefundenen falschen Anker ersetzen.

### `na`

`na` bleibt ein fehlender Wert. Nicht auf 0 setzen.

### Symbolwechsel

Alle persistenten Akkumulatoren und Anker müssen mit der neuen Symbolhistorie korrekt neu berechnet werden.

### Replay

Labels müssen sich auf den jeweiligen Replay-Endpunkt beziehen und dürfen nicht auf zukünftige Daten zugreifen.

---

## 13. Performance

- Anzahl der `request.*`-Aufrufe gering halten.
- Historische Berechnungen nicht mehrfach redundant durchführen.
- Labels/Lines aktualisieren statt fortlaufend neu erzeugen.
- Keine Schleifen über unnötig große Historienbereiche, wenn Pine-Zeitreihenlogik oder Requests die Aufgabe sauberer lösen.
- Optimierungen erst nach korrekter Referenzimplementierung durchführen.

---

## 14. Entwicklungsreihenfolge

Empfohlene Reihenfolge:

1. Inputs und leere Plot-Struktur
2. UTC Daily VWAP
3. UTC Weekly VWAP
4. UTC Monthly VWAP
5. Label-Prototyp
6. ATH-Ankerermittlung
7. ATH-VWAP mit Historienstatus
8. ATL analog
9. Swing-Erkennung
10. Swing-VWAP
11. Style-/UI-Abgleich
12. vollständiger Testplan
13. Dokumentation bekannter Grenzen

---

## 15. Wartungsregeln

Jede spätere Erweiterung muss beantworten:

1. Ändert sie die mathematische VWAP-Definition?
2. Ändert sie die benötigte Historie?
3. Kann sie repainten oder nach Reload anders aussehen?
4. Erzeugt sie zusätzliche TradingView-Objekte?
5. Benötigt sie einen neuen Input?
6. Muss der Testplan erweitert werden?

Erst danach implementieren.
