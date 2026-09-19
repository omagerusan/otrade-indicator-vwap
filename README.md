# oTrade VWAP (TradingView, Pine v6)

Overlay-Indikator: Daily, Weekly, Monthly, ATH, ATL und zwei Swing-VWAPs (High/Low). Chart-Titel: `oTrade VWAP`. Inputs stehen im Inputs-Tab, nicht in der Statuszeile.

- Kalenderanker: 00:00 UTC (Woche: Montag).
- ATH/ATL: Anker an der Extremkerze, feste Intraday-Basis (Default 1m, HLC3).
- Swing: bestaetigte 1H-Pivots, Summe ab 00:00 UTC des Pivottags, Anzeige erst nach Bestaetigung.

Hauptskript: `src/VWAP_Suite.pine`. Spezifikation: `docs/01_VWAP_Umsetzungsplan.md`.

Compiler-Nachweis (Gast-API) und Live-Feed-Tests: `tests/TEST_RESULTS.md`. Pixel-Zoom braucht ein eingeloggtes TradingView-Chart.
