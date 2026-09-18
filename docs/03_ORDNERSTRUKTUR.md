# Ordnerstruktur

```text
otrade-indikator-vwap/
  START_PROMPT.md
  TradingView_VWAP_Indikator_Umsetzungsplan.md
  README.md
  src/
    VWAP_Suite.pine
  prototypes/
    P0A_label.pine
    P0B_weekly_1m.pine
    P0C_missing_prefix.pine
    P0D_seed_bridge.pine
    P0E_events.pine
    P0F_style_swing.pine
  docs/
    01_VWAP_Umsetzungsplan.md
    02_TECHNISCHE_DOKUMENTATION.md
    03_ORDNERSTRUKTUR.md
    OPEN_DECISIONS.md
    IMPLEMENTATION_NOTES.md
  tests/
    TESTPLAN.md
    TEST_RESULTS.md
```

## Regeln

- `src/VWAP_Suite.pine` ist die einzige Hauptversion.
- Prototypen bleiben isoliert, sie ersetzen das Hauptskript nicht.
- Pine hat kein Feature-Split wie SPFx: Module sind Funktionen und UDTs in einer Datei.
- Keine zweiten konkurrierenden Indikator-Skripte im `src/`-Ordner.
