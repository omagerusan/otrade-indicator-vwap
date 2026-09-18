# VWAP Suite (TradingView, Pine v6)

Overlay-Indikator: Daily, Weekly, Monthly, ATH, ATL und zwei Swing-VWAPs (High/Low).

- Kalenderanker: 00:00 UTC (Woche: Montag).
- ATH/ATL: Anker an der Extremkerze, feste Intraday-Basis (Default 1m, HLC3).
- Swing: bestaetigte 1H-Pivots, Summe ab 00:00 UTC des Pivottags, Anzeige erst nach Bestaetigung.

Hauptskript: `src/VWAP_Suite.pine`. Spezifikation: `docs/01_VWAP_Umsetzungsplan.md`.

TradingView-Kompilierung und Zoomtests liegen ausserhalb dieses Repos. Siehe `tests/TEST_RESULTS.md`.
