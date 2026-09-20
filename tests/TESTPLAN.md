# Testplan VWAP Suite

Abgeleitet aus docs/01 Abschnitt 20. Angepasst an V1.1: ATH/ATL-Extremkerze, zwei Swing-Linien.
Numerische Toleranz fuer identische abgeschlossene Inputdaten:

```text
absoluteError <= max(1e-8, abs(referenceValue) * 1e-10)
```

Live-Pruefung: `node tests/compile_pine.mjs` (Pine-Uebersetzer) und `node tests/live_abnahme.mjs` (Binance-Feeds). Pixel-Zoom nur in der eingeloggten Chart-UI.

## UTC und Anker (T01-T11)

- T01 Daily 23:59 -> 00:00 UTC neue Summe
- T02 Weekly Sonntag -> Montag 00:00 UTC
- T03 Monthly letzter -> erster 00:00 UTC
- T04 01.06.2026 Montag: Daily, Weekly, Monthly gleichzeitig unabhaengig
- T05 Jahreswechsel: Wochenanker echter Montag
- T06 Februar Schaltjahr
- T07 Chartzonen UTC / Wien / New York: gleiche Anker
- T08 DST der Anzeige verschiebt UTC-Anker nicht
- T09 fehlende Mitternachtskerze: Schluesselwechsel beim naechsten Sample
- T10 Quellkerze ueber UTC-Grenze: nicht aufteilen
- T11 Historienstart mitten im Monat: Monthly unvollstaendig

## Numerik und Volumen (T12-T20)

- T12 Zwei-Kerzen-Beispiel: 107.5 nicht 106.666...
- T13 Nullvolumen: Wert unveraendert
- T14 Intervall ohne positives Volumen: na
- T15 na-Volumen nach Anker: keine Heilung
- T16 Preis na bei positivem Volumen: Fehlerstatus
- T17 Live-Updates derselben Quellkerze: Volumen nicht mehrfach
- T18 grosse/kleine Zahlen: keine Tick-Rundung intern
- T19 Preisquelle wechseln aendert Werte, Seeds neu pruefen
- T20 Berechnungsbasis wechseln ist Methodenwechsel

## ATH/ATL und Seeds (T21-T34)

- T21 ATH ausserhalb Chart-, innerhalb Quellhistorie: Extremkerzen-Anker
- T22 ATH vor Quellhistorie ohne Seed: kein Vollwert
- T23 alter ATL nahe Symbolbeginn: Rekord vs Volumen getrennt
- T24 1D kennt Anker, Minuten fehlen: keine Minutenpraezision
- T25 neuer Rekord nachmittags: Anker = Extremkerze, nicht 00:00; Historie vor Erkennung unveraendert
- T26 mehrere Rekorde am selben Tag: Anker wandert zur neuen Extremkerze
- T27 gleicher Rekordpreis spaeterer Tag: kein Neuanker
- T28 Seed vs volle Referenz nach Stichtag gleich
- T29 Seed mit Doppelzaehlung der Stichtagskerze: Fehler
- T30 Seed-Stichtag vor Quellbeginn: Luecke
- T31 Seed passt nicht zu Symbol/Quelle/TF/Anker: ignorieren
- T32 Replay vor Stichtag: Seed nicht verwenden
- T33 neuer Ankertag: alten Seed verwerfen
- T34 mehr Rekordhistorie: Status aendert sich nachvollziehbar

## Swing (T35-T42), zwei Linien

- T35 unbestaetigter Pivot: keine neue Linie (High und Low getrennt)
- T36 Abschluss rechter Pivotkerze: genau ein Ereignis je Seite
- T37 gleiches HTF-Ereignis auf vielen Minutenbars: kein Reset
- T38 Pivot vor Mitternacht, Bestaetigung danach: Anker = time der 15m-Pivotkerze
- T39 neuer extremerer Pivot derselben Seite: Lock wechselt; Lookback allein nicht
- T40 gleichzeitiger High/Low derselben Pivotzeit: beide unabhaengig
- T41 verschiedene Chart-TFs (15m/1H/4H): gleiche 15m-Anker
- T42 Swing aelter als 15m-Pfadfenster: MISSING_PREFIX bzw. gekuerzter Pfad
- T42b beide Linien parallel sichtbar nach je einem High- und Low-Pivot

## UI und Ausfuehrung (T43-T58)

- T43 Input-Schalter: Linie und Label gemeinsam; Swing-Schalter beide Linien
- T44 Label-Schalter regulaer vs Swing unabhaengig
- T45 Farbe/Transparenz Linie = Label
- T46 Style-Checkbox steuert nur Plot
- T47 Label mit/ohne Datum, Textbeginn am Anker
- T48 horizontaler Zoom (nur in TradingView)
- T49 vertikaler Zoom / log (nur in TradingView)
- T50 kleine Chartbreite aendert Rechnung nicht
- T51 1m/5m/15m/1H/4H gemeinsame Quellabschluesse
- T52 Daily auf 1D/1W: kein vorgetaeuschter Intraday-Pfad
- T53 Viewport aendert Anker nicht
- T54 Reload: Live vs Close analysieren
- T55 alle Linien aus: keine verwaisten Labels
- T56 viele Swingwechsel: Objektzahl begrenzt
- T57 Tagesbasis-Option: in V1 nicht aktiv, Test N/A
- T58 abgeschnittener Request: Status statt Nullpreis
