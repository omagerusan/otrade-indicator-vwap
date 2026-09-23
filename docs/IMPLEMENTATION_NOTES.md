# Implementation Notes - VWAP Suite

Stand: 23.09.2026. Hauptskript: `src/VWAP_Suite.pine` (Pine v6).

Compiler: TradingView `pine-facade/translate_light` (Gast) am 23.09.2026, 0 Fehler / 0 Warnungen (`tests/compile_report.json`). Add-to-chart in der Chart-UI verlangt ein Konto.

Live-Feed: Binance Spot BTCUSDT/ETHUSDT und Perp BTCUSDT, Spiegel-Engine `tests/live_abnahme.mjs`. Zoom-Pixeltests bleiben ohne eingeloggte Chart-UI ungemessen.

## V1-Definition (nach Benutzerfreigabe)

- Daily / Weekly / Monthly: Anker 00:00 UTC, Woche = Montag.
- Gemeinsame Festbasis: Default 1 Minute, HLC3, unabhaengig vom Chart.
- ATH/ATL: Anker ist die Daily-Rekordkerze (`dAthT` / `dAtlT`). Summe fest auf 60 Minuten. Liegt der Rekord davor: Linie aus, `MISSING_PREFIX`. Kein manuelles Intervall und kein Seed.
- Swing-VWAP ist nicht Teil von `VWAP_Suite.pine` (entfernt 23.09.2026 wegen Speicherlimit RE10139). Spec und Isolattests bleiben unter `docs/04_SWING_VWAP.md` und `prototypes/`.

## Architektur

- Ein `request.security(..., calcTf, f_engine(), lookahead_off, calc_bars_count)` fuer Daily/Weekly/Monthly.
- Eigener `request.security(..., "1D", f_dailyRec(), lookahead_off, calc_bars_count = 15000)` fuer den offiziellen ATH/ATL-Zeitpunkt.
- Eigener `request.security(..., "60", f_recordEngine(), lookahead_off, calc_bars_count)` fuer die ATH/ATL-Summe. Nur Skalare, keine Arrays.
- Kalender: direkte Periodensummen, Reset per UTC-Schluessel (nicht `hour==0`).
- ATH/ATL: Summe ab der Daily-Rekordkerze, diese Kerze inklusive. Neuer Daily-Rekord setzt die Summe neu auf. Kein Fallback auf `srcFirst`.
- Fuenf `plot()`-Eintraege.
- Labels: maximal 5 Objekte, Update per `label.set_*`, `label.style_label_left`, Default-Abstand 0.
- Volumen der offenen Kerze: `var`-Rollback, kein `varip`.
- `na`-Volumen wird nicht zu 0.

## Bekannte Pine- und Datengrenzen

- `calc_bars_count` (Default 100000) garantiert keine existierende Historie; Kontingent ist tarifabhaengig.
- `max_bars_back` wird nicht als Datenquelle missbraucht.
- 1D-Rekordkontext sucht das Allzeithoch und Allzeittief auf Tageskerzen. Er ist der Anker, nicht nur ein Hinweis.
- Die ATH/ATL-Summe startet nicht auf dem ersten geladenen `calcTf`-Bar, wenn der Daily-Rekord davor liegt.
- Quellkerzen, die eine UTC-Grenze ueberqueren (calcTf > 1m), werden nicht anteilig zerlegt.
- Chart-TF < calcTf: Warnung, keine feinere Rechnung.
- Synthetische Charts (Heikin Ashi, Renko, ...): nicht unterstuetzt.
- Ueberlappende Labels werden in V1 nicht verschoben.
- RE10139: Collections (Arrays) aus `request.security` werden pro Chartkerze behalten. Der Indikator gibt deshalb keine Punktarrays aus einem Request zurueck.
- Style-Checkbox blendet nur den Plot aus, nicht die Label-Objekte.
- Verschachtelte Requests sind in der geprueften Pine-v6-Uebersetzung zulaessig, wenn `dynamic_requests = true` (im `indicator()` gesetzt). Das ist kein Nachweis, dass ein konkretes Konto 100000 1m-Kerzen liefert.
- `indicator()` hat in dieser Compilerversion kein Argument `max_tables_count`; es bleibt bei einer Hinweistabelle.
- `input.time` verlangt `const int`-Defaults. `timestamp("UTC", ...)` ist `simple int` und wird daher nicht als Default verwendet (feste UTC-Millisekunden).
- Der ATH/ATL-Anker ist der Tagesbeginn der Daily-Rekordkerze, nicht die Minutenkerze des Wicks.
- 7-10 Tage 1m-Historie reichen nicht fuer einen vollstaendigen Monthly-VWAP, wenn der Lauf nach dem Monatsanker beginnt; dann `MISSING_PREFIX` statt einer Scheinzahl (19.09.2026 Live: Monthly `na`).
- 1D-ATH von BTCUSDT Spot lag im Live-Lauf am 06.10.2025. Das 1-Minuten-Fenster reicht nicht bis dorthin; der Anker darf deshalb nicht auf den ersten 1-Minuten-Bar fallen. Die feste 60-Minuten-Summe mit 100000 Bars reicht bis zum 06.10.2025.
- `request.security` kann auf Bar 0 ein `na`-Snap liefern. Felder werden nur in `if not na(snap)` gelesen; `and`/`?:` wuerden trotzdem werfen. Ohne Snap bleiben Plots und Labels `na` (kein Chartkerzen-Fallback, kein 0-Ersatz).

## Prototypen

- `prototypes/P0A_label.pine` bis `P0F_style_swing.pine` bleiben Isolattests. Sie ersetzen `VWAP_Suite.pine` nicht.
