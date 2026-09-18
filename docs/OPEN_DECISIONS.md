# Offene Entscheidungen - VWAP Suite

Status: V1-Freigaben und markierte temporaere Standards.
Prioritaet: Benutzerentscheidung vor docs/01 vor docs/02.

## Entschieden durch den Benutzer (18.09.2026)

### ATH/ATL-Berechnungsbasis und Anker

- Entscheidung: Strikte Intraday-Festbasis (Default 1 Minute, HLC3). Anker an der tatsaechlichen Extremkerze, nicht 00:00 UTC des Ereignistages.
- Optionen: Mitternachtsanker / Extremkerze / bewusste Tagesbasis 1D.
- Technische Auswirkung: VWAP-Summe beginnt mit der Extremkerze. Mehrere Rekorde am selben UTC-Tag verschieben den Anker. Fehlende 1m-Historie am Extremzeitpunkt ergibt keinen vollstaendigen Wert.
- Standard: Extremkerze, strikt 1m. Tagesbasis-Modus nicht in V1.

### Swing-Linien

- Entscheidung: Zwei gleichzeitige Linien, bestaetigtes Swing High und bestaetigtes Swing Low.
- Optionen: Eine Linie (juengstes Hoch oder Tief) / zwei Linien.
- Technische Auswirkung: Zwei Zustande, zwei Pfade, zwei Endlabels. Ein Inputs-Schalter steuert beide.
- Standard: Zwei Linien. Pivotregeln sonst: 1H, 3 links / 3 rechts, Anker 00:00 UTC am Pivottag.

## Temporaere Standards (nicht vom Benutzer neu gesetzt)

### Historische Startbestaende

- Optionen: Nur strikter Modus / optionale PV-/Volumen-Seeds.
- Auswirkung: Alte Anker vor der Quellhistorie bleiben ohne Seed unvollstaendig.
- Temporaerer Standard: Seed-Inputs vorhanden, Default aus. Ungueltige Seeds werden nicht verwendet.

### Rekord-Gleichstand

- Optionen: Nicht neu verankern / juengsten gleich hohen Treffer verwenden.
- Temporaerer Standard: Gleicher Preis verankert nicht neu. Ein hoeherer/tieferer Preis an spaeterer Kerze verankert neu.

### Historische ATH/ATL-Darstellung

- Optionen: Kausal (damals bekannter Rekord) / nur aktuelle Ankerkurve rueckwaerts.
- Temporaerer Standard: Kausal. Endlabel nur am aktiven Anker.

### Swing-Konflikt gleiche Pivotzeit

- Optionen: High bevorzugen / Low bevorzugen / bisherigen Zustand behalten.
- Temporaerer Standard: Bisheriges Ereignis der betroffenen Seite beibehalten; diagnostisch markieren.

### Swing-Farbe

- Optionen: Eine Farbe / zwei Farben.
- Temporaerer Standard: Eine gemeinsame Farbe (Violett). High/Low nur im Labeltext.

### Label-Abstand

- Optionen: 0 (nativer Textanker) / Kerzenoffset.
- Temporaerer Standard: 0. Zusaetzlicher Kerzenabstand bleibt Input 0-30.

### Live-Wert

- Optionen: Inklusive laufender Quellkerze / nur abgeschlossene Quellkerzen.
- Temporaerer Standard: Live inklusive offener Quellkerze. `varip` wird nicht verwendet.

### Marktprofil

- Optionen: 24/7-Krypto zuerst / Aktien/Futures/Forex.
- Temporaerer Standard: Zeitbasierte Standardcharts, 24/7-Krypto mit Volumen. Andere Maerkte nicht als vollstaendig abgenommen.

## Bewusst nicht in V1

- Unbemerkte Hybridsumme aus alten Tages- und neuen Minutenbeitraegen
- Automatischer Fallback Intraday -> Daily
- Alerts, Baender, Signale, EMA, manuell verankerter VWAP
