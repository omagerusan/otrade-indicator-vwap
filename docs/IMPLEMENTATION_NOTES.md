# Implementation Notes - VWAP Suite

Stand: 18.09.2026. Hauptskript: `src/VWAP_Suite.pine` (Pine v6).
Dieses Workspace hat keinen TradingView-Compiler. Kompilierung, Zoom und Replay sind nicht live nachgewiesen.

## V1-Definition (nach Benutzerfreigabe)

- Daily / Weekly / Monthly: Anker 00:00 UTC, Woche = Montag.
- Gemeinsame Festbasis: Default 1 Minute, HLC3, unabhaengig vom Chart.
- ATH/ATL: Anker = Extremkerze im calcTf, nicht Mitternacht. Kein 1D/1m-Hybrid.
- Swing: zwei Linien (High und Low), Pivot 1H / 3 / 3, Summe ab 00:00 UTC des Pivottags, Plot erst ab `knownAtTime`.
- `knownAtTime` kommt aus dem geschlossenen Swing-Timeframe-Bar (`lookahead_off`). Das ist konservativer als eine intra-bar Bestaetigung.

## Architektur

- Ein `request.security(..., calcTf, f_engine(), lookahead_off, calc_bars_count)`.
- Innerhalb der Engine verschachtelte Requests: `1D` (Rekordkandidat) und `swingTf` (bestaetigte Pivots).
- Kalender: direkte Periodensummen, Reset per UTC-Schluessel (nicht `hour==0`).
- ATH/ATL: Prefix vor der Extremkerze; Extremkerze eingeschlossen.
- Swing: Prefix aus UTC-Tagesbaseline-Array (max. 400 Tage).
- Fuenf `plot()`-Eintraege. Swing als Polylinien, Breite nur in Inputs.
- Labels: maximal 7 Objekte, Update per `label.set_*`, `label.style_label_left`, Default-Abstand 0.
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
- Label-Zoom in Pixeln ist keine Plattformgarantie; Default 0 nutzt den nativen Textanker.
- Ueberlappende Labels werden in V1 nicht verschoben.
- Swing-Pfad ist auf 8000 Chartpunkte begrenzt; die Summe laeuft weiter.
- Style-Checkbox blendet nur den Plot aus, nicht die Label-Objekte.
- Verschachtelte Requests und dynamische Timeframes muessen in der aktuellen TradingView-Version geprueft werden. Falls der konkrete Request die gewuenschte 1m-Historie nicht liefert, ist das ein Datenlimit, kein stiller Fallback auf Chartkerzen.
- Tagesbasis-ATH/ATL ist spezifiziert, aber nicht in V1 aktiv.

## Prototypen

- `prototypes/P0A_label.pine` bis `P0F_style_swing.pine` bleiben Isolattests. Sie ersetzen `VWAP_Suite.pine` nicht.
