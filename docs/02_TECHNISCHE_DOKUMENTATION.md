# Technische Dokumentation - VWAP Suite

Pine Script v6 Overlay. Ein lauffaehiges Hauptskript: `src/VWAP_Suite.pine`.
Zeitzone fuer Anker und Datumstexte: `UTC` (UTC+0). Chart-Zeitzone ist nur Anzeige.

## Datenkontexte

- Chart-Timeframe: Darstellung.
- Berechnungs-Timeframe `calcTf`: 1 / 5 / 15 / 60 Minuten, Default 1 Minute. Gilt fuer Daily, Weekly und Monthly.
- ATH/ATL-Intervall: fest 60 Minuten. Summe ab der Daily-Rekordkerze. Kein Input.
- Rekordkontext 1D: offizieller ATH-/ATL-Zeitpunkt (`dAthT`, `dAtlT`) ueber bis zu 15000 Tagesbars. Das ist der Boersen-Tagesbeginn der Rekordkerze, nicht die einzelne Minuten-Wick.

Die Kalender-Engine laeuft in `request.security(syminfo.tickerid, calcTf, f_engine(), gaps_off, lookahead_off, calc_bars_count)`.
Der Rekord laeuft in `request.security(..., "1D", f_dailyRec(), calc_bars_count = 15000)`.
Die ATH/ATL-Summe laeuft in `request.security(..., "60", f_recordEngine(), calc_bars_count)`.
Zeichenobjekte entstehen nur im Chart-Kontext, nicht innerhalb des Request.
Alle Requests liefern nur Skalare. Keine Arrays aus `request.security` (Speicherlimit RE10139). Swing-VWAP ist nicht Teil dieses Skripts.

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
ATH/ATL: Summe ab der Daily-Rekordkerze auf 60 Minuten, Rekordkerze eingeschlossen. Neuer Daily-Rekord startet die Summe neu.

## ATH / ATL

Der Anker kommt aus der Daily-Historie, nicht aus dem hoechsten High der geladenen `calcTf`-Bars.

- Daily-Anker innerhalb der 60-Minuten-Historie: VWAP ab dieser Kerze.
- Daily-Anker davor: Wert `na`, Reason `MISSING_PREFIX`, Hinweis mit Daily-Datum. Kein manueller Ersatz.

Das Label heisst `ATH VWAP` bzw. `ATL VWAP`.

## Ausgabe

Fuenf Plots: Daily (solid), Weekly/Monthly/ATH/ATL (dashed). Farben aus Inputs.
Labels: max. 5, `label.style_label_left`, transparent, Update per `label.set_*`.
Hinweis-Tabelle unabhaengig von Label-Schaltern.

## Limits (Plattform, erneut pruefen)

- Intrabars je nach Tarif ca. 100000 / 125000 / 200000
- Request-, Tuple-, Zeichenobjekt- und Laufzeitgrenzen laut Pine-Limitations
- `max_bars_back` erzeugt keine fehlenden Marktdaten
- Sekunden-, Tick- und synthetische Charts: kein V1-Support
- Chart-TF < calcTf: Warnung, keine zusaetzliche Genauigkeit

Quellen (konsultiert 18.09.2026): Pine v6 Time, Other timeframes, Execution model, Limitations, Plots, Labels, Repainting.
