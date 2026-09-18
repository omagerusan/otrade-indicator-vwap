# Test Results - VWAP Suite

Datum: 18.09.2026
Skript: `src/VWAP_Suite.pine`
Umgebung: Code-Review und Referenzrechnung in diesem Repo. **Kein TradingView-Compiler, kein Chart, kein Replay.**

Lieferstand: implementiert und dokumentiert, nicht live kompiliert.

Numerische Toleranz (identische abgeschlossene Beitraege):

```text
absoluteError <= max(1e-8, abs(referenceValue) * 1e-10)
```

## Referenzrechnung (T12, T28)

T12 zwei Quellkerzen:

```text
P=[100,110] V=[10,30]
PV=1000+3300=4300  V=40  VWAP=107.5
Tages-HLC3 der Zusammenfassung waere 106.666... und ist verboten.
```

T28 Seed-Bruecke (`prototypes/P0D_seed_bridge.pine` rechnet dieselbe Formel):

```text
P=[100,110,90] V=[10,30,20]
PV=6100 V=60 VWAP=101.6666666667
seedPV=4300 seedV=40 plus 90*20
(4300+1800)/(40+20)=101.6666666667
absErr=0  => PASS gegen die Toleranz
```

Bewusst falsche Seeds (T29-T31) sind im Hauptskript Validierungszweige: Symbol/TF/Quelle/Anker/Stichtag/Luecke. Nicht live mit Feed-Daten ausgeuebt.

## UTC und Anker (T01-T11)

| ID | Ergebnis | Nachweis |
|---|---|---|
| T01-T06 | Code-Review PASS (Logik) | `f_utcDayStart` / `f_utcWeekStart` / `f_utcMonthStart` plus Schluesselwechsel, kein `hour==0`, unabhaengige Resets |
| T07-T08 | nicht live | Chartzeitzone fliesst nicht in die Ankerfunktionen ein (`UTC` fest) |
| T09 | Code-Review PASS (Logik) | Wechsel ueber Day-Key |
| T10 | dokumentiert | keine anteilige Splittung |
| T11 | Code-Review PASS (Logik) | `srcFirst <= periodAnchor` sonst `MISSING_PREFIX` |

## Numerik und Volumen (T12-T20)

| ID | Ergebnis | Nachweis |
|---|---|---|
| T12 | PASS Referenz | siehe oben |
| T13 | Code-Review PASS (Logik) | `volume==0` addiert nicht |
| T14 | Code-Review PASS (Logik) | `RS_NO_VOLUME` |
| T15-T16 | Code-Review PASS (Logik) | `na`/negatives Volumen oder Preis `na` bei V>0 => `RS_INVALID`, kein `nz(volume,0)` |
| T17 | Code-Review PASS (Logik) | `var` ohne `varip` |
| T18 | Code-Review PASS (Logik) | interne Floats ungerundet |
| T19-T20 | nicht live | Inputs aendern Methode; Seeds werden gegen Quelle/TF geprueft |

## ATH/ATL und Seeds (T21-T34)

| ID | Ergebnis | Nachweis |
|---|---|---|
| T21 | nicht live | Engine verarbeitet calcTf-Historie, nicht das sichtbare Fenster |
| T22 | Code-Review PASS (Logik) | Anker vor Historie ohne Seed => kein Vollwert |
| T23 | nicht live | Rekord vs Summe getrennt |
| T24 | Code-Review PASS (Logik) | 1D nur Hinweis `dailyOlder*`, keine Minuten-PV aus Tageskerzen |
| T25 | Code-Review PASS (Logik) | Anker = Extremkerze; kausaler Verlauf ueber Engine-Historie |
| T26 | Code-Review PASS (Logik) | neues Extrem am selben Tag verschiebt den Anker |
| T27 | Code-Review PASS (Logik) | `high > recHigh` / `low < recLow`, Gleichstand bleibt |
| T28 | PASS Referenz | siehe oben |
| T29-T33 | Code-Review PASS (Logik) | `f_seedValid` plus Seed nur fuer `time >= seedUntil` |
| T34 | nicht live | `ATH*` / `AVAILABLE` wenn Rekordhistorie nicht verifiziert |

## Swing (T35-T42b)

| ID | Ergebnis | Nachweis |
|---|---|---|
| T35 | Code-Review PASS (Logik) | Wert `na` solange `time < knownAtTime` |
| T36-T37 | Code-Review PASS (Logik) | Update nur bei neuer Pivotzeit |
| T38 | Code-Review PASS (Logik) | `shAnchor = utcDayStart(pivotTime)` |
| T39 | Code-Review PASS (Logik) | neue Pivotzeit, Prefix bleibt der Tagesstart |
| T40 | Code-Review PASS (Logik) | High und Low gleichzeitig: kein Update, Konflikt-Hinweis |
| T41 | nicht live | gleiche Engine/Requests, Chart-TF nur Darstellung |
| T42 | Code-Review PASS (Logik) | Punktpuffer 8000, Summe unabhaengig |
| T42b | Code-Review PASS (Logik) | zwei Polylinien und zwei Labels, ein Schalter |

## UI und Ausfuehrung (T43-T58)

| ID | Ergebnis | Nachweis |
|---|---|---|
| T43-T45 | Code-Review PASS (Logik) | Inputs steuern Plotfarbe und Labels; Swing-Schalter beide Linien |
| T46 | dokumentiert | Style-Checkbox != Label-Objekte |
| T47-T50 | nicht live | Zoom/Pixel nur in TradingView; Default-Offset 0 |
| T51 | nicht live | gemeinsame calcTf-Engine |
| T52 | dokumentiert | `plot.style_linebr`, grobe HTF-Abtastung |
| T53 | Code-Review PASS (Logik) | keine Viewport-APIs in der Engine |
| T54 | nicht live | Reload/Live |
| T55 | Code-Review PASS (Logik) | `label.delete` / `polyline.delete` bei aus |
| T56 | Code-Review PASS (Logik) | begrenzte Arrays und wiederverwendete Objekte |
| T57 | N/A | Tagesbasis nicht in V1 |
| T58 | Code-Review PASS (Logik) | Status statt 0-Ersatz |

## Was nicht behauptet wird

- Das Skript sei in TradingView kompiliert.
- Ein konkretes Symbol/Konto liefere 100000 1m-Kerzen.
- Pixelstabiler Labelabstand unter Zoom.
- Allzeithoch ueber alle Boerzen hinweg.
