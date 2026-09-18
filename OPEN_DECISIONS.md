# Open Decisions

Diese Datei enthält nur Entscheidungen, die die fachliche oder mathematische Bedeutung des Indikators beeinflussen.

## D01 - Berechnungsbasis ATH / ATL

**Status:** OFFEN

Mögliche Varianten:

1. feste Intraday-Basis, z. B. 1 Minute
2. explizite Daily-Basis
3. andere fest definierte Basis

Kein automatischer, unsichtbarer Wechsel zwischen Varianten.

## D02 - ATH / ATL Ankerzeit

**Status:** OFFEN

Mögliche Varianten:

1. tatsächliche Extremkerze
2. 00:00 UTC des Tages, an dem das Extrem entstand

## D03 - Swing-Timeframe und Pivotdefinition

**Status:** OFFEN

Vorläufige Idee aus der Spezifikation: bestätigte Pivot-Logik auf einem festen Ereignis-Timeframe. Finale Werte müssen festgelegt werden.

## D04 - Swing-Ankerzeit

**Status:** OFFEN

Mögliche Varianten:

1. tatsächliche Pivotkerze
2. 00:00 UTC des Pivot-Tages

## D05 - Anzahl gleichzeitiger Swing-VWAPs

**Status:** OFFEN

Mögliche Varianten:

1. nur jüngster bestätigter Swing
2. letzter Swing High und letzter Swing Low gleichzeitig
