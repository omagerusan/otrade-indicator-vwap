# Testplan - TradingView VWAP Suite

## Ziel

Dieser Testplan prüft fachliche Korrektheit, UTC-Anker, historische Datenintegrität, Darstellung und Objektverhalten.

## A. Grundfunktion

- T01: Skript kompiliert ohne Fehler in Pine Script v6.
- T02: Daily VWAP einzeln ein-/ausschaltbar.
- T03: Weekly VWAP einzeln ein-/ausschaltbar.
- T04: Monthly VWAP einzeln ein-/ausschaltbar.
- T05: ATH VWAP einzeln ein-/ausschaltbar.
- T06: ATL VWAP einzeln ein-/ausschaltbar.
- T07: Swing VWAP einzeln ein-/ausschaltbar.
- T08: Jede Farbe unabhängig änderbar.

## B. UTC-Anker

- T09: Daily startet exakt bei neuem UTC-Tag.
- T10: Daily reagiert nicht auf Änderung der Chart-Zeitzone.
- T11: Weekly startet Montag 00:00 UTC.
- T12: Weekly startet nicht Sonntag 00:00 UTC.
- T13: Monthly startet am 1. um 00:00 UTC.
- T14: Monatswechsel mit 28/29/30/31 Tagen korrekt.
- T15: Jahreswechsel Dezember -> Januar korrekt.
- T16: Sommer-/Winterzeit beeinflusst UTC-Anker nicht.

## C. Labels

- T17: Globaler Label-Schalter blendet reguläre Labels aus/ein.
- T18: Swing-Label separat steuerbar.
- T19: Label-Farbe entspricht VWAP-Farbe.
- T20: Label-Y entspricht aktuellem VWAP-Wert.
- T21: Ankerdatum im Label ist korrekt.
- T22: Zoom In/Out erzeugt keine stark springende künstliche Lücke.
- T23: Pan/Scroll verändert nicht den mathematischen VWAP.
- T24: Keine wachsende Anzahl historischer Labels pro Bar.

## D. Timeframes

Prüfe mindestens:

- T25: 1m
- T26: 5m
- T27: 15m
- T28: 1H
- T29: 4H
- T30: 1D
- T31: 1W

Für jede Prüfung: gleiche fachliche VWAP-Basis muss gemäß Spezifikation erhalten bleiben.

## E. ATH / ATL

- T32: ATH-Anker entspricht der freigegebenen Definition.
- T33: ATL-Anker entspricht der freigegebenen Definition.
- T34: ATH wird nicht nur aus sichtbaren Bars ermittelt.
- T35: ATL wird nicht nur aus sichtbaren Bars ermittelt.
- T36: Sehr alter ATH-Anker mit unzureichender Berechnungshistorie wird als unvollständig behandelt.
- T37: Sehr alter ATL-Anker analog.
- T38: Fehlende Historie erzeugt keinen künstlichen 0-Wert.
- T39: Symbolwechsel berechnet ATH/ATL neu.
- T40: Reload verändert einen vollständig reproduzierbaren ATH/ATL-Wert nicht unerwartet.

## F. Swing

- T41: Pivot wird erst nach rechter Bestätigung akzeptiert.
- T42: Pivot-Zeit und Bestätigungszeit sind intern korrekt unterschieden.
- T43: Neuer bestätigter Swing setzt den vorgesehenen Swing-Anker.
- T44: Kein zukünftiger Pivot wird im Replay vorzeitig sichtbar.
- T45: Swing-Ankerdatum im Label stimmt mit der freigegebenen Definition überein.
- T46: Mehrere Swings am selben UTC-Tag verhalten sich gemäß definierter Ankerregel.

## G. Realtime / Replay

- T47: Laufender Daily VWAP aktualisiert sich mit neuen Daten.
- T48: Laufender Weekly VWAP aktualisiert sich korrekt.
- T49: Laufender Monthly VWAP aktualisiert sich korrekt.
- T50: Replay verwendet nur bis dahin bekannte Daten.
- T51: Nach Replay-Fortschritt werden Label und Wert korrekt aktualisiert.

## H. Grenzfälle

- T52: Symbol ohne sinnvolles Volumen wird definiert behandelt.
- T53: `na`-Daten verursachen keinen falschen Nullwert.
- T54: Historielücken werden nicht als echte Nullvolumen-Perioden interpretiert.
- T55: Sehr kurze geladene Historie erzeugt keine falsche ATH/ATL-Sicherheit.
- T56: Alle VWAPs ausgeschaltet -> keine unnötigen sichtbaren Objekte.
- T57: Alle Labels ausgeschaltet -> Linien bleiben korrekt.
- T58: Mehrere VWAPs auf nahezu identischem Preisniveau bleiben mathematisch unverändert, auch wenn Labels optisch kollidieren.

## Abschlusskriterium

Keine finale Freigabe bei FAIL in:

- UTC-Ankerlogik
- ATH-/ATL-Datenvollständigkeit
- Swing-Bestätigung
- falscher VWAP-Berechnungsbasis

Darstellungsprobleme mit Labels dürfen nur dann als bekannte Einschränkung akzeptiert werden, wenn Pine technisch keinen stabileren Ansatz ermöglicht und dies dokumentiert wurde.
