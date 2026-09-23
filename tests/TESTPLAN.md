# Testplan VWAP Suite

Abgeleitet aus docs/01 Abschnitt 20. Angepasst an V1.1: ATH/ATL-Extremkerze. Swing-VWAP ist seit 23.09.2026 nicht mehr Teil von `src/VWAP_Suite.pine`.
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

## ATH/ATL (T21-T27)

- T21 Daily-Rekord innerhalb der 60-Minuten-Historie: Anker = Daily-Rekordkerze, nicht der erste calcTf-Bar
- T22 BTC-Allzeithoch Oktober 2025 darf nicht als Beginn der 1-Minuten-Historie (zum Beispiel 16.07.2026) erscheinen
- T23 Daily-Anker vor der 60-Minuten-Historie: Wert `na`, Hinweis mit Daily-Datum
- T24 1D liefert den Ankerzeitpunkt; die Summe bleibt auf 60 Minuten und wird nicht aus Tagesvolumen gebaut
- T25 neues Daily-High: Summe startet an der neuen Rekordkerze neu, aeltere Summe laeuft nicht weiter
- T26 mehrere Rekorde: Anker folgt dem jeweils neuen Daily-Extrem
- T27 gleicher Rekordpreis spaeterer Tag: kein Neuanker

## Seeds und Rekordpruefung (T28-T34)

Entfernt. Kein Seed und kein `recordVerified` mehr in `src/VWAP_Suite.pine`.

## Swing (T35-T42b)

Entfernt. Nicht mehr gegen `src/VWAP_Suite.pine` pruefen. Historische Spec: `docs/04_SWING_VWAP.md`.

## Speicher (RE10139)

- Lange 1m-Historie (BTC): Indikator laeuft ohne Runtime "Memory limits exceeded"
- Keine Swing-Linien und keine Punktarrays aus `request.security`

## UI und Ausfuehrung (T43-T58)

- T43 Input-Schalter: Linie und Label gemeinsam
- T44 Label-Schalter der fuenf regulaeren VWAPs
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
- T56 Objektzahl bleibt bei fuenf Labels und einer Hinweistabelle
- T57 Tagesbasis-Option: in V1 nicht aktiv, Test N/A
- T58 abgeschnittener Request: Status statt Nullpreis
