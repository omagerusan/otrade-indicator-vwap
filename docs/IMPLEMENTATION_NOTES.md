# Implementation Notes - VWAP Suite

Stand: 23.09.2026. Hauptskript: `src/VWAP_Suite.pine` (Pine v6).

Compiler: TradingView `pine-facade/translate_light` (Gast) am 23.09.2026, 0 Fehler / 0 Warnungen (`tests/compile_report.json`). Add-to-chart in der Chart-UI verlangt ein Konto.

Live-Feed: Binance Spot BTCUSDT/ETHUSDT und Perp BTCUSDT, Spiegel-Engine `tests/live_abnahme.mjs`. Zoom-Pixeltests bleiben ohne eingeloggte Chart-UI ungemessen.

## V1-Definition (nach Benutzerfreigabe)

- Daily / Weekly / Monthly: Anker 00:00 UTC, Woche = Montag.
- Gemeinsame Festbasis: Default 1 Minute, HLC3, unabhaengig vom Chart.
- ATH/ATL: Anker = Extremkerze im calcTf, nicht Mitternacht. Kein 1D/1m-Hybrid.
- Swing-VWAP ist nicht Teil von `VWAP_Suite.pine` (entfernt 23.09.2026 wegen Speicherlimit RE10139). Spec und Isolattests bleiben unter `docs/04_SWING_VWAP.md` und `prototypes/`.

## Architektur

- Ein `request.security(..., calcTf, f_engine(), lookahead_off, calc_bars_count)` fuer Daily/Weekly/Monthly/ATH/ATL.
- Innerhalb der Engine verschachtelter Request: `1D` (Rekordkandidat).
- Kein zweiter Request und keine Collections aus `request.security`. `Snap` enthaelt nur Skalare.
- Kalender: direkte Periodensummen, Reset per UTC-Schluessel (nicht `hour==0`).
- ATH/ATL: Prefix vor der Extremkerze; Extremkerze eingeschlossen.
- Fuenf `plot()`-Eintraege.
- Labels: maximal 5 Objekte, Update per `label.set_*`, `label.style_label_left`, Default-Abstand 0.
- Volumen der offenen Kerze: `var`-Rollback, kein `varip`.
- `na`-Volumen wird nicht zu 0.

## Seeds

- Optional, Default aus. Formel: Seed `[anchor, seedUntil)` plus Pine ab `seedUntil`.
- Symbol, Intervall und Quelle muessen zur aktiven Berechnung passen.
- Extrempreis 0 bedeutet unbekannt; dann bleibt der Seed-Anker bestehen, bis er deaktiviert wird. Ein Wert > 0 erlaubt den Wechsel auf eine neuere 1m-Extremkerze.

## Bekannte Pine- und Datengrenzen

- `calc_bars_count` (Default 100000) garantiert keine existierende Historie; Kontingent ist tarifabhaengig.
- `max_bars_back` wird nicht als Datenquelle missbraucht.
- 1D-Rekordkontext folgt dem Symbol-Tagesbar, nicht zwingend der UTC-Kalendertageskerze. Er dient nur dem Hinweis "aeltere Daily-Historie", nicht der Minuten-VWAP-Summe.
- Quellkerzen, die eine UTC-Grenze ueberqueren (calcTf > 1m), werden nicht anteilig zerlegt.
- Chart-TF < calcTf: Warnung, keine feinere Rechnung.
- Synthetische Charts (Heikin Ashi, Renko, ...): nicht unterstuetzt.
- Ueberlappende Labels werden in V1 nicht verschoben.
- RE10139: Collections (Arrays) aus `request.security` werden pro Chartkerze behalten. Der Indikator gibt deshalb keine Punktarrays aus einem Request zurueck.
- Style-Checkbox blendet nur den Plot aus, nicht die Label-Objekte.
- Verschachtelte Requests sind in der geprueften Pine-v6-Uebersetzung zulaessig, wenn `dynamic_requests = true` (im `indicator()` gesetzt). Das ist kein Nachweis, dass ein konkretes Konto 100000 1m-Kerzen liefert.
- `indicator()` hat in dieser Compilerversion kein Argument `max_tables_count`; es bleibt bei einer Hinweistabelle.
- `input.time` verlangt `const int`-Defaults. `timestamp("UTC", ...)` ist `simple int` und wird daher nicht als Default verwendet (feste UTC-Millisekunden).
- Seed-Symbolvergleich nutzt `ticker.standard(syminfo.tickerid)`, weil `syminfo.tickerid` Zusaetze enthalten kann.
- Tagesbasis-ATH/ATL ist spezifiziert, aber nicht in V1 aktiv.
- 7-10 Tage 1m-Historie reichen nicht fuer einen vollstaendigen Monthly-VWAP, wenn der Lauf nach dem Monatsanker beginnt; dann `MISSING_PREFIX` statt einer Scheinzahl (19.09.2026 Live: Monthly `na`).
- 1D-ATH von BTCUSDT Spot lag im Live-Lauf am 06.10.2025 und damit vor dem 1m-Fenster; ohne Seed und ohne manuelle Rekordpruefung kein vollstaendiger Allzeit-ATH-VWAP.
- `request.security` kann auf Bar 0 ein `na`-Snap liefern. Felder werden nur in `if not na(snap)` gelesen; `and`/`?:` wuerden trotzdem werfen. Ohne Snap bleiben Plots und Labels `na` (kein Chartkerzen-Fallback, kein 0-Ersatz).

## Prototypen

- `prototypes/P0A_label.pine` bis `P0F_style_swing.pine` bleiben Isolattests. Sie ersetzen `VWAP_Suite.pine` nicht.
