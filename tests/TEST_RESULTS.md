# Test Results - VWAP Suite

Datum: 19.09.2026
Skript: `src/VWAP_Suite.pine`
Compiler: TradingView `pine-facade/translate_light` (Gast), siehe `tests/compile_report.json`.
Live-Feed: Binance Spot `BTCUSDT` / `ETHUSDT` und USDT-M Perp `BTCUSDT`, Engine-Spiegel in `tests/live_abnahme.mjs`, Rohprotokoll `tests/live_abnahme.json`.

Chart-UI (Add to chart, Pixel-Zoom): Gast-Login blockiert. Pixeltests T48/T49 bleiben SKIP.

Numerische Toleranz (identische abgeschlossene Beitraege):

```text
absoluteError <= max(1e-8, abs(referenceValue) * 1e-10)
```

## Compiler (tv-compile)

| Pruefung | Ergebnis | Nachweis |
|---|---|---|
| Pine v6 translate_light | PASS, 0 Fehler, 0 Warnungen | `tests/compile_report.json`, HTTP 200, `success: true` (erneut 19.09.2026 nach Snap-na-Fix) |
| Nested `request.security` | Compiler akzeptiert den Aufruf | `dynamic_requests = true` in `indicator()` |
| Bar 0: Snap-Objekt `na` | PASS Code | Feldzugriff nur in `if not na(snap)`; Plots/`na`, kein 0-Ersatz |
| Add to chart im Browser | blockiert (Gast) | TradingView-Dialog "Sign in"; Chart-Lauf nach Fix durch Benutzer

## Abnahmeset Abschnitt 18.1

| Objekt | Ergebnis | Nachweis |
|---|---|---|
| Spot BTCUSDT 1m | PASS | 10080 Bars, 12.09.2026 18:35 UTC bis 19.09.2026 18:34 UTC; Daily 81399.16, Weekly 77826.72 |
| Spot ETHUSDT 1m | PASS | 14400 Bars; Daily 2634.83, Weekly 2494.14, getrennt von BTC |
| Perp BTCUSDT.P 1m | PASS | 14400 Bars; Weekly 77652.48, eigener Datensatz |
| Chart-TFs 1m..1D | PASS als Darstellung | Produktpfad bleibt calcTf=1m. HTF-Kerzen-HLC3 als Quelle waere eine andere Methode (T51). |
| Labels | PASS Textformel | `Weekly VWAP 14.09.2026`; Pixelabstand nicht in der UI gemessen |
| Monthly im 7d-Fenster | PASS unvollstaendig | srcFirst 12.09. nach Anker 01.09. UTC, reason `MISSING_PREFIX`, Wert `na` |

## UTC und Anker (T01-T11)

| ID | Ergebnis | Nachweis |
|---|---|---|
| T01 | PASS live | Daily-Reset 13.09.2026 00:00 UTC, neuer Daily 77271.19 |
| T02 | PASS live | Weekly-Anker Montag 14.09.2026 00:00 UTC |
| T03 | PASS live | Monthly-Anker 01.09.2026 00:00 UTC (kein Monatswechsel im 7d-Fenster) |
| T04 | PASS Kalender | 01.06.2026 ist Montag UTC; Daily/Weekly/Monthly teilen denselben 00:00-Anker |
| T05 | PASS Kalender | Wochenanker um den Jahreswechsel 2026/27: Montag 28.12.2026 00:00 UTC |
| T06 | PASS Kalender | 29.02.2024 existiert; Monatsanker bleibt 01.02. 00:00 UTC |
| T07 | PASS live | Anker nur aus UTC-Barzeit, unabhaengig von einer Chartzone |
| T08 | PASS live | keine DST-Verschiebung der UTC-Funktionen |
| T09 | PASS live | Reset per Day-Key nach Entfernen der 00:00-Kerzen |
| T10 | dokumentiert | keine anteilige Splittung; HTF-Quelle divergiert bewusst (T51) |
| T11 | PASS live | Monthly `MISSING_PREFIX` weil 1m-Start nach dem Monatsanker liegt |

## Numerik und Volumen (T12-T20)

| ID | Ergebnis | Nachweis |
|---|---|---|
| T12 | PASS Referenz | VWAP=107.5 |
| T13 | PASS | Nullvolumen aendert Daily nicht |
| T14 | PASS | kein positives Volumen => `na` / `RS_NO_VOLUME` |
| T15-T16 | Code-Review PASS | `na`/negatives Volumen oder Preis `na` bei V>0 => `RS_INVALID` |
| T17 | PASS live | ein Durchlauf der offenen letzten 1m-Kerze, keine doppelte Historie |
| T18 | Code-Review PASS | interne Floats ungerundet |
| T19-T20 | Code-Review PASS | Inputs aendern Methode; Seeds gegen Quelle/TF |

