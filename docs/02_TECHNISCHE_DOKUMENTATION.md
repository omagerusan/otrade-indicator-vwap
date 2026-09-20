# Technische Dokumentation - VWAP Suite

Pine Script v6 Overlay. Ein lauffaehiges Hauptskript: `src/VWAP_Suite.pine`.
Zeitzone fuer Anker und Datumstexte: `UTC` (UTC+0). Chart-Zeitzone ist nur Anzeige.

## Datenkontexte

- Chart-Timeframe: Darstellung.
- Berechnungs-Timeframe `calcTf`: 1 / 5 / 15 / 60 Minuten, Default 1 Minute.
- Swing-Timeframe: fest `"15"` (unabhaengig von Chart und `calcTf`). Lookback Default 50 (10-200), Pivot 3/3.
- Rekordkontext 1D: nur Kandidatentage und Vergleich, ob verfuegbare Daily-Historie aelter ist als die Intraday-Historie. Liefert keine Minuten-PV-Summen.

Die Engine laeuft in `request.security(syminfo.tickerid, calcTf, f_engine(), gaps_off, lookahead_off, calc_bars_count)`.
Swing laeuft separat in `request.security(syminfo.tickerid, "15", f_swing15(), lookahead_off)`.
Zeichenobjekte entstehen nur im Chart-Kontext, nicht innerhalb des Request.

## UTC-Anker

```text
dayStart   = timestamp(UTC, y, m, d, 0, 0)
weekStart  = dayStart - daysSinceMonday * 86400000
monthStart = timestamp(UTC, y, m, 1, 0, 0)
```

Periodenwechsel ueber Schluesselvergleich, nicht ueber `hour==0`.
Daily, Weekly, Monthly unabhaengig zuruecksetzen.

## VWAP-Engine

```text
P = gewaehlte Quelle (HLC3 Default, sonst HL2 / Close / OHLC4)
V = volume der Quellkerze
Beitrag nur wenn V > 0 und P nicht na
volume == 0: vorhandenen VWAP unveraendert
volume na oder V < 0 oder P na bei V > 0: Anker ungueltig, nicht nz auf 0
VWAP = PV / V wenn V > 0 sonst na
```

Laufende Kerze: `var`-Rollback, kein `varip`. Offene Quellkerze darf den Live-Wert aendern.

Kalender: direkte Periodensummen.
ATH/ATL: Prefix `cumPV/cumV` unmittelbar vor der Extremkerze, Extremkerze eingeschlossen.
Swing: eigene 15m-Summe ab der Pivotkerze (`priceSrc`, Default HLC3). Kein calcTf-Prefix. Zeichnung erst wenn Chartzeit >= knownAtTime, Pfad ab Pivot.

## ATH / ATL

Modul A findet Rekorde auf calcTf: neues High > bisher, neues Low < bisher.
Gleichstand verankert nicht neu. Neues Extrem an spaeterer Kerze inklusive gleichem UTC-Tag verschiebt den Anker.

`recordHistoryCoverage`:

- `VERIFIED_SCOPE` wenn der Nutzer den Historienbeginn als geprueft markiert
- sonst `AVAILABLE_HISTORY_ONLY` (Label `ATH*` / `ATL*` plus Hinweis)

Liegt der Anker vor der ersten Quellkerze und kein gueltiger Seed: Wert `na`, Reason `MISSING_PREFIX`.
1D-Extrem vor Intraday-Start ohne Seed: nicht als vollstaendiger 1m-VWAP ausgeben.

## Seeds (ATH/ATL)

```text
Seed gilt fuer [anchorTime, seedUntilExclusive)
Pine addiert ab seedUntilExclusive inklusive
```

Pflichtabgleich: Symbol, calcTf, Preisquelle, Ankerzeit, seedV >= 0, keine Luecke, keine Doppelzaehlung.
Neuer Ankertag verwirft den alten Seed.

Referenz: P=[100,110,90], V=[10,30,20], nach zwei Kerzen seedPV=4300 seedV=40, Ergebnis 101.666...

## Swing

Zweiter `request.security(..., "15", f_swing15(), lookahead_off)`, nicht in `f_engine()`.
`ta.pivothigh/low` mit `not na(ph)` / `not na(pl)`; Pivotzeit `time[pivotRight]`, Preis `ph`/`pl` (kein `ph[pivotRight]`).
Suchfenster `swingLookback` fuer neue Kandidaten. Anchor Lock: aktiver Anker bleibt, bis ein extremerer Pivot derselben Seite auf der richtigen Preisseite kommt oder der Lock die Preisseite verletzt (High > Close, Low < Close).
Zwei unabhaengige Akkumulatoren und Punktarrays. Polylinie `xloc.bar_time` aus 15m-Zeiten. Labels `Swing VWAP ▲` / `▼` plus Datum am letzten 15m-Punkt.

## Ausgabe

Fuenf Plots: Daily (solid), Weekly/Monthly/ATH/ATL (dashed). Farben aus Inputs.
Swing: zwei Polylinien plus optionales Endsegment, Breite aus Input, kein sechster Style-Eintrag.
Labels: max. 7, `label.style_label_left`, transparent, Update per `label.set_*`.
Hinweis-Tabelle unabhaengig von Label-Schaltern.

## Limits (Plattform, erneut pruefen)

- Intrabars je nach Tarif ca. 100000 / 125000 / 200000
- Request-, Tuple-, Zeichenobjekt- und Laufzeitgrenzen laut Pine-Limitations
- `max_bars_back` erzeugt keine fehlenden Marktdaten
- Sekunden-, Tick- und synthetische Charts: kein V1-Support
- Chart-TF < calcTf: Warnung, keine zusaetzliche Genauigkeit

Quellen (konsultiert 18.09.2026): Pine v6 Time, Other timeframes, Execution model, Limitations, Plots, Labels, Repainting.