## ATH/ATL und Seeds (T21-T34)

| ID | Ergebnis | Nachweis |
|---|---|---|
| T21 | PASS live | 1m-ATH-Anker 19.09.2026 15:42 UTC, Wert 81703.88 im 1m-Fenster |
| T22 | PASS live | 1D-aelterer Rekord => kein Vollwert (`MISSING_PREFIX`) |
| T23 | PASS live | 1D-ATH 06.10.2025 px=126199.63, aelter als 1m-Start 12.09.2026; Rekord vs. Summe getrennt |
| T24 | Code-Review PASS | 1D nur Hinweis `dailyOlder*`, keine Minuten-PV aus Tageskerzen |
| T25 | PASS live | Anker = Extremkerze 19.09.2026 15:42 UTC, nicht Mitternacht |
| T26 | PASS live | Anker wanderte intra-day bei neuem High |
| T27 | PASS Code+Engine | Gleichstand verankert nicht neu (`high > recHigh`) |
| T28 | PASS Referenz | 101.6666666667 |
| T29-T33 | Code-Review PASS | `f_seedValid` plus Seed nur fuer `time >= seedUntil` |
| T34 | PASS live | ohne Verifikation reason `RS_AVAILABLE` (6) im 1m-Fenster; bei 1D-aelterem Anker kein Vollwert |

## Swing (T35-T42b)

| ID | Ergebnis | Nachweis |
|---|---|---|
| T35 | PASS live | High knownAt nach Pivot (Pivot 19.09. 15:00 UTC, knownAt 18:34 UTC im 3/3-Fenster) |
| T36-T37 | Code-Review PASS | Update nur bei neuer Pivotzeit |
| T38 | PASS live | Anker = 19.09.2026 00:00 UTC |
| T39 | Code-Review PASS | neue Pivotzeit, Prefix bleibt Tagesstart |
| T40 | Code-Review PASS | High und Low gleichzeitig: kein Update, Konflikt-Hinweis |
| T41 | PASS live | dieselben 1H-Pivots aus 1m-Aggregation |
| T42 | Code-Review PASS | Punktpuffer 8000, Summe unabhaengig |
| T42b | PASS live | High 15:00 UTC und Low 13:00 UTC parallel |

## UI und Ausfuehrung (T43-T58)

| ID | Ergebnis | Nachweis |
|---|---|---|
| T43-T45 | Code-Review PASS | Inputs steuern Plotfarbe und Labels; Swing-Schalter beide Linien |
| T46 | dokumentiert | Style-Checkbox != Label-Objekte |
| T47 | PASS Text | Label = Typ + UTC-Datum |
| T48 | SKIP | horizontaler Zoom nur in TradingView-UI (Login) |
| T49 | SKIP | vertikaler Zoom / log nur in TradingView-UI (Login) |
| T50 | PASS | Rechnung unabhaengig von Chartbreite |
| T51 | PASS live | gleiche 1m-Daily-Werte an 5m/15m/1H/4H-Abschluesen; HTF-HLC3 weicht ab |
| T52 | dokumentiert | `plot.style_linebr`, grobe HTF-Abtastung |
| T53 | Code-Review PASS | keine Viewport-APIs in der Engine |
| T54 | PASS live | letzte 1m-Kerze als Live-Sample; Replay-Schnitt 18.09. Daily 79089.76 |
| T54b | PASS Code | `request.security` darf auf Bar 0 `na` liefern; Chart liest keine UDT-Felder ohne Objektpruefung |
| T55 | Code-Review PASS | `label.delete` / `polyline.delete` bei aus |
| T56 | Code-Review PASS | begrenzte Arrays und wiederverwendete Objekte |
| T57 | N/A | Tagesbasis nicht in V1 |
| T58 | PASS live | Monthly `na` statt 0 bei fehlendem Prefix |

## Wiederholung

```text
node tests/compile_pine.mjs
node tests/live_abnahme.mjs
```

## Was nicht behauptet wird

- Add to chart ohne TradingView-Konto.
- Pixelstabiler Labelabstand unter Zoom (T48/T49 SKIP).
- 100000 1m-Kerzen auf jedem Konto; der Live-Lauf nutzte 7-10 Tage Binance-1m.
- Allzeithoch ueber alle Boerzen hinweg. 1D-ATH des Spot-Feeds lag vor dem 1m-Fenster.
