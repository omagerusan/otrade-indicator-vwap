# TradingView VWAP Suite: UTC Periods, ATH, ATL und Swing
## Detaillierte Produktspezifikation und Umsetzungsplan für eine Code-KI

**Dokumentversion:** 1.0 - mit ausdrücklich gekennzeichneten Annahmen  
**Stand der Dokumentationsprüfung:** 18. September 2026  
**Zielplattform:** TradingView, Pine Script v6, Overlay im Hauptchart  
**Arbeitstitel:** `VWAP Suite - UTC + ATH/ATL + Swing`  
**Status:** Planung und Architektur, kein fertig implementierter oder in TradingView kompilierter Indikator.

> **Auftrag an die ausführende KI:** Implementiere den unten beschriebenen Kernumfang. Prüfe die technisch kritischen Teile zuerst mit kleinen Pine-Prototypen. Erfinde keine APIs, keine nicht vorhandene Historie und keine Genauigkeitsgarantien. Kennzeichne offene Produktentscheidungen. Optionale Erweiterungen dürfen nicht ungefragt eingebaut werden.
>
> **Zentrale Qualitätsregel:** Ein vorhandener Zahlenwert ist noch kein nachgewiesen korrekter VWAP. Anker, Preisquelle, Berechnungsintervall, Volumenbasis, historische Abdeckung und Datenstand müssen zusammenpassen. Bei fehlenden Daten ist eine sichtbare Einschränkung besser als eine scheinbar präzise, falsch beschriftete Linie.

---

## 1. Zielbild und Einschätzung

Der Indikator soll sechs VWAP-Typen in einer gemeinsamen, schlanken Oberfläche bereitstellen:

- Daily, Weekly und Monthly VWAP mit festen UTC-Kalendergrenzen.
- ATH- und ATL-VWAP, verankert am jeweils maßgeblichen historischen Extrem.
- Swing VWAP mit nachvollziehbarer, bestätigter Swing-Erkennung.

Alle Typen sind einzeln schaltbar und erhalten eine eigene Farbe. Rechts am aktuellen Linienende steht optional ein gleichfarbiges Textlabel. Das Ankerdatum kann ergänzt werden. Die regulären fünf VWAPs erscheinen als eigene Plots im Style-Tab; Swing orientiert sich am gesonderten Breitenfeld im Inputs-Screenshot.

**Meine Einschätzung:** Die Kombination ist als Darstellungswerkzeug sinnvoll. Die eigentliche Schwierigkeit liegt nicht in sechs Linien, sondern in der sauberen Definition ihrer Datenbasis. Besonders ATH/ATL und Swing sollten nicht einfach aus dem gerade sichtbaren Chartfenster berechnet werden. Die erste Version soll deshalb auf verlässliche Werte, verständliche Anker und gute Lesbarkeit ausgerichtet sein, nicht auf zusätzliche Kauf-/Verkaufssignale.

Die beiden Screenshots dienen als Layoutvorlage. Dieses Dokument beschreibt alles Notwendige auch ohne die Bilddateien.

### 1.1 Abgrenzung zum vorherigen EMA-Projekt

Dies ist ein **separater VWAP-Indikator**. Keine EMA-Berechnungen integrieren. Label-Ausrichtung, Farblogik und Bedienregeln sollen jedoch zum EMA-Indikator passen. Die Erweiterungsvorschläge in Abschnitt 23 beziehen sich primär auf VWAP; gemeinsame Verbesserungen für beide Indikatoren sind gesondert genannt.

### 1.2 Vier Dinge, die nicht verwechselt werden dürfen

| Begriff | Bedeutung |
|---|---|
| Chart-Timeframe | Zeitraster, auf dem die Ergebnisse angezeigt werden, beispielsweise 15 Minuten. |
| Berechnungs-Timeframe | Festes Zeitraster, dessen Preis- und Volumenwerte in die VWAP-Summe eingehen. |
| Ereignis-Timeframe | Zeitraster zur Suche nach ATH/ATL oder bestätigten Swings. |
| Ankerzeit | Beginn des Intervalls, dessen Preis-Volumen-Beiträge berücksichtigt werden. |

Beispiel der vorgeschlagenen Standardkonfiguration: Chart 15 Minuten, VWAP-Basis 1 Minute, Swing-Erkennung 1 Stunde, Swing-Anker 00:00 UTC am Tag der Pivotkerze. Diese vier Angaben erfüllen unterschiedliche Aufgaben.

---

## 2. Die wichtigste Grenze: Was "immer den richtigen Wert" bedeuten kann

### 2.1 Mathematische Definition

Für eine feste Folge von Quellkerzen und einen Anker `a` gilt:

```text
P_i       = gewählter Quellpreis der Quellkerze i
V_i       = Volumen derselben Quellkerze
PV(a, t)  = Summe(P_i * V_i) für alle eingeschlossenen Kerzen von a bis t
VOL(a, t) = Summe(V_i)       für dieselben Kerzen
VWAP(a,t) = PV(a,t) / VOL(a,t), sofern VOL(a,t) > 0
```

Vorgeschlagene Standardquelle ist `HLC3 = (high + low + close) / 3`. TradingView beschreibt seinen regulären VWAP mit kumulierten Preis-Volumen-Beiträgen und verwendet HLC3 als Standardquelle.[^tv-vwap]

**Präzisionsvertrag dieses Projekts:** "Vollständig berechnet" bedeutet korrekt bezogen auf die gewählten OHLCV-Quellkerzen des festgelegten Datenfeeds. Es ist keine Zusage eines exakten Durchschnitts aller einzelnen Börsentransaktionen oder aller Börsen zusammen.

### 2.2 Tageskerzen ersetzen keine fehlenden Minutenbeiträge

Eine aus größeren OHLC-Kerzen gebildete typische Preisquelle ist im Allgemeinen nicht volumenadditiv:

```text
HLC3(Tag) * Volumen(Tag)
!= Summe(HLC3(Minute) * Volumen(Minute))
```

Ein rein mathematisches Beispiel mit zwei flachen Quellkerzen:

| Kerze | High | Low | Close | Volumen | HLC3 * Volumen |
|---|---:|---:|---:|---:|---:|
| 1 | 100 | 100 | 100 | 10 | 1.000 |
| 2 | 110 | 110 | 110 | 30 | 3.300 |

Der VWAP der beiden Quellkerzen beträgt `4.300 / 40 = 107,5`. Die zusammengefasste Kerze hat High 110, Low 100 und Close 110. Ihr HLC3 beträgt dagegen `106,6666667`. Aus der größeren Kerze allein lässt sich der ursprüngliche Beitrag 4.300 nicht rekonstruieren.

Deshalb sind drei Eigenschaften getrennt zu prüfen:

1. **Anker korrekt:** Ist es wirklich das gewünschte Extrem und der gewünschte Startzeitpunkt?
2. **Historie ausreichend:** Sind alle benötigten Beiträge seit diesem Anker vorhanden?
3. **Definition unverändert:** Wurde auf jedem Chart dieselbe Preis-, Volumen- und Zeitbasis verwendet?

Das blosse Finden des ATH-Datums löst nur den ersten Punkt.

### 2.3 Pine kann weitere Historie anfordern, aber nicht beliebige Daten erzeugen

Berechnungen können in einem angeforderten Datenkontext ausgeführt werden; sie müssen nicht auf die sichtbaren Chartkerzen begrenzt sein.[^tv-mtf] Dennoch sind Requests, Datenumfang und Laufzeit begrenzt. Die Dokumentation nennt für untergeordnete Timeframes derzeit je nach Tarif Höchstgrenzen von 100.000, 125.000 oder 200.000 Intrabars.[^tv-limits]

Reine Zeitspanne für lückenlose 24/7-Daten, **keine zugesagte Verfügbarkeit**:

| Quellintervall | 100.000 Quellkerzen entsprechen ungefähr |
|---|---:|
| 1 Minute | 69,44 Tagen |
| 5 Minuten | 347,22 Tagen |
| 15 Minuten | 1.041,67 Tagen |
| 1 Stunde | 4.166,67 Tagen |

Der tatsächlich nutzbare Zeitraum kann kürzer sein. Kontotyp, Feed, Request-Kontext und tatsächlich gelieferte Kerzen prüfen. Ein höhere Zahl in `calc_bars_count` ist kein Nachweis, dass entsprechende Historie existiert.

### 2.4 Verbindliche Lösungswege

| Modus | Verhalten | Einordnung |
|---|---|---|
| **Festbasis, strikt** | Rechnet durchgehend auf dem eingestellten Intraday-Intervall. Fehlende Ankerhistorie wird nicht versteckt. | Vorgeschlagener Standard. |
| **Festbasis mit historischem Startbestand** | Ergänzt fehlende alte Beiträge durch geprüfte Summen derselben Berechnungsbasis. | Lösung für alte ATH-/ATL-Anker ohne stillen Methodenwechsel. |
| **Explizite Tagesbasis für ATH/ATL** | Rechnet ATH/ATL konsequent aus Tageskerzen. | Eigene, gröbere Definition; niemals als identischer Minuten-VWAP ausgeben. |

**Nicht erlaubt:** Unbemerkt alte Tageskerzen und neue Minutenkerzen zu mischen und das Ergebnis als unveränderten 1-Minuten-VWAP zu bezeichnen.

### 2.5 Was V1 ehrlich leisten soll

Ein ATH-VWAP kann auf einem 15-Minuten-Chart korrekt angezeigt werden, obwohl sein Anker außerhalb der dort geladenen Kerzen liegt, **wenn** der separate Berechnungskontext die erforderlichen Beiträge enthält oder ein gültiger historischer Startbestand vorliegt.

Für beliebige Symbole, beliebig alte Anker und beliebige Konten gibt es hier keine pauschale Vollständigkeitszusage. Die Code-KI darf die Anforderung nicht durch heimliche Näherungen "erfüllen". Solange keine Entscheidung für Tagesbasis oder ein passender Startbestand vorliegt, muss ein außerhalb der Quellhistorie liegender Anker im strikten Modus als nicht berechenbar gemeldet werden.

---

## 3. Offene Produktentscheidungen und vorgeschlagene Defaults

Die folgenden Punkte wurden vom Benutzer nicht abschließend definiert. Sie sind **Annahmen dieses Plans**, keine bereits bestätigten Anforderungen.

| Thema | Vorschlag für diesen Plan | Relevante Alternative |
|---|---|---|
| Datenbasis | Festes Intraday-Intervall, standardmäßig 1 Minute, HLC3. | 5/15/60 Minuten bewusst auswählbar; ändert die Berechnung. |
| Alte ATH-/ATL-Anker | Strikter Modus mit Qualitätsanzeige; historische Summen als Zusatzweg im Kernumfang. | Ausdrücklich gewählte Tagesbasis, siehe Abschnitt 13. |
| "Immer 0 Uhr UTC" | Gilt zunächst für **alle sechs Typen**. ATH/ATL/Swing beginnen bei 00:00 UTC am Ereignistag. | Bei ereignisbasierten VWAPs Beginn an der tatsächlichen Extrem-/Pivotkerze. |
| Swing-Anzahl | Eine aktive Linie vom jüngsten bestätigten Hoch- oder Tiefpivot. | Gleichzeitig je eine Linie vom letzten Swing High und Swing Low. |
| Swing-Erkennung | Fest 1H, links 3 und rechts 3 Kerzen. | Anderes festes Ereignisintervall und andere Pivotstärke. |
| Ereignisgleichstand | Gleiche ATH-/ATL-Preise verankern nicht neu. | Jüngsten gleich hohen/tiefen Treffer verwenden. |
| Historische Darstellung | Kalender-VWAPs historisch je Periode; ATH/ATL als damaliger Rekordstand. | Nur die jeweils aktuell aktive Ankerkurve rückwirkend zeigen. |
| Swing-Rückzeichnung | Standardmäßig keine Linie vor dem Bestätigungszeitpunkt. | Rückwirkende Illustration ab Anker, ausdrücklich gekennzeichnet. |
| Laufender Wert | Live-Wert inklusive laufender Quellkerze. | Ausschließlich abgeschlossene Quellkerzen. |
| Marktprofil für Abnahme | Zeitbasierte Standardcharts, zuerst 24/7-Kryptosymbole mit brauchbarem Volumen. | Aktien/Futures/Forex benötigen gesonderte Session- und Datenprüfungen. |

**Entscheidung vor der finalen ATH-/ATL-Abnahme:** Soll der Nutzer einen exakt definierten Intraday-VWAP oder bewusst einen Tageskerzen-VWAP erhalten? Die ausführende KI soll diesen Unterschied erklären und dokumentieren. Der strikte Standard darf nicht zugunsten einer optisch vollständigen Darstellung stillschweigend geändert werden.

---

## 4. Verbindlicher Kernumfang und Nicht-Ziele

| ID | Kernanforderung | Abnahmekriterium |
|---|---|---|
| R01 | Daily VWAP | Tagesanker bei 00:00 UTC. |
| R02 | Weekly VWAP | Wochenanker Montag 00:00 UTC. |
| R03 | Monthly VWAP | Monatsanker am 1. um 00:00 UTC. |
| R04 | ATH VWAP | Symbolbezogener Rekordanker, getrennte Historienprüfung. |
| R05 | ATL VWAP | Entsprechende Tiefpunktlogik. |
| R06 | Swing VWAP | Deterministischer, bestätigter Pivotanker. |
| R07 | Sichtbarkeit | Jeder der sechs Typen separat ein-/ausblendbar. |
| R08 | Farben | Pro Typ ein Farbinput, gemeinsam für Linie und Label. |
| R09 | Beschriftung | Ein Schalter für die fünf regulären Labels, ein unabhängiger Swing-Label-Schalter. |
| R10 | Ankerdatum | Optional im Label, stets als UTC-Datum formatiert. |
| R11 | Zoomfreundliche Labels | Kein standardmäßiger Abstand in Kerzen; nativen Textanker testen. |
| R12 | Style-Tab | Daily, Weekly, Monthly, ATH und ATL als fünf reguläre Plot-Einträge. |
| R13 | Historienentkopplung | Berechnung nicht auf sichtbares Chartfenster oder Chart-`bar_index` stützen. |
| R14 | Datenqualität | Fehlende Historie, fehlendes Volumen und ungesicherte Rekordhistorie unterscheiden. |
| R15 | Historischer Startbestand | ATH/ATL können optional passende historische PV-/Volumensummen fortschreiben. |
| R16 | Kausale Darstellung | Keine Kenntnis späterer Rekorde oder Pivots auf frühere Bars übertragen. |
| R17 | Ressourcenschonung | Begrenzte Historienpuffer und wiederverwendete Zeichenobjekte. |
| R18 | Reproduzierbare Prüfung | Referenzwerte, Seed-Test, UTC-Test und Timeframe-Vergleich dokumentieren. |

**Nicht in V1:** Automatisierte Handelsstrategie, Orderausführung, externe Serverpflicht, beliebige Netzwerkanfragen aus Pine, globale Multi-Börsen-ATHs, Standardabweichungsbänder, Signale, große Dashboards und automatisch hinzugefügte EMAs.

Der optionale Tagesbasis-Modus ist ausführlich spezifiziert, wird aber erst nach ausdrücklicher Auswahl durch den Benutzer Bestandteil der auszuliefernden Variante.

---

## 5. Inputs-Tab: Aufbau, Namen und Standardwerte

### 5.1 Gruppe `VWAP`

Checkbox und Farbe in einer Zeile, beim Swing zusätzlich die Breite. Reihenfolge wie im ersten Screenshot.

| Bezeichnung | Standard sichtbar | Vorgeschlagene Farbe | Weitere Felder |
|---|---|---|---|
| Daily VWAP | Nein | Gelb `#FFEB3B` | - |
| Weekly VWAP | Ja | Grün `#4CAF50` | - |
| Monthly VWAP | Ja | Blau `#2962FF` | - |
| ATH VWAP | Nein | Weiß `#FFFFFF` | - |
| ATL VWAP | Nein | Weiß `#FFFFFF` | - |
| Swing VWAP | Ja | Violett `#673AB7` | `Width`, Standard 2, Bereich 1 bis 4 |
| Label VWAPs | Ja | - | Gilt für Daily/Weekly/Monthly/ATH/ATL. |
| Label Swing VWAP | Ja | - | Unabhängig vom vorherigen Schalter. |

Die Farbwerte sind angenäherte Gestaltungswerte nach den Screenshots, keine gemessenen Farbprofile.

**Sichtbarkeitslogik:**

```text
reguläresLabelSichtbar = showSeries AND showRegularLabels AND valueIsDisplayable
swingLabelSichtbar      = showSwing  AND showSwingLabel    AND valueIsDisplayable
```

Ein ausgeschalteter Typ hat weder Linie noch Label. Ausgeschaltete Labels lassen die dazugehörigen Linien unverändert. Die beiden Label-Schalter sind keine Haupt-/Untermenü-Abhängigkeit.

### 5.2 Gruppe `Beschriftung`

| Input | Standard | Auswahl / Bereich |
|---|---|---|
| Ankerdatum anzeigen | Ja | Ja/Nein |
| Label-Größe | Klein | Sehr klein, Klein, Normal |
| Zusätzlicher Abstand (Kerzen) | 0 | 0 bis 30 |
| Berechnungsbasis im Label | Nein | Ja/Nein; Qualitätswarnungen werden dadurch nicht unterdrückt. |

Normale Texte:

```text
Daily VWAP 18.09.2026
Weekly VWAP 14.09.2026
Monthly VWAP 01.09.2026
ATH VWAP <Ankerdatum>
ATL VWAP <Ankerdatum>
Swing High VWAP <Ankerdatum>
```

Die Kalenderbeispiele sind nur Formatbeispiele, keine Behauptung über aktuelle Kurse oder Rekorde. Der Swing-Text unterscheidet `High` und `Low`, obwohl die Eingabezeile allgemein `Swing VWAP` heißt.

### 5.3 Gruppe `Berechnung und Daten`

| Input | Standard | Spezifikation |
|---|---|---|
| Berechnungsintervall | 1 Minute | Auswahlliste 1, 5, 15, 60 Minuten; unabhängig vom Chart. |
| Preisquelle | HLC3 | HLC3, HL2, Close, OHLC4. |
| Datenhinweise | Nur bei Einschränkungen | Optional zusätzlich `Details`; kritische Hinweise bleiben sichtbar. |
| Quellhistorie anfordern | 100.000 Kerzen | Technischer Default, keine Vollständigkeitsgarantie. Höhere Werte nur passend zum Konto anbieten. |

Quelle vorzugsweise über `input.string` auswählen und im Quellkontext auf OHLC abbilden. Keine beliebige externe Indikatorserie als `input.source` zulassen, solange deren Bedeutung in verschachtelten Requests nicht sauber unterstützt ist.

Eine Änderung des Berechnungsintervalls ist eine **Methodenänderung**, nicht bloss eine Darstellungsoption. Tooltip entsprechend formulieren.

### 5.4 Gruppe `Swing`

| Input | Standard | Bereich / Bedeutung |
|---|---|---|
| Swing-Timeframe | 1 Stunde | Auswahlliste 1H, 4H, 1D; >= Berechnungsintervall. |
| Pivot links | 3 | 1 bis 20 Quellkerzen des Swing-Timeframes. |
| Pivot rechts | 3 | 1 bis 20; bestimmt die Bestätigungsverzögerung. |
| Pivot-Auswahl | Jüngstes Hoch oder Tief | Alternativen `Nur Hoch`, `Nur Tief`. |

In der vorgeschlagenen V1 gibt es keine automatische Ableitung aus dem Chart-Timeframe. Ein Wechsel von 15 Minuten auf 4 Stunden soll nicht plötzlich andere Swing-Anker erzeugen.

### 5.5 Gruppe `ATH/ATL - Datenprüfung`

Ein Info-/Tooltiptext erklärt den Bezug auf das aktuelle **Börsensymbol**, nicht auf die gesamte Geschichte eines Vermögenswerts.

Optionaler Nachweis für die Rekordhistorie:

- Zeitpunkt des vom Benutzer verifizierten Beginns der relevanten Symbolhistorie.
- Ob dieser Beginn manuell als geprüft bestätigt wurde.

Diese Eingaben prüfen die *Rekordsuche*, nicht die Vollständigkeit der VWAP-Minutenbeiträge. Ohne solchen Nachweis wird die gefundene Höchst-/Tiefststelle nur als Extrem der verfügbaren Historie behandelt.

### 5.6 Gruppe `ATH/ATL - Historische Startbestände`

Pro Typ ein separater, standardmäßig ausgeschalteter Bereich. Er enthält Aktivierung, Symbol-/Basis-Metadaten, Ankerzeit, exklusiven Summen-Endzeitpunkt sowie PV- und Volumensumme. Details und Validierung in Abschnitt 12.

Diese Felder gehören in einen erweiterten Bereich, nicht zwischen die sechs einfachen VWAP-Zeilen. Ein deaktivierter Startbestand darf die normalen Berechnungen nicht beeinflussen.

### 5.7 Layouttechnik und Hilfetexte

`group`, `inline` und `tooltip` verwenden. Pine-Inputs sind keine frei gestaltbare HTML-Oberfläche; auf schmalen Dialogen sind Umbrüche zu akzeptieren.[^tv-inputs]

Wichtige Tooltip-Inhalte:

| Input | Aussage |
|---|---|
| VWAP-Schalter | "Steuert Linie und zugehöriges Textlabel gemeinsam. Die Style-Checkbox betrifft nur den Plot." |
| Berechnungsintervall | "Bestimmt die Preis-/Volumenbasis. Ein anderes Intervall kann einen anderen VWAP ergeben." |
| Ankerdatum | "Datum des Berechnungsbeginns in UTC, nicht der späteren Erkennung eines Swings." |
| Label-Abstand | "0 verankert das Label direkt am Linienende. Zusätzliche Kerzenabstände verändern sich beim Zoomen." |
| Pivot rechts | "Der Swing wird erst nach Abschluss dieser Anzahl rechter Swing-Kerzen bestätigt." |
| Historischer Startbestand | "Nur Summen derselben Preisquelle, Kerzengröße, Volumeneinheit und desselben Symbols verwenden." |

---

## 6. UTC-Anker: genaue Kalenderlogik

### 6.1 UTC ist verbindlich, nicht die Bildschirmzeitzone

Alle Kalenderberechnungen und Datumslabels verwenden explizit `UTC+0`. Pine-Zeitfunktionen erlauben Zeitzonenargumente; die Chartzeitzone ist eine Anzeigeeinstellung, auf die ein Skript nicht einfach als Berechnungsgrundlage zugreifen kann.[^tv-time]

Kein `timenow` zur historischen Ankersuche verwenden. Die relevante Zeit stammt aus der jeweils verarbeiteten **Quellkerze**.

### 6.2 Konzeptionelle Hilfsfunktionen

Die folgenden Fragmente beschreiben die beabsichtigte Logik, nicht ein fertig getestetes Gesamtskript:

```pine
const string ANCHOR_TZ = "UTC+0"
const int DAY_MS = 24 * 60 * 60 * 1000

f_utcDayStart(int ts) =>
    timestamp(ANCHOR_TZ,
        year(ts, ANCHOR_TZ), month(ts, ANCHOR_TZ),
        dayofmonth(ts, ANCHOR_TZ), 0, 0)

f_utcWeekStart(int ts) =>
    int dayStart = f_utcDayStart(ts)
    int daysSinceMonday = (dayofweek(ts, ANCHOR_TZ) - dayofweek.monday + 7) % 7
    dayStart - daysSinceMonday * DAY_MS

f_utcMonthStart(int ts) =>
    timestamp(ANCHOR_TZ, year(ts, ANCHOR_TZ), month(ts, ANCHOR_TZ), 1, 0, 0)
```

Diese Berechnung der Woche funktioniert auch am Jahreswechsel. Nicht `year` und `weekofyear` ohne weitere Behandlung zu einem vermeintlich sicheren Wochenschlüssel kombinieren.

### 6.3 Periodenwechsel über Schlüssel erkennen

```text
newDay   = aktuellerDayKey   != vorherigerDayKey
newWeek  = aktuellerWeekKey  != vorherigerWeekKey
newMonth = aktuellerMonthKey != vorherigerMonthKey
```

Nicht ausschließlich `hour == 0 AND minute == 0` verwenden. Sonst wird bei fehlender Mitternachtskerze ein Wechsel verpasst.

Daily, Weekly und Monthly werden **unabhängig** zurückgesetzt. Kein `if / else if / else if`: Am Montag, dem 1. eines Monats, können alle drei Anker gleichzeitig wechseln.

### 6.4 Keine Phantom-Aktualisierung um Mitternacht

Der logische Anker ist 00:00 UTC. Ohne Datenupdate wird aber kein Skript-Timer ausgelöst. Erst mit dem nächsten relevanten Datenupdate kann die neue Periode verarbeitet und gezeichnet werden.[^tv-execution]

Wenn der Markt zu diesem Zeitpunkt geschlossen ist, gibt es kein künstliches Volumen ab Mitternacht. Das Ankerdatum bleibt trotzdem die Kalendergrenze. Der erste tatsächlich berücksichtigte Handelszeitpunkt wird zusätzlich gespeichert.

### 6.5 Angebrochene Quellhistorie

Beginnt die verfügbare Quellhistorie am Mittwochmittag, darf die bis Freitag aufsummierte Restwoche nicht als vollständiger Weekly VWAP erscheinen. Der Weekly-Wert bleibt unvollständig, bis sein Anker abgedeckt ist; spätestens die folgende vollständig beobachtete Woche kann regulär berechnet werden.

Dasselbe gilt unabhängig für Tag und Monat. Die erste geladene Kerze ist nicht automatisch der richtige Anker.

### 6.6 Kerzen, die eine UTC-Grenze überqueren

Ein OHLCV-Balken, der auf beiden Seiten von 00:00 UTC liegt, lässt sich ohne kleinere Daten nicht exakt aufteilen. Keine proportionale Verteilung nach Minutenanteilen erfinden.

Die Standardbasis 1 Minute vermeidet dieses Problem bei regulär ausgerichteten Kryptokerzen. Für andere Basen prüfen, dass Quellkerzen zu den UTC-Grenzen passen. Andernfalls kleinere Datenbasis verlangen oder einen klaren Nicht-Unterstützt-Status setzen.

Native `timeframe.change("D")`-, `"W"`- oder `"M"`-Signale allein sind kein genereller Nachweis für die hier geforderte UTC-Abgrenzung. Die eigentlichen Schlüssel werden aus der expliziten UTC-Zeit berechnet.

---

## 7. Gemeinsame VWAP-Rechenengine

### 7.1 Eine feste Basis für die normale Berechnung

Alle strikten VWAPs verwenden denselben `calcTf` und dieselbe Preisquelle. Die Engine verarbeitet jede verfügbare Quellkerze genau einmal als historischen Beitrag beziehungsweise ersetzt den vorläufigen Beitrag der laufenden Kerze korrekt.

Die Berechnung läuft innerhalb des angeforderten Quellkontexts, nicht als Summierung bereits auf den Chart gemappter Einzelwerte. Die Plausibilität eines solchen LTF-Berechnungskontexts ist durch die dokumentierten Beispiele für Berechnungen innerhalb von `request.security()` gestützt; die konkrete zusammengesetzte Engine ist dennoch ein eigener Prototyp.[^tv-mtf-faq]

### 7.2 Zentrale Rechengrößen

```text
sourcePV = selectedPrice * sourceVolume
cumPV    = kumulierte sourcePV seit Beginn der verarbeiteten Quellhistorie
cumV     = kumuliertes sourceVolume seit demselben Beginn
```

Bei einem bekannten Anker innerhalb dieser Historie werden die kumulierten Werte **unmittelbar vor der Ankerkerze** als Basis gespeichert:

```text
vwap = (cumPV_now - cumPV_beforeAnchor) / (cumV_now - cumV_beforeAnchor)
```

Die Ankerkerze wird eingeschlossen. Bei einem UTC-Mitternachtsanker werden alle verfügbaren Quellkerzen mit Beginn ab 00:00 dieses Tages berücksichtigt.

### 7.3 Tagesbaselines für später erkannte Ereignisse

Zu jedem verarbeiteten UTC-Tagesanfang speichern:

```text
dayStartUtc
cumPVBeforeDay
cumVBeforeDay
coverageAtDayStart
invalidDataCounterAtDayStart
```

Diese Tagesbaselines erlauben es, einen erst später erkannten ATH, ATL oder Swing auf 00:00 desselben Tages zu verankern, **ohne** erst ab dem Erkennungszeitpunkt zu summieren.

Die Speicherung wird auf die nutzbare Quellhistorie begrenzt. Fehlt die Basis des betreffenden Tages, ist die Berechnung ohne Startbestand unvollständig. Keine Basis aus dem nächsten verfügbaren Tag unterschieben.

### 7.4 Kalender-VWAPs

Für Daily, Weekly und Monthly jeweils eigenes Anker-/Summenobjekt verwenden. Direkte, bei Periodenwechsel zurückgesetzte Summen sind hier ebenfalls geeignet und vermeiden die Subtraktion sehr großer Langzeitsummen.

Die Engine darf die gemeinsame Prefix-Struktur und die drei Periodenakkumulatoren parallel verwenden. Es muss aber für jeden Beitrag eindeutig sein, in welche Summe er genau einmal eingeht.

### 7.5 Datenfehler und Volumen

| Situation | Verhalten |
|---|---|
| `volume == 0`, ansonsten gültige Kerze | Beitrag ist null; vorhandenen VWAP unverändert lassen. |
| Gesamtes Ankerintervall bisher ohne positives Volumen | VWAP `na`, Zustand `NO_POSITIVE_VOLUME`. |
| `volume` ist `na` | Datenlücke melden; nicht pauschal zu null machen. |
| Positives Volumen, Preisquelle `na` | Ungültiger Beitrag, betroffenen Ankerstatus markieren. |
| Negatives Volumen | Datenfehler; nicht als normale negative Gewichtung behandeln. |
| Null oder negativer Preis | Nicht automatisch verwerfen; bei gültigem Feed mathematisch zulässig. |

Eine spätere gültige Kerze heilt nicht die fehlenden Beiträge eines bestehenden Ankers. Erst ein neuer Anker nach der Fehlerstelle oder ein nachgewiesener Ersatzbestand kann dessen Vollständigkeit wiederherstellen.

Fehlende Zeitstempel sind ein eigener Befund: Eine ausgelassene Minute kann auf fehlenden Handel oder auf eine Datenlücke zurückgehen. Ohne weiteres Wissen nicht behaupten, die Ursache sicher zu kennen. Der Status beschreibt die beobachtete Feed-Abdeckung, keine Garantie für alle realen Transaktionen.

### 7.6 Numerische Genauigkeit

Intern nicht auf die Preis-Tickgröße runden. Erst die Textdarstellung darf `format.mintick` verwenden. Gleichheitstests erhalten eine begründete numerische Toleranz, keine visuelle Pixelprüfung.

Bei langen Summen große fast gleiche Prefix-Werte nicht unkritisch voneinander abziehen. Direkte Ankerakkumulatoren oder kompensierte Summierung prüfen, wenn der Referenztest relevante Rundungsabweichungen zeigt. Der Startbestand muss ausreichend viele Dezimalstellen behalten.

---

## 8. ATH und ATL: Was genau verankert wird

### 8.1 Definition des Marktes

ATH und ATL beziehen sich auf das konkrete Dateninstrument einschließlich Börse, Spot-/Derivatevariante, Quote-Währung und Datenkontext.

Ein später gelistetes Börsensymbol enthält nicht automatisch die gesamte vorherige Geschichte des Vermögenswerts. Keine Preise eines anderen Symbols für den Anker und Volumen des aktuellen Symbols für die Summe verwenden.

Bei Aktien müssen Anpassungen und Sessions, bei Futures Kontrakt-/Rollkontext dokumentiert werden. Diese Fälle sind keine stillschweigende Erweiterung des anfangs geprüften Kryptoprofils.

### 8.2 Drei unterschiedliche Zeitpunkte

Pro Ereignis speichern:

| Feld | Bedeutung |
|---|---|
| `eventTime` | Zeitpunkt der Extremkerze, sofern in dieser Genauigkeit bekannt. |
| `anchorTime` | Beginn der VWAP-Summe. Nach Default 00:00 UTC des Ereignistages. |
| `knownAtTime` | Frühester Zeitpunkt, zu dem der Algorithmus das Ereignis erkennen konnte. |

Bei historischen Tagesdaten ist unter Umständen nur der Extremtag bekannt, nicht die genaue Minute. `eventTimePrecision = DAY` setzen, statt die Tageseröffnung als exakten Extremzeitpunkt auszugeben.

### 8.3 Interpretation von "immer 0 Uhr UTC"

Beispiel: Das relevante ATH wird am 10. eines Monats um 15:37 UTC erreicht. Nach der Annahme dieses Plans beginnt der ATH-VWAP am **10. um 00:00 UTC**. Er enthält damit auch Handel vor 15:37.

Das ist ein **VWAP ab Beginn des ATH-Tages**, nicht derselbe Indikator wie ein an der tatsächlichen ATH-Kerze gestarteter VWAP. Der Tooltip muss diese Definition nennen.

Der Plan darf erst nach einer Benutzerentscheidung auf die exakte Extremkerze umgestellt werden. In dieser Alternative muss zusätzlich die ausreichende Intraday-Historie für den Extremzeitpunkt nachgewiesen werden.

### 8.4 Rekorde fortlaufend und kausal suchen

```text
Wenn currentHigh > bisherigesRecordHigh:
    neues ATH-Ereignis
Wenn currentLow < bisherigesRecordLow:
    neues ATL-Ereignis
```

Gleich hohe beziehungsweise gleich tiefe Preise verankern nach dem gewählten Default nicht neu. Bei mehreren neuen Rekorden am selben UTC-Tag bleibt der Mitternachtsanker gleich, auch wenn der Rekordpreis weiter steigt oder fällt.

Nicht einfach `ta.highest(high, 5000)` als allgemeines ATH bezeichnen. Ein endliches Fenster ist nur ein Höchstwert dieses Fensters. Auch TradingViews Auto-Anchored-Option `Highest High` ist laut Beschreibung eine Suche über eine eingestellte Anzahl von Bars, nicht automatisch über die komplette Symbolgeschichte.[^tv-auto]

### 8.5 Suche und VWAP-Berechnung trennen

**Modul A - Rekordfinder:** Findet bisheriges Hoch/Tief, zugehörigen Tag und Historienbeginn. Für weit zurückliegende Ereignisse kann ein separater Tagesdatenkontext hilfreich sein.

**Modul B - Volumenengine:** Berechnet den VWAP ab diesem Tag auf der festgelegten Intraday-Basis. Modul A liefert keine fehlenden Minuten-PV-Summen.

Ein durch Tagesdaten korrekt gefundener Anker darf bei fehlender Intraday-Historie nicht automatisch zu einem scheinbar vollständigen Intraday-VWAP führen.

### 8.6 Vorgeschlagener Tages-Rekordfinder

Für das anfangs geprüfte 24/7-Profil:

1. Im separaten `1D`-Kontext laufendes Rekordhoch und Rekordtief seit dessen verfügbarem Historienbeginn pflegen.
2. Rekordtag und ersten verfügbaren Tag als Metadaten mitführen.
3. Für intraday-kausale Entscheidungen nur den **bis zum Vortag bestätigten** Rekordbestand übernehmen.
4. Den laufenden UTC-Tag mit den bereits eingetroffenen Intraday-Hochs/Tiefs vergleichen.
5. Keine endgültigen Tageshochs vorzeitig auf den Morgen dieses Tages projizieren.

Tageskerzen müssen zur verwendeten UTC-Tagdefinition passen. Das ist am Symbol zu prüfen, nicht durch die Zeichenfolge `"1D"` allein bewiesen.

Intraday- und Tagesfeeds können Unterschiede haben, auch bei Preis- oder Volumendaten.[^tv-feeds] Bei widersprüchlichen Extremen darf der Algorithmus den Konflikt nicht durch einen undokumentierten Feed-Wechsel verdecken.

### 8.7 Rekordhistorie ist ein eigener Qualitätsnachweis

Speichern:

```text
recordHistoryFirstTime
recordHistoryExpectedStart, falls extern verifiziert
recordHistoryCoverage = VERIFIED_SCOPE | AVAILABLE_HISTORY_ONLY | UNKNOWN
```

Ein nicht verifizierter erster Tagesdatensatz wird nicht automatisch als Listingbeginn ausgegeben. Im ungesicherten Fall darf eine angezeigte Linie nur als Anker der **verfügbaren Historie** gelten, beispielsweise mit `ATH* VWAP` und einem sichtbaren Hinweis. Ohne akzeptierte Kennzeichnung ist sie im strikten Modus auszublenden.

Eine richtige VWAP-Summe ab einem Kandidatentag beweist nicht, dass dieser Tag das echte Allzeithoch des gesamten gewünschten Marktes war.

### 8.8 Historischer Verlauf nach Rekordwechseln

Standard: Historisch wird jeweils der damals bekannte Rekordanker verwendet. Ein neuer Rekord ersetzt den aktiven Anker erst ab seiner Erkennung.

Bei Mitternachtsankern wird der neue aktuelle Wert ab Tagesbeginn berechnet, die früheren historischen Plotwerte werden aber nicht so überschrieben, als wäre der spätere Rekord schon um 00:00 bekannt gewesen.

Ein alter Rekordabschnitt darf im historischen Chart bestehen bleiben. Die Endbeschriftung gehört nur zum aktuell aktiven Anker. Ein Modus, der ausschließlich die heutige ATH-Ankerkurve rückwirkend zeichnet, ist ein separates, nicht kausales Analysefeature und nicht der Standard dieses Plans.

---

## 9. Swing VWAP: klare Erkennung und Bestätigung

### 9.1 Vorgeschlagene Interpretation

Eine aktive Linie vom **jüngsten bestätigten Swing High oder Swing Low**. Für High und Low werden getrennte Kandidaten ermittelt; die gewählte Pivot-Auswahl entscheidet, welcher davon als aktiver Anker infrage kommt.

Standard: Swing-Timeframe 1H, links 3, rechts 3. Es wird keine Behauptung aufgestellt, dass diese Parameter für eine Handelsstrategie optimal seien.

### 9.2 Bestätigte Pivotlogik

`ta.pivothigh` und `ta.pivotlow` im festen Swing-Kontext als Ausgangspunkt verwenden. Die Pivotinformation darf erst nach dem Abschluss der benötigten rechten Kerzen als bestätigt weitergegeben werden.

Die Dokumentation warnt ausdrücklich vor nachträglich auf die Pivotkerze zurückgesetzten Zeichnungen, die einen früheren Wissensstand vortäuschen können.[^tv-repaint]

Ein Muster für die spätere Implementierungsprüfung ist ein **zeitlich versetztes, bestätigtes Ereignispaket** aus dem Swing-Timeframe. Es muss Pivotpreis, Pivotzeit, Bestätigungszeit und einen eindeutigen Ereignisschlüssel enthalten. Nicht allein auf `barstate.isconfirmed` innerhalb eines `request.security()`-Aufrufs vertrauen; dieser Einsatz ist laut Dokumentation nicht funktionsfähig.[^tv-barstates]

### 9.3 Keine Doppelverarbeitung

Ein aus 1H auf 1 Minute übertragener Pivot kann für viele Quellkerzen derselbe sein. Ein Ereignis nur bei neuer `eventId` verarbeiten. Nicht auf jeder Minute erneut den gleichen Swing zurücksetzen.

Prototyp für eine ID:

```text
eventId = Pivotrichtung + Pivotzeit + Bestätigungszeit
```

Auch die tatsächliche Intraday-Ausführung mit Rollback ist zu prüfen. Eine Variable, die ein Live-Ereignis irrtümlich für immer als abgearbeitet markiert, darf nicht die rekonstruierbare Historie zerstören.

### 9.4 Ankerzeit und Summenbeginn

Nach der Mitternachtsannahme:

```text
anchorTime = UTC-Tagesbeginn der Pivotkerze
knownAtTime = Ende der letzten erforderlichen Bestätigungskerze
```

Bei Bestätigung muss die Summe **ab anchorTime** bereitstehen. Die Engine verwendet dazu die gespeicherte Tagesbaseline. Nur ab `knownAtTime` zu summieren wäre ein anderer VWAP und ist nicht erlaubt.

Beispiel: Eine Pivotkerze vom Sonntag wird erst am Montag bestätigt. Der Swing-Anker bleibt Sonntag 00:00 UTC und wird nicht auf Montag verschoben.

### 9.5 Darstellung vor der Bestätigung

Standardmäßig keine sichtbare Swing-Linie vor `knownAtTime`. Der erste angezeigte Wert kann trotzdem die seit Mitternacht gesammelten Beiträge enthalten. Im Tooltip stehen Anker und Bestätigung getrennt.

Eine spätere Option darf den Verlauf nach Bestätigung rückwirkend bis zum Anker zeichnen. Dann muss klar erkennbar sein, dass der Verlauf vor Bestätigung nur eine nachträgliche Illustration ist. Daraus dürfen keine früheren Alarme oder Signale abgeleitet werden.

### 9.6 Auswahl, Gleichstände und Ankerwechsel

- Bei neuem jüngerem bestätigtem Pivot wird der aktive Swing ersetzt, auch wenn er dieselbe Richtung wie der vorherige hat.
- Gleicher Ankertag: Summenbasis bleibt gleich; Richtung, Ereigniszeit und Bestätigung werden trotzdem aktualisiert.
- Werden High und Low für exakt dieselbe Pivotzeit gleichzeitig gemeldet, das bisherige Ereignis beibehalten und den Sonderfall diagnostisch markieren. Nicht je nach Aufrufreihenfolge wechseln.
- Plateau-Verhalten der verwendeten Pine-Pivotfunktionen durch einen gezielten Test festhalten. Keine abweichende Gleichstandsregel unbeabsichtigt dazumischen.

### 9.7 Zwei Swing-Linien als Alternative

Gleichzeitig ein Swing-High- und ein Swing-Low-VWAP sind fachlich eine andere UI-Entscheidung. Nach Freigabe benötigt diese Variante zwei aktive Zustandsobjekte, zwei Labels und unterscheidbare Darstellung. Der einzelne Screenshot-Schalter kann dann beide gemeinsam steuern. Nicht ungefragt als Standard einbauen.

## 10. Architektur: Datenkontexte, Requests und Zeitzuordnung

### 10.1 Logische Module

```text
Inputs und feste Definitionen
        |
        v
Datenkontext / Symbolvalidierung
        |
        +--> Rekordfinder im verifizierten Langzeitkontext
        +--> Bestätigte Swing-Ereignisse im festen Swing-Timeframe
        |
        v
VWAP-Engine im festen Berechnungs-Timeframe
  - UTC-Schlüssel
  - PV-/Volumensummen
  - Tagesbaselines
  - Ankerzustände
  - Startbestände
  - Qualitätsmetadaten
        |
        v
Chart-Adapter: Ergebnis-Snapshots, keine erneute Summierung
        |
        +--> 5 reguläre Plots
        +--> 1 Swing-Zeichenpfad
        +--> Endlabels
        +--> kompakte Datenhinweise
```

Es gibt keine zyklischen Requests. Der Tages-Rekordfinder darf nicht wiederum die gesamte Intraday-VWAP-Engine anfordern.

### 10.2 Konzeptioneller Hauptabruf

```pine
// Architekturfragment, nicht das fertige Skript.
engineResult = request.security(
    requestedSymbol,
    calculationTimeframe,
    f_engine(),
    gaps = barmerge.gaps_off,
    lookahead = barmerge.lookahead_off,
    calc_bars_count = requestedSourceBars
)
```

`f_engine()` muss die gesamte benötigte historische Berechnung in diesem Kontext ausführen. Das Ergebnis enthält Werte und Metadaten, keine unbegrenzt wachsenden Historienarrays.

**Expliziter Prototypauftrag:** Nachweisen, welcher Historienbeginn im Quellkontext tatsächlich erreicht wird, insbesondere wenn der Chart deutlich weniger Kerzen enthält. Falls der konkrete Request-Aufbau diese Historie nicht bereitstellt, muss die Architektur angepasst oder die Einschränkung gemeldet werden. Die gewünschte Request-Menge allein ist kein Test.

### 10.3 Auf größeren Chart-Timeframes

Bei 15-Minuten-Chart und 1-Minuten-Basis wird ein **fertig berechneter** Snapshot aus der Quellengine übernommen. Ein einzelner Rückgabewert pro Chartkerze ist für den VWAP-Endwert ausreichend, wenn die gesamte Summierung bereits im Quellkontext stattgefunden hat.

Nicht nur den letzten Minutenpreis und dessen Volumen abrufen und diese Werte im 15-Minuten-Chart aufsummieren. Dabei würden die anderen Minuten fehlen.

`request.security_lower_tf()` wird gebraucht, wenn die aufrufende Ebene tatsächlich alle Intrabar-Werte selbst auswerten oder zeichnen soll. Leere Arrays müssen dann erkannt werden; für nicht abgedeckte Chartbereiche sind sie ein regulärer Datenfall.[^tv-ltf]

Für diese V1 ist ein skalare Werte liefernder Rechenkontext vorzuziehen. Ein alternativ auf Arrays basierender Aufbau muss denselben Numerik- und Historiennachweis erbringen.

### 10.4 Gleicher oder kleinerer Chart-Timeframe

Bei Chart-Timeframe gleich Berechnungs-Timeframe dieselbe fachliche Engine und dieselbe Historienpolitik nutzen. Eine rein lokale Abkürzung darf nicht unbemerkt zu kürzerer Vorgeschichte führen.

Liegt der Chart unterhalb der eingestellten Berechnungsbasis, beispielsweise 1 Minute bei 15-Minuten-Basis, wird keine zusätzliche Genauigkeit behauptet. Der dargestellte historische Verlauf kann grober abgestuft sein. Im Standard-Abnahmeset wird `Chart-Timeframe >= Berechnungs-Timeframe` geprüft; kleinere Charts erhalten zunächst eine verständliche Warnung oder werden erst nach gesondertem Test freigegeben.

Sekunden-, Tick- und synthetische Charts sind kein verbindlicher V1-Support.

### 10.5 Historische HTF-Ereignisse ohne Zukunftsdaten

Für bestätigte Werte aus einem höheren Timeframe ist ein korrekt um eine Quellkerze verschobenes Ereignispaket mit entsprechender Lookahead-Zuordnung möglich. Dieses Muster gilt nur für den passenden höheren Kontext und darf nicht pauschal auf LTF-Requests übertragen werden.[^tv-mtf]

Verbindliche Regeln:

- `lookahead_on` ohne passende zeitliche Verschiebung darf keine späteren Tages- oder Swingwerte in frühere Quellkerzen eintragen.
- Der Zeitpunkt `knownAtTime` wird aus dem Quellereignis abgeleitet, nicht nachträglich aus dem aktuellen Chart.
- Der aktuelle Tageshöchstwert im Laufe eines Tages und dessen endgültiger historischer Tageswert sind nicht derselbe Wissensstand.
- Die Code-KI soll einen Zeitdiagramm-Test mit einem späten Tagesrekord und einem spät bestätigten Pivot dokumentieren.

### 10.6 Verschachtelte Requests

Eine Intraday-Engine kann feste Tages- und Swing-Kontexte benötigen. Falls Requests verschachtelt werden, Symbol und Timeframe explizit angeben. Keine leeren Timeframe-Strings verwenden, deren geerbter Kontext unabsichtlich wechselt.

Das Verhalten dynamischer und verschachtelter Requests ist im aktuellen Pine-v6-Kontext zu prüfen.[^tv-nested] Insbesondere muss gezeigt werden, dass ein Swing-Ereignis im 1-Minuten-Rechenkontext gleich ankommt, egal ob die Ausgabe auf 5 Minuten, 15 Minuten oder 4 Stunden liegt.

### 10.7 Sampling ist nicht gleich Berechnung

Auf einem 4H-Chart können nur entsprechend wenige reguläre Plotpunkte pro Tag erscheinen. Das ist eine grobere Darstellung derselben Berechnung, keine Erlaubnis, statt Minutenvolumen plötzlich 4H-HLC3 zu verwenden.

Timeframe-Vergleiche erfolgen an gemeinsamen, abgeschlossenen Quellzeitpunkten. Unterschiedliche historische Chartkerzen können verschiedene Endzeitpunkte darstellen; deren Werte müssen nicht gleich sein.

### 10.8 Keine veralteten Kalenderwerte als neue Periode ausgeben

Durch `gaps_off` weitergeführte Pakete behalten ihre eigenen Zeit- und Ankermetadaten. Ein alter Daily-Wert vom Vortag darf nach einem Tageswechsel nicht unter dem neuen Datum weiterlaufen.

Der Adapter muss zwischen aktuellem Quellsample und weitergetragenem letzten Wert unterscheiden. Als zeitlicher Bezug dient der tatsächliche Quell-/Auswertungszeitpunkt, auf großen Chartkerzen nicht einfach deren Eröffnungszeit. Im Replay gilt der Replay-Endpunkt, nicht die reale Uhrzeit des Computers.

---

## 11. Datenmodell und Qualitätsanzeige

### 11.1 Ergebnis pro VWAP-Typ

Ein eigenes Zustands-/Ergebnisobjekt je Typ vorsehen. Pine-UDTs oder bewusst gebündelte Rückgaben verwenden; keine gigantische unstrukturierte Parameterliste.

```text
VwapResult
  id
  value
  anchorTime
  eventTime
  eventTimePrecision
  knownAtTime
  anchorGeneration
  sourceBarOpenTime
  lastCompletedSourceCloseTime
  firstIncludedSourceTime
  sourceHistoryFirstTime
  calculationTimeframe
  priceSource
  calculationMode
  volumeCoverage
  recordHistoryCoverage
  isLiveSourceBar
  isStale
  reasonCode
```

`anchorGeneration` ändert sich, wenn eine logisch neue Ankerlinie entsteht. Sie ist nicht allein aus der Farbe oder dem Zahlenwert abzuleiten. Bei einem neuen Swing auf demselben Mitternachtsanker kann die Ereignisidentität wechseln, ohne dass ein anderer Summenbeginn entsteht; beides getrennt halten.

### 11.2 Qualitätsdimensionen nicht in einem einzigen Boolean verstecken

| Dimension | Beispielwerte |
|---|---|
| Berechnungsbasis | `INTRADAY_FIXED`, `DAILY_DEFINED` |
| Volumenabdeckung | `FROM_ANCHOR_AVAILABLE`, `SEEDED`, `MISSING_PREFIX`, `INVALID_CONTRIBUTION`, `NO_POSITIVE_VOLUME` |
| Ankersicherheit | `CALENDAR`, `CONFIRMED_PIVOT`, `VERIFIED_RECORD_SCOPE`, `AVAILABLE_RECORD_HISTORY_ONLY` |
| Aktualität | `LIVE`, `SOURCE_BAR_CLOSED`, `STALE` |

Ein VWAP kann beispielsweise ab Anker vollständig aufsummiert sein und trotzdem einen nur aus begrenzter Rekordhistorie abgeleiteten ATH-Kandidaten haben. Ein anderer kann einen gut verifizierten ATH-Anker besitzen, aber mangels alter Minutenvolumina nicht berechenbar sein.

### 11.3 Standardreaktionen

| Befund | Linie im strikten Modus | Hinweis |
|---|---|---|
| Anker und verfügbare Beiträge ausreichend | Anzeigen | Im Normalfall kein Warnfeld. |
| Anker liegt vor Quellhistorie, kein passender Startbestand | Nicht anzeigen | "ATH: Minutenhistorie beginnt erst am ..." |
| Gültiger Startbestand | Anzeigen | Kennzeichnung in Tooltip/Details: "Mit historischem Startbestand". |
| Fehlendes oder ungültiges Volumen seit Anker | Nicht als vollständig anzeigen | Grund und erste bekannte Fehlerstelle. |
| Noch kein bestätigter Swing | Nicht anzeigen | "Noch kein bestätigter Swing" in Details. |
| ATH/ATL nur aus verfügbarer Rekordhistorie | Nur klar gekennzeichnet oder ausblenden | Umfang der Rekordsuche nennen. |
| Ausdrücklich aktivierte Tagesbasis | Anzeigen | `1D`/`Tagesbasis` sichtbar, nicht als Minutenpräzision. |
| Veralteter Snapshot | Kein scheinbar aktueller Standardwert | Alter Datenstand sichtbar machen. |

### 11.4 Form der Hinweise

Standardmäßig ein kleines Feld nur bei aktiven Einschränkungen. Keine vollständige Tabelle permanent in den Chart stellen.

Beispiele:

```text
ATH nicht berechenbar: Anker vor 1m-Historie.
ATL*: Rekordsuche nur ab <Datum> verifiziert/verfügbar.
ATH: Tagesbasis, nicht identisch mit 1m-VWAP.
```

Bei ausgeschaltetem VWAP keine lästige Warnung nur für dessen inaktive Darstellung erzeugen. Die Rechnung darf intern trotzdem für Konsistenz weiterlaufen.

Das Abschalten der Textlabels darf eine wesentliche Datenwarnung nicht gleichzeitig unsichtbar machen. Ein grober Näherungsmodus ohne irgendeine erkennbare Kennzeichnung ist unzulässig.

### 11.5 Begrenzung der Verifikation

Die Software kann mitgeteilte Summen auf Konsistenz prüfen, aber nicht allein aus deren Zahl garantieren, dass ein externer Datenexport fehlerfrei war. Ebenso beweist ein lückenlos wirkender Feed nicht, dass jede reale Transaktion enthalten ist. Die Statusbegriffe müssen diesen Unterschied erhalten.

---

## 12. Historischer Startbestand: alte ATH-/ATL-Anker korrekt fortschreiben

### 12.1 Zweck

Liegt ein ATH- oder ATL-Anker vor der verfügbaren Minutenhistorie, kann der fehlende vordere Teil durch zwei geprüfte Summen ersetzt werden. Ein einzelner alter VWAP-Preis reicht nicht aus, weil dessen Gewicht fehlt.

Erforderlich für einen Stichtag `s`:

```text
seedPV = Summe(P_i * V_i) im Intervall [anchorTime, s)
seedV  = Summe(V_i)       im Intervall [anchorTime, s)
```

Dann gilt für den späteren Zeitpunkt `t`:

```text
VWAP(t) = (seedPV + Summe(P_i * V_i) in [s, t])
          / (seedV + Summe(V_i) in [s, t])
```

Die rechte Teilstrecke muss auf derselben festen Berechnungsbasis vollständig verfügbar sein. Das ist eine exakte Zerlegung der definierten Summe bis auf numerische Rundung, kein mathematischer Näherungstrick.

### 12.2 Datenvertrag pro Startbestand

```text
enabled
symbolIdentifier
marketOrFeedContext
calculationTimeframe
priceSource
volumeUnitDescription
anchorTimeUtc
seedUntilExclusiveUtc
seedPV
seedV
provenanceNote
```

`seedUntilExclusiveUtc` liegt exakt an einer Quellkerzengrenze. Für einfache Bedienung vorzugsweise einen UTC-Tagesbeginn verwenden. Die Kerze mit Beginn genau an diesem Zeitpunkt ist **nicht** im Seed enthalten; sie wird von Pine addiert.

### 12.3 Validierung

Ein Startbestand ist nur verwendbar, wenn:

- Symbol, Markt-/Feedkontext, Quelle und Berechnungsintervall übereinstimmen.
- Der aktive Anker exakt zum Seed-Anker passt.
- Der Stichtag nicht vor dem Anker liegt.
- Die Quellhistorie spätestens am Stichtag beginnt und ab dort ausreichend abgedeckt ist.
- `seedV` gültig und nicht negativ ist; bei positivem Volumen auch `seedPV` gültig ist.
- Der Beobachtungszeitpunkt nicht vor dem Stichtag liegt.

Eine PV-Summe darf bei gültigen negativen Preisen negativ sein; nicht pauschal nur positive `seedPV` akzeptieren. Ein Volumenbestand von null ist nur mit einem entsprechend begründeten leeren/volumenlosen Vorintervall zulässig.

### 12.4 Keine Lücke und keine Doppelzählung

```text
Seed:       [Anker -------------------- Stichtag)
Pine:                                  [Stichtag ---------------- Jetzt]
```

Ein Stichtag, der bereits vor dem tatsächlichen Quellhistorienbeginn liegt, hinterlässt eine Lücke. Ein Seed, der die Stichtagskerze einschließt, während Pine sie nochmals addiert, zählt doppelt. Beides muss einen Validierungsfehler erzeugen.

### 12.5 Verhalten bei neuen Rekorden

Bei einem neuen Rekord mit neuem Ankertag wird der alte ATH-/ATL-Seed nicht weiterverwendet. Der neue Anker liegt normalerweise in der neueren Quellhistorie und kann ohne alten Startbestand berechnet werden.

Bei einem weiteren Rekord am selben Ankertag darf der passende Bestand nur weiterverwendet werden, wenn seine Definition weiterhin passt und sein Stichtag zeitlich zulässig ist.

Die Sicherheit des Rekordankers wird separat geprüft. Historische Volumensummen alleine beweisen keinen Allzeitrekord.

### 12.6 Historische Bars und Replay

Ein Startbestand bis zum 1. September darf nicht auf einen August-Bar angewendet werden. Für `t < seedUntilExclusiveUtc` ist dieser Seed als Datenquelle nicht verfügbar; der Indikator muss dort aus eigenen Daten rechnen oder eine fehlende Abdeckung anzeigen.

Ein Startbestand rekonstruiert **den aktuellen und späteren Wert**, aber nicht automatisch die komplette Kurve vor seinem Stichtag. Dafür wären frühere passende Zwischenbestände oder die eigentlichen Quelldaten erforderlich.

### 12.7 Herkunft und Pflege

Die Erstellung historischer Summen kann in einem separaten, kontrollierten Datenexport-/Berechnungsschritt erfolgen. Sie ist kein Beweis, dass TradingView exakt denselben Feed liefert. Bei abweichenden OHLCV-Daten muss das Ergebnis als eigene Datenbasis beschrieben oder der Bestand verworfen werden.

V1 liest solche Summen nur über explizite Inputs beziehungsweise geprüfte Konfiguration. Keine API-Schlüssel im Skript, keine erfundenen HTTP-Funktionen. `request.seed()` ist kein pauschaler Ersatz für einen beliebigen Import; neue Pine-Seeds-Repositories sind laut aktueller Dokumentation derzeit nicht frei neu anlegbar.[^tv-seeds]

Nach Symbolwechsel, Quellenwechsel, Änderung des Berechnungsintervalls oder nachträglichen Feedkorrekturen ist eine erneute Prüfung erforderlich. Der Status darf dabei nicht stumm auf "vollständig" stehen bleiben.

### 12.8 Verbindlicher Seed-Test

Vollständige Referenzfolge:

```text
P = [100, 110, 90]
V = [10,  30, 20]
PV gesamt = 6.100
V gesamt  = 60
VWAP      = 101,6666666667
```

Seed nach den ersten zwei Kerzen:

```text
seedPV = 4.300
seedV  = 40
neuer Beitrag = 90 * 20 = 1.800
Ergebnis = (4.300 + 1.800) / (40 + 20)
```

Beide Wege müssen innerhalb der definierten Numeriktoleranz dasselbe liefern. Danach den Test mit einem bewusst falschen Stichtag, falschem Symbol und falscher Quelle wiederholen; diese Fälle müssen abgewiesen werden.

---

## 13. Option nach Freigabe: ATH/ATL konsequent auf Tagesbasis

### 13.1 Warum diese Alternative existiert

Ein separater Tageskontext kann für alte Rekorde einen wesentlich längeren Kalenderzeitraum abdecken. Damit ist ein historischer ATH-/ATL-VWAP auf kleinen Chartintervallen praktischer darstellbar, wenn der Nutzer bewusst die Tageskerzen-Definition akzeptiert.

Das ist kein Ersatz für fehlende Intraday-Genauigkeit. Der Nutzer entscheidet über eine andere Berechnungsbasis, nicht bloss über eine Optimierung.

### 13.2 Genaue Definition

```text
DailyDefinedAVWAP = Summe(HLC3_D * V_D seit Ankertag)
                   / Summe(V_D seit Ankertag)
```

Quelle kann entsprechend der Inputs angepasst werden, wird aber dann auf Tages-OHLC berechnet. Die Definition gilt über den gesamten Ankerzeitraum. Keine laufende automatische Umschaltung zwischen 1D und 1m.

### 13.3 Anzeige auf Intraday-Charts

Historisch stehen nur die entsprechend bekannten Tagesresultate zur Verfügung. Ein stufenweiser Verlauf ist zulässig. Keine lineare Zwischeninterpolation als tatsächlich berechnete Intraday-Historie verkaufen.

Ein Live-Wert kann den aktuellen, noch offenen Tagesbeitrag verwenden. Dieser verändert sich mit Tageshoch, Tagestief, Schlusskurs und Volumen. Der nach einem Reload sichtbare historische Verlauf kann deshalb anders aussehen als die zuvor beobachtete Live-Kurve. Das muss im Modus beschrieben werden.

Den endgültigen Tageswert niemals rückwirkend auf alle Morgenkerzen desselben Tages kopieren.

### 13.4 Kennzeichnung

Labelbeispiele:

```text
ATH VWAP <Datum> [1D]
ATL VWAP <Datum> [1D]
```

Tooltip: "Berechnung auf Tageskerzen. Nicht identisch mit dem VWAP einer feineren Intraday-Basis."

Auch dieser Modus benötigt passende UTC-Tagesgrenzen, ausreichende Historie, gültiges Volumen und eine gesonderte Rekordprüfung. Er darf keine unbegrenzte historische Abdeckung versprechen.

### 13.5 Keine unbemerkte Hybridvariante

Eine Kombination aus alten Tagesbeiträgen und neueren Minutenbeiträgen wäre eine weitere Methode. Sie kann bei anderer Zielsetzung untersucht werden, ist aber weder der strikte Intraday-Modus noch der konsequente Tagesmodus. Nicht in V1 einbauen.

---

## 14. Style-Tab und Linienverhalten

### 14.1 Fünf reguläre Plots

Reihenfolge und feste Titel:

```text
Daily VWAP
Weekly VWAP
Monthly VWAP
ATH VWAP
ATL VWAP
```

Die Titel von `plot()` sind fest; dynamische Daten gehören in die Textlabels. Fünf echte Plots verwenden, damit die gewünschten Style-Einträge existieren.[^tv-plots]

### 14.2 Standarddarstellung

| Plot | Vorgeschlagene Breite | Linienart |
|---|---:|---|
| Daily VWAP | 2 | Durchgezogen |
| Weekly VWAP | 2 | Gestrichelt |
| Monthly VWAP | 2 | Gestrichelt |
| ATH VWAP | 2 | Gestrichelt |
| ATL VWAP | 2 | Gestrichelt |

Die Linienarten orientieren sich am Style-Screenshot. Der Benutzer kann sie dort anpassen.

Aktuelles Pine v6 unterstützt bei Linienplots `linestyle` mit `plot.linestyle_solid`, `plot.linestyle_dashed` und `plot.linestyle_dotted`. Deshalb keine aufwendigen Zeichenobjektketten nur für gestrichelte Standard-VWAPs bauen.[^tv-plots]

### 14.3 Farben in Inputs, Geometrie in Style

Die Inputs sind die zentrale Farbquelle für Linie und Endlabel. Berechnete Plotfarben können die automatischen Farbauswahlen im Style-Dialog beeinflussen.[^tv-colors]

Zu testendes Muster, das die gewählte Transparenz erhalten soll:

```pine
plotColor = color.new(userColor, color.t(userColor))
```

Dieses UI-Verhalten ist mit einem kleinen Prototyp in der aktuellen TradingView-Version zu prüfen. Falls eine alternative Implementierung erforderlich ist, die Abweichung dokumentieren. Nicht pauschal `editable = false` setzen und dadurch die gewünschte Style-Bedienung verlieren.

### 14.4 Sichtbarkeitsgrenze zwischen Plot und Label

Der Input-Schalter steuert Plot und Label gemeinsam. Die Style-Checkbox wirkt dagegen auf den Plot. Ein separat gezeichnetes Label kann seinen Zustand nicht einfach aus der manuellen Style-Sichtbarkeit ableiten.

Daher muss die Hilfe klar sagen: Zum vollständigen Ausblenden einschließlich Label den **Inputs-Schalter** benutzen. Keine nicht existierende Rückkopplung zwischen Style-UI und eigenen Labelobjekten versprechen.

### 14.5 Warum Swing keinen sechsten regulären Style-Eintrag benötigt

Der Screenshot zeigt nur fünf Style-Zeilen, während die Swing-Breite in Inputs steht. Vorgeschlagene Umsetzung: Swing als begrenzter Zeichenpfad, Farbe und Breite ausschließlich über Inputs.

Die genaue Originalimplementierung lässt sich aus dem Screenshot nicht beweisen. Diese Architektur ist eine bewusste Umsetzung des sichtbaren Bedienkonzepts.

### 14.6 Fehlende Werte, Reset-Grenzen und hohe Chart-Timeframes

Datenlücken nicht mit einer Linie überbrücken; `plot.style_linebr` oder eine nachweislich gleichwertige Segmentierung verwenden.

Bei einem neuen Anker soll keine irreführende Diagonale vom alten zum neuen VWAP entstehen. Die grafische Segmentierung kann über eine gezielt ausgeblendete Übergangsstrecke erfolgen. **Numerischen Wert und Ankerdatum nicht verändern**, nur weil eine Verbindung unterbrochen werden soll.

Ein einfaches `na` auf dem ersten grafischen Sample ist als dokumentierter Fallback zulässig, kann aber genau diesen ersten sichtbaren Punkt entfernen. Diese Folge im Render-Prototyp prüfen; das aktuelle Label zeigt weiterhin den richtigen Wert.

Wenn jede Chartkerze bereits eine ganze Ankerperiode umfasst oder übersteigt, kann innerhalb dieser Kerze kein vollständiger regulärer Periodenverlauf dargestellt werden. Beispielsweise ist ein Daily-VWAP auf einem Wochenchart nur als zeitlich abgetasteter Referenzwert sichtbar.

Für diesen Fall eine kurze aktuelle Referenzlinie plus Endlabel vorsehen, wenn andernfalls alle Segmente unsichtbar wären. Die Referenzlinie ist nur eine Darstellung des aktuellen Werts und kein behaupteter historischer Verlauf. Keine zusätzlichen benötigten Style-Zeilen erzeugen.

---

## 15. Labels: Position, Datum und Zoomverhalten

### 15.1 Gewünschte Geometrie

Das Label soll rechts neben dem echten Linienendpunkt stehen. Seine Preisposition entspricht dem VWAP-Wert. Der Text soll nicht je nach Länge um den Anker zentriert werden.

Vorgeschlagener Ausgangspunkt:

```text
x = letzter dargestellter Chartpunkt der aktiven Linie
    + zusätzlicher Abstand in Chartkerzen, Standard 0
y = aktueller VWAP-Wert
xloc = xloc.bar_index
yloc = yloc.price
style = label.style_label_left
background = transparent
textalign = links
textcolor = zugehörige Input-Farbe
```

Pine-Labels sind über Barindex/Zeit und Preis positioniert; ein allgemeiner, vom Skript frei steuerbarer horizontaler Pixelabstand zum Plot ist in dieser Schnittstelle nicht vorgesehen.[^tv-labels]

### 15.2 Warum Standardabstand null ist

Ein Abstand von beispielsweise fünf Kerzen wird beim horizontalen Zoomen sichtbar breiter oder schmaler. Der Default verwendet deshalb denselben x-Anker wie das Linienende. Der kleine optische Abstand soll aus dem nativen Textlayout des Labels entstehen.

Das ist eine Gestaltungsidee auf Basis des Labelankers, **keine dokumentierte Zusicherung eines exakt konstanten Pixelabstands**. Sie muss in TradingView getestet werden, auch mit langen Datumslabels.

Keine Leerzeichenketten als Ersatz für eine geometrische Positionierung. Keine künstliche Verlängerung der VWAP-Kurve, nur um einen Textabstand zu erzeugen.

### 15.3 Mindesttest für den nativen Abstand

Vor der kompletten GUI eine einzelne Linie und ein transparentes `label.style_label_left` auf demselben Endpunkt zeichnen. Prüfen:

- Liegt der Text tatsächlich rechts vom Anker?
- Verändert sich die Lücke bei horizontalem Zoom sichtbar?
- Verschiebt ein längerer Text den Beginn des Labels oder nur dessen rechtes Ende?
- Bleibt die Zuordnung bei vertikalem Zoom und logarithmischer Skala erhalten?
- Bleibt der Text bei üblicher rechter Chartreserve lesbar?

Als Produktziel kann bei festem Browserzoom eine Schwankung des gemessenen Abstands von höchstens etwa zwei Bildschirmpixeln verwendet werden. Das ist eine zu prüfende Abnahmevorgabe, keine behauptete Plattformgarantie. Bei Verfehlung konkrete Screenshots und eine Alternative vorlegen.

### 15.4 Manueller Abstand und möglicher Fallback

Der zusätzliche Kerzenabstand bleibt eine bewusste Komfortoption. Bei Werten größer null akzeptiert der Nutzer den Zoom-Effekt.

Eine Berechnung relativ zum sichtbaren Zeitbereich wäre nur eine Näherung, weil aus Zeitspanne allein keine genaue Pixelgeometrie folgt. Sie gehört nicht in V1, solange der native Endpunktansatz ausreichend funktioniert.

Eine feste Tabelle am rechten Rand ersetzt kein an die Linie gebundenes Label. Sie ist deshalb keine gleichwertige Standardlösung für diese Anforderung.

### 15.5 Datum und Tooltip

UTC-Formatierung konzeptionell:

```pine
anchorDateText = str.format_time(anchorTime, "dd.MM.yyyy", "UTC+0")
```

`anchorTime` verwenden, nicht Chartstart, Skriptstart, aktuellen Monat oder Pivot-Bestätigungszeit.

Der Tooltip enthält bei Bedarf:

```text
Typ: Swing High VWAP
Anker: <Datum> 00:00 UTC
Pivot: <bekannter Zeitpunkt oder Tag mit Genauigkeitsangabe>
Bestätigt: <Zeitpunkt>
Basis: 1m, HLC3
Symbol: <Börse:Symbol>
Datenstatus: <Status>
Letzte abgeschlossene Quellkerze: <Zeitpunkt>
```

Im normalen Label bleibt es bei Name und optionalem Ankerdatum. Preise, Prozentabstand und lange Metadaten sind keine ungefragten Standardzusatztexte.

### 15.6 Label-Lebenszyklus

Maximal ein aktives Endlabel je angezeigter Linie. Bestehende Objekte mit `label.set_*()` aktualisieren. Bei Deaktivierung oder ungültigem Wert entfernen oder sicher wiederverwendbar verwalten. Keine neue Labelhistorie auf jeder Kerze aufbauen.

Labels werden nur am aktuellen Daten-/Replay-Endpunkt aktualisiert. Nach links geschobene historische Chartansichten sollen nicht heimlich einen neuen Berechnungsanker erzeugen.

### 15.7 Überlappungen

In V1 y-Werte nicht stillschweigend verschieben. Treffen zwei VWAPs fast zusammen, können sich Labels überlagern. Das wird als bekannte Darstellungsgrenze dokumentiert und später mit eindeutig zugeordneten Verbindungslinien oder gruppierten Texten gelöst.

Auch die separaten EMA- und VWAP-Skripte können nicht ohne gemeinsame Architektur automatisch die individuellen Zeichenobjekte des jeweils anderen Skripts koordinieren. Ein gemeinsamer Kollisionsmanager wäre ein späterer Integrationsschritt, nicht nur ein lokaler Labelparameter.

---

## 16. Live-Verhalten, Rollback und Repainting

### 16.1 Laufende Quellkerze

HLC3 und Volumen der offenen Quellkerze verändern sich. Damit kann auch ein korrekt berechneter aktueller VWAP schwanken. Nach Quellkerzenschluss ist dieser Beitrag unter unveränderten Feed-Daten fest.

Der Indikator wird deshalb im Standard nicht pauschal als "non-repainting" bezeichnet. Bestätigte Pivotanker verhindern nicht jede Veränderung eines laufenden VWAP-Werts.

### 16.2 Volumen nicht pro Tick erneut voll addieren

Die laufende Kerze liefert ein bislang aufgelaufenes Volumen, nicht automatisch nur die Differenz zum vorigen Skriptaufruf. Die Umsetzung muss Pine-Rollback und Commit korrekt verwenden.[^tv-execution]

Verbotenes Muster:

```text
Bei jedem Tick mit persistentem Intrabar-Zustand:
    sumV += komplettes bisheriges Kerzenvolumen
```

Damit würde dasselbe Volumen mehrfach berücksichtigt. Stattdessen den vorläufigen Kerzenbeitrag aus dem letzten bestätigten Zustand neu bilden oder nachweislich korrekt mit Deltas arbeiten. Kein `varip`-Einsatz ohne dokumentierten Grund und Replay-/Reload-Test.

### 16.3 Anker-Repainting und Wert-Aktualisierung unterscheiden

| Vorgang | Einordnung |
|---|---|
| Offene Quellkerze verändert aktuellen VWAP | Gewollte Live-Aktualisierung. |
| Neuer bestätigter Swing ersetzt den alten | Definierter Ereigniswechsel. |
| Ein Pivot wird schon vor Abschluss rechter Kerzen als bestätigt gezeigt | Fehler. |
| Endgültiger Tagesrekord erscheint historisch schon am Morgen | Zukunftsdatenfehler. |
| Linie wird nach Bestätigung bewusst in die Vergangenheit gezeichnet | Rückwirkende Analysezeichnung, gesondert kennzeichnen. |
| Historischer Feed wird vom Anbieter korrigiert | Externe Datenrevision, nicht durch Logik vollständig vermeidbar. |

### 16.4 Optionaler Modus nur für abgeschlossene Quellkerzen

Ein späterer Modus darf nur abgeschlossene Quellkerzen verarbeiten. Dann dürfen aber nicht alle Charts pauschal eine ganze Chartkerze verzögert werden. Maßgeblich ist die **Quellkerze**, nicht die Dauer der Chartkerze.

Für V1 ist eine stabile Pivot-Bestätigung verpflichtend; ein zusätzlicher globaler Bestätigt-Modus für jeden VWAP-Wert ist optional.

---

## 17. Rendering und Performance

### 17.1 Keine Historie aus dem sichtbaren Fenster ableiten

Zoomen oder Verschieben darf niemals Anker oder Summen verändern. Sichtbarkeitsinformationen sind höchstens für die Darstellung zuständig. Die Engine benötigt eine feste Datenbasis, unabhängig von `chart.left_visible_bar_time` oder ähnlichen Viewportinformationen.

### 17.2 Fünf Plots statt tausender Linienobjekte

Die regulären VWAPs werden als Plots ausgegeben. Nicht jeden historischen Abschnitt mit einem neuen `line.new()`-Objekt zeichnen. Das spart Objektverwaltung und erhält die gewünschte Style-Oberfläche.

### 17.3 Swing-Pfad

Vorgeschlagene Umsetzung:

- Begrenzter Punktpuffer für den aktiven Swing, mit echten Zeit-/Preis-Koordinaten.
- Ein geradlinig verbindender `polyline`-Pfad für abgeschlossene Darstellungspunkte.
- Optional ein einzelnes `line`-Objekt für den laufenden Endabschnitt.
- Neuaufbau des Polylinienpfads nur bei geänderter Punktmenge oder neuem Anker; keine unkontrollierte Rekonstruktion auf jedem Tick.

Polylinien besitzen keinen entsprechenden Setter-Satz wie einzelne Linien; zur Änderung wird der alte Pfad entfernt und ein neuer erzeugt.[^tv-lines] Keine weiche Kurveninterpolation verwenden, die Zwischenpreise außerhalb der tatsächlichen VWAP-Stützpunkte suggeriert.

Beim Aufbau historischer Daten Punkte sammeln, aber nicht auf jeder historischen Kerze erneut den kompletten Pfad zeichnen. Rendering bevorzugt am letzten relevanten Chartbar.

### 17.4 Begrenzung der Zeichnung ist keine Begrenzung der Summe

Vorgeschlagene Produktgrenze: höchstens 8.000 Darstellungspunkte für den aktiven Swing, bei Bedarf weniger nach Profiling. Wird der Anfang des Zeichenpuffers entfernt, müssen Ankerdatum und VWAP-Akkumulator unverändert bleiben.

Ein alter Swing kann daher einen korrekten aktuellen Wert haben, obwohl nicht mehr sein gesamter grafischer Verlauf gezeichnet wird. Das ist eine Darstellungsbegrenzung und darf nicht zu einem falschen Neuanker führen.

### 17.5 Ressourcenbudget

Zielgrößen für V1:

| Ressource | Ziel |
|---|---|
| Reguläre Plots | Genau 5 sichtbare Style-Einträge. |
| Endlabels | Maximal 6 im Ein-Swing-Modus. |
| Hinweisfeld | Maximal 1 kompakte Tabelle. |
| Swing-Pfade | Wenige begrenzte Polylinien/Endsegmente. |
| Request-Kontexte | Wenige feste Kontexte, deutlich unter dem Plattformlimit. |
| Berechnung je Quellbar | Im Wesentlichen konstante Arbeit; keine komplette Rückwärtssuche je Bar. |

Objekt-, Request-, Tuple- und Laufzeitgrenzen sind bei der Umsetzung erneut gegen die aktuelle Dokumentation zu prüfen.[^tv-limits] `max_bars_back` vergrößert einen Historienpuffer, erzeugt aber keine fehlenden Marktdaten.

### 17.6 Modulare Funktionen

Empfohlene Verantwortlichkeiten, Namen sind nicht verbindlich:

```text
f_utcDayStart()
f_utcWeekStart()
f_utcMonthStart()
f_selectPrice()
f_validateSourceBar()
f_recordSnapshot()
f_confirmedSwingEvent()
f_validateSeed()
f_engine()
f_canDisplayValue()
f_formatLabel()
f_updateEndLabel()
f_updateSwingDrawing()
f_updateDataNotice()
```

Zeichenobjekte nur im Chart-Renderer erzeugen, nicht im angeforderten Rechenkontext. Kontexte werden über skalare Metadaten/geeignete Datenobjekte gekoppelt, nicht über vermeintlich gemeinsam veränderbare globale Variablen.

---

## 18. Unterstützte Charts, Symbole und Sonderfälle

### 18.1 Verbindliches erstes Abnahmeset

Reguläre zeitbasierte Kerzencharts mit ausreichendem Volumenfeed. Erste Referenztests auf mindestens zwei klar bezeichneten 24/7-Kryptosymbolen, darunter nach Möglichkeit je ein Spot- und ein Derivateinstrument. Beide bleiben strikt getrennte Datensätze.

Chartintervalle bei 1-Minuten-Basis: 1m, 3m, 5m, 15m, 30m, 1H, 4H und 1D. Wochen-/Monatscharts zusätzlich als Referenz-Sampling testen, nicht als vollständige Intraday-Pfaddarstellung.

### 18.2 Andere Märkte

Bei Aktien, Futures und Forex Kalendergrenzen weiterhin UTC-basiert halten, aber Session, Volumentyp und native Tageskerzen gesondert prüfen. Nicht vorhandenes echtes Handelsvolumen wird nicht durch eine künstliche Volumengewichtung ersetzt.

Wenn der Feed Tickvolumen statt einer anderen Handelsvolumeneinheit liefert, muss diese verwendete Basis erkennbar bleiben. Unterschiedliche Volumenbegriffe nicht gleichsetzen.

### 18.3 Synthetische und nicht zeitbasierte Charts

Heikin Ashi, Renko, Range, Kagi, Point & Figure, Line Break und Tick-Charts werden für V1 nicht als vollständig unterstützt zugesagt. Synthetische Preisreihen können von Standard-OHLC abweichen.[^tv-nonstandard]

Eine spätere Unterstützung muss klar zwischen Standarddatenberechnung und synthetischer Anzeige unterscheiden. Eine manuelle Ablehnung mit verständlichem Hinweis ist besser als ein unbemerkt anders berechneter VWAP.

### 18.4 Gleichzeitige Perioden und identische Werte

Am Montag, dem 1. eines Monats, können Daily, Weekly und Monthly zunächst denselben Anker und damit denselben Wert haben. Das ist kein Fehler. Nicht automatisch eine Linie deaktivieren oder verschieben.

Ebenso können ATH- und Swing-Anker auf denselben UTC-Tag fallen. Gleiche Werte sind zulässig; Labels können dadurch überlappen.

---

## 19. Implementierungsphasen und Abbruchkriterien

### Phase 0 - Technische Machbarkeit vor der vollständigen UI

**P0-A: Label-Prototyp.** Ein Plot und ein transparentes Endlabel. Zoom, Textlänge und rechte Chartreserve testen.

**P0-B: Festbasis-Prototyp.** Ein Weekly VWAP auf fester 1-Minuten-Basis; Ausgabe auf 5m, 15m, 1H und 4H. Historienbeginn und Summen kontrollieren. Keine ATH-/Swing-Komplexität hinzufügen, bevor dieser Test stimmt.

**P0-C: Alter Anker.** Einen manuellen Anker außerhalb der Chart-, aber innerhalb der tatsächlichen Quellhistorie prüfen. Danach absichtlich vor die Quellhistorie verschieben: Jetzt muss `MISSING_PREFIX` statt eines scheinbar plausiblen Zahlenwerts erscheinen.

**P0-D: Seed-Brücke.** Dieselbe Referenzhistorie mit und ohne historischen Startbestand rechnen. Gleichheit nach dem Stichtag und Sperre vor dem Stichtag nachweisen.

**P0-E: Ereignisse und Zeitzuordnung.** Bestätigten 1H-Pivot und Tages-Rekordbestand in den festen Quellkontext übertragen. Keine Mehrfachverarbeitung, keine Zukunftsdaten, gleiche Ereigniszeiten auf unterschiedlichen Charts.

**P0-F: Style-Prototyp.** Fünf echte Plot-Einträge, Farbauswahl in Inputs, native gestrichelte Linien und separat kontrollierbarer Swing-Pfad.

**Abbruch-/Rückfragekriterium:** Wenn der gewünschte historische Umfang mit dem konkreten Symbol/Konto nicht erreichbar ist, die betroffene Variante nicht als fertig melden. Datenbasis, Startbestand oder expliziter Tagesmodus müssen zuerst entschieden werden. Die restlichen unabhängigen Module können weiterentwickelt werden.

### Phase 1 - Kalender-VWAPs

UTC-Funktionen, Preis-/Volumenlogik, Daily/Weekly/Monthly, Beginn-der-Historie-Status und Live-Summierung implementieren. Periodenwechseltests bestehen lassen.

### Phase 2 - Gemeinsame Darstellung

Inputs, Style, Farben, Endlabels, Datum und Hinweisfeld integrieren. Rendering weiterhin von der Rechenengine trennen.

### Phase 3 - ATH/ATL

Rekordfinder, Umfangsmetadaten, Ereignistag, Mitternachtsbaseline, neue Rekorde und Startbestände implementieren. Insbesondere alten ATL und Anker vor der Intraday-Historie testen.

### Phase 4 - Swing

Bestätigte Ereignispakete, Auswahllogik, Summierung ab Mitternacht und aktiven Zeichenpfad implementieren. Keine unbestätigten Pivots verwenden.

### Phase 5 - Cross-Timeframe, Replay und Performance

Werte an gemeinsamen Quellabschlüssen vergleichen, Reload-/Replayverhalten prüfen, Ressourcennutzung profilieren. Fehler mit Datenzeitpunkt, Basis, Anker und Status reproduzierbar protokollieren.

### Phase 6 - Abnahme und Dokumentation

Endgültige Defaults und offene Entscheidungen dokumentieren. Erst jetzt das Skript als fertige V1 bezeichnen. Optionale Erweiterungen bleiben außerhalb der Auslieferung, solange sie nicht separat freigegeben wurden.

---

## 20. Detaillierter Testplan

### 20.1 Numerische Referenz

Eine kleine unabhängige Referenzimplementierung verwendet dieselben OHLCV-Daten und dieselben UTC-Anker. Sie darf außerhalb von Pine beispielsweise in Python ausgeführt werden; die ausgelieferte Anzeige bleibt ein Pine-Indikator.

Abnahmetoleranz vor Testbeginn festlegen, beispielsweise für identische abgeschlossene Inputdaten:

```text
absoluteError <= max(1e-8, abs(referenceValue) * 1e-10)
```

Das ist ein vorgeschlagenes numerisches Ziel, keine universelle Garantie für jeden Datenfeed. Falls sehr große Summen eine andere Toleranz benötigen, dies begründen. Die Schwelle nicht nachträglich vergrößern, um einen Methoden- oder Ankerfehler zu verstecken.

Vergleich mit einem eingebauten TradingView-VWAP nur bei identischer Preisquelle, Datenbasis, Ankerzeit und Session. Ein beliebiger nativer VWAP auf dem 15-Minuten-Chart ist keine korrekte 1-Minuten-Referenz.

### 20.2 UTC- und Ankertests

| ID | Fall | Erwartung |
|---|---|---|
| T01 | UTC-Tag 23:59 nach 00:00 | Daily startet neue Summe. |
| T02 | Sonntag nach Montag 00:00 | Weekly startet neu; Montagsschlüssel korrekt. |
| T03 | Monatsletzter nach Monatserstem | Monthly startet neu. |
| T04 | Montag, 01.06.2026 | Daily, Weekly und Monthly wechseln unabhängig gleichzeitig. |
| T05 | Jahreswechsel | Wochenanker bleibt der tatsächlich zugehörige Montag, auch im Vorjahr. |
| T06 | Februar im Schaltjahr | Monatsgrenze und Tagesabstand korrekt. |
| T07 | Chartzeitzone UTC, Wien, New York | Identische Anker und Werte. |
| T08 | Sommer-/Winterzeitwechsel lokaler Anzeige | Keine Verschiebung der UTC-Anker. |
| T09 | Fehlende Mitternachtskerze | Periodenschlüssel wird beim nächsten Sample erkannt; Abdeckung gesondert bewertet. |
| T10 | Quellkerze überquert UTC-Grenze | Kein geschätztes Aufteilen; klarer Hinweis oder kleinere Basis. |
| T11 | Start der geladenen Daten mitten im Monat | Monthly nicht fälschlich als vollständig anzeigen. |

### 20.3 Numerik und Volumen

| ID | Fall | Erwartung |
|---|---|---|
| T12 | Zwei-Kerzen-Beispiel aus Abschnitt 2 | 107,5 statt 106,6666667. |
| T13 | Einzelne Nullvolumenkerze | Vorhandener Wert unverändert. |
| T14 | Gesamtes Intervall Volumen null | `na` und erklärter Zustand. |
| T15 | `na`-Volumen nach gültigem Anker | Keine stillschweigende Heilung durch nächste Kerze. |
| T16 | Positives Volumen mit fehlendem Preis | Fehlerstatus für den betroffenen Anker. |
| T17 | Mehrere Live-Updates derselben Quellkerze | Kein mehrfach gezähltes Gesamtvolumen. |
| T18 | Sehr große/kleine Zahlen | Numeriktoleranz und keine unnötige Rundung. |
| T19 | Preisquelle wechseln | Erwartet geänderte Werte, alle Seeds neu validieren. |
| T20 | Berechnungsbasis wechseln | Methodenänderung sichtbar; kein falscher Gleichheitstest. |

### 20.4 ATH, ATL, Historie und Startbestände

| ID | Fall | Erwartung |
|---|---|---|
| T21 | ATH außerhalb Chart-, aber innerhalb Quellhistorie | Korrekter Wert und ursprüngliches Ankerdatum. |
| T22 | ATH vor Quellhistorie, ohne Seed | Kein scheinbar vollständiger Wert. |
| T23 | Alter ATL nahe Symbolbeginn | Separate Prüfung von Rekord- und Volumenhistorie. |
| T24 | Tagesfinder kennt Anker, Minuten fehlen | Keine Umdeutung der Tagesdaten in Minutenpräzision. |
| T25 | Neuer Rekord am Nachmittag | Neuer VWAP ab 00:00 des Tages, Aktivierung nicht rückwirkend vor Erkennung. |
| T26 | Mehrere Rekorde am selben Tag | Mitternachtsanker bleibt gleich. |
| T27 | Exakt gleicher Rekordpreis an späterem Tag | Nach Default kein Neuanker. |
| T28 | Seed und vollständige Referenz | Gleiche Werte nach Stichtag innerhalb Toleranz. |
| T29 | Seed mit Stichtagskerze doppelt eingeschlossen | Fehler wird erkannt beziehungsweise Test schlägt korrekt fehl. |
| T30 | Seed-Stichtag vor Quellhistorienbeginn | Lücke wird gemeldet. |
| T31 | Seed passt nicht zu Symbol/Quelle/Intervall/Anker | Seed wird nicht verwendet. |
| T32 | Replay vor Seed-Stichtag | Keine Verwendung zukünftiger Summen. |
| T33 | Neuer Ankertag bei vorhandenem altem Seed | Alter Seed wird nicht mitgenommen. |
| T34 | Mehr Rekordhistorie geladen | Geänderter Kandidat/Status nachvollziehbar, keine unveränderte Allzeitgarantie. |

### 20.5 Swing und Zeitzuordnung

| ID | Fall | Erwartung |
|---|---|---|
| T35 | Pivot noch nicht bestätigt | Keine aktive neue Swing-Linie. |
| T36 | Abschluss letzter rechter Pivotkerze | Genau ein neues Ereignis. |
| T37 | Gleiches HTF-Ereignis auf vielen Minutenbars | Kein wiederholtes Zurücksetzen. |
| T38 | Pivot vor Mitternacht, Bestätigung danach | Ankertag der Pivotkerze, nicht der Bestätigung. |
| T39 | Neues Swing High auf demselben Ankertag | Metadaten aktualisiert, Summe korrekt. |
| T40 | Gleichzeitiger High-/Low-Pivot derselben Zeit | Dokumentierte Konfliktregel, kein zufälliger Wechsel. |
| T41 | Unterschiedliche Chart-Timeframes | Gleicher bestätigter Pivot und Anker bei gleichem Datenstand. |
| T42 | Swing älter als Zeichenpuffer | Aktueller Wert bleibt korrekt; nur Grafik gekürzt. |

### 20.6 UI, Zoom und Ausführung

| ID | Fall | Erwartung |
|---|---|---|
| T43 | Jeden Input-Schalter einzeln toggeln | Linie und zugehöriges Label gemeinsam betroffen. |
| T44 | Beide Label-Schalter getrennt toggeln | Reguläre und Swing-Labels unabhängig. |
| T45 | Farbe/Transparenz ändern | Linie und Label stimmen mit Input überein. |
| T46 | Style-Checkbox aus | Nur Plotsteuerung; bekannte Label-Einschränkung dokumentiert. |
| T47 | Label mit/ohne Datum und verschiedenen Textlängen | Linker Textbeginn am gleichen nativen Anker. |
| T48 | Horizontaler Zoom weit/normal/nah | Abstandtest aus Abschnitt 15 bestanden oder konkrete Abweichung dokumentiert. |
| T49 | Vertikaler Zoom, lineare/logarithmische Skala | Label bleibt am richtigen VWAP-Preis. |
| T50 | Kleine Chartbreite, andere Browser-Skalierung | Kein falscher Rechenwert; Layoutgrenzen erkennbar. |
| T51 | 1m/5m/15m/1H/4H an gemeinsamen Quellabschlüssen | Identische Festbasis-Werte bei identischem Anker und Datenbestand. |
| T52 | Daily auf 1D/1W | Kein vorgespiegelter Intraday-Verlauf; korrekter aktueller Referenzwert. |
| T53 | Scrollen/Zoomen/mehr Historie | Sichtfenster ändert nicht die fachliche Definition. |
| T54 | Reload nach Live-Phase | Unterschiede analysiert: offen vs. geschlossen, Feedrevision oder Fehler. |
| T55 | Alle Linien aus | Keine verwaisten Labels oder nur für ausgeblendete Typen erzeugten Warnungen. |
| T56 | Langer Lauf mit vielen Swingwechseln | Objektzahl und Speicher bleiben begrenzt. |
| T57 | Option Tagesbasis aktiv | Sichtbare Basiskennzeichnung, kein Minutenpräzisionsversprechen. |
| T58 | Fehlende LTF-Arrays / abgeschnittener Request | Lokalisierter Datenstatus statt Absturz oder Nullpreis. |

### 20.7 Referenzprotokoll

Bei numerischen Abweichungen immer festhalten:

```text
Symbol und Datenkontext
Chart-Timeframe
Berechnungs-Timeframe und Preisquelle
Ankerzeit, Ereigniszeit, Bestätigungszeit
Gemeinsamer Auswertungszeitpunkt
Quellhistorienbeginn
PV-Summe und Volumensumme
Seed-Metadaten, falls vorhanden
Live-/Closed-Zustand
Erwarteter und tatsächlicher Wert
```

Nicht nur einen Screenshot mit "Linie sieht anders aus" als Fehlernachweis verwenden.

---

## 21. Typische Fehlumsetzungen, die ausdrücklich verboten sind

| Fehlumsetzung | Warum sie hier falsch ist |
|---|---|
| `ta.vwap()` ohne passende Ankerdefinition für alle Typen | Erzeugt nicht automatisch UTC-Weekly, UTC-Monthly und Ereignisanker. |
| Alle VWAPs lokal aus Chartkerzen summieren | Basis und Historie wechseln mit dem Chart. |
| Tages-HLC3 als Rekonstruktion alter Minuten-PV-Beiträge | Mathematisch nicht äquivalent. |
| Sichtbares Hoch als ATH verwenden | Sichtbares Fenster ist keine Allzeitgeschichte. |
| Ersten geladenen Bar als Monats-/ATH-Anker setzen | Versteckt eine fehlende Vorgeschichte. |
| `max_bars_back` als Datenbeschaffung ansehen | Ein Puffer erzeugt keine fehlenden Kursdaten. |
| Nur die letzte Minute jedes Chartbars aufsummieren | Verliert die übrigen Minutenbeiträge. |
| Gleiche Tages-PV-Summe auf jeder 15-Minuten-Kerze addieren | Zählt denselben Tagesbeitrag mehrfach. |
| Neuer Swing: Summe ab Bestätigung starten | Verfehlt den verlangten historischen Anker. |
| Pivot vor Bestätigung zeichnen | Täuscht einen früheren Wissensstand vor. |
| Endgültigen Tagesrekord auf den Morgen mappen | Zukunftsdatenleck. |
| `lookahead_off` als vollständige Non-Repaint-Garantie bezeichnen | Offene Quellwerte und andere Ursachen bleiben. |
| Datumslabel aus `timenow` statt Ankerzeit | Falsches Datum auf Historie und im Replay. |
| Fehlendes Volumen pauschal mit `nz(volume, 0)` kaschieren | Macht aus unbekannten Beiträgen scheinbar gültige Nullbeiträge. |
| Seeds ohne exklusiven Stichtag | Lücken oder Doppelzählung. |
| Labelabstand in Kerzen als pixelstabil beschreiben | Die sichtbare Kerzenbreite ändert sich beim Zoom. |
| Labels nach Style-Abschaltung sicher synchron behaupten | Eigene Zeichenobjekte sind nicht die Plot-Checkbox. |
| Zeichenpuffer kürzen und dabei VWAP neu starten | Ändert die Rechnung wegen eines Darstellungsbudgets. |
| Fälschlich erfundene HTTP-/Datei-APIs in Pine | Nicht durch die offizielle Pine-Schnittstelle gedeckt. |

---

## 22. Lieferumfang und Definition of Done

Die ausführende KI liefert nach Implementierung:

1. Vollständiges, kommentiertes Pine-v6-Skript ohne Platzhalter im freigegebenen Kernumfang.
2. Kurze Nutzungsanleitung mit Basis, UTC-Ankern, Label-/Style-Verhalten und Datenhinweisen.
3. Testprotokoll für die kritischen UTC-, Historien-, Seed-, Pivot- und Timeframe-Tests.
4. Liste tatsächlich verbleibender Einschränkungen und aller vom Benutzer gewählten Abweichungen von den Defaults.

### Abnahmefragen

- Ist die für ATH/ATL gewählte Berechnungsbasis eindeutig und überall sichtbar dokumentiert?
- Wird ein alter Anker außerhalb der Quellhistorie ohne Ersatzbestand korrekt als unvollständig behandelt?
- Sind alle drei Kalenderanker wirklich UTC-basiert?
- Bedeutet das angezeigte Datum den Rechenanker und nicht den Erkennungszeitpunkt?
- Liefert dieselbe feste Datenbasis dieselben abgeschlossenen Werte auf verschiedenen Charts?
- Entsprechen Inputs und die fünf Style-Einträge dem gewünschten Konzept?
- Wurde das Label-Zoomverhalten tatsächlich im TradingView-Renderer geprüft?
- Werden keine Datenqualitätswarnungen durch das reine Ausschalten von Labels versteckt?
- Ist klar getrennt, was programmiert, was kompiliert und was live getestet wurde?

Ohne TradingView-Compilerzugriff darf die Code-KI nicht behaupten, das Skript sei dort erfolgreich kompiliert oder getestet worden. Ein plausibler Codeentwurf und ein bestandener Pine-Test sind unterschiedliche Lieferstände.

---

## 23. Sinnvolle Erweiterungen, separat freizugeben

### 23.1 Meine Priorität: manuell verankerter VWAP

Ein oder zwei frei wählbare Ankerzeiten wären eine zweckmäßige Ergänzung. Damit lassen sich eigene Ereignisse untersuchen, ohne die automatische ATH-/Swing-Erkennung umzudeuten.

Wichtig: Ein frei gewählter Zeitpunkt löst keine fehlende Historie. Dieselbe Festbasis-, Volumen- und Abdeckungsprüfung muss auch hier gelten. Manuell verankerter VWAP und historischer Startbestand sind unterschiedliche Funktionen.

### 23.2 Zweite Swing-Linie

Parallel letzter bestätigter Swing High und letzter bestätigter Swing Low. Das kann beide Referenzlinien sichtbar halten, ohne ständiges Umschalten. Nur nach Freigabe, weil es aus der gewünschten einzelnen Swing-Reihe zwei Linien und zwei Endlabels macht.

### 23.3 Schlusswerte der Vorperiode als kurze Levels

Optional abgeschlossenen Weekly- und Monthly-VWAP der Vorperiode als kurzen horizontalen Strich behalten. Bezeichnung beispielsweise `Prev. Weekly VWAP`.

Diese Levels sind eingefrorene **Schlusswerte**, keine weitergerechneten alten Anker-VWAPs. Genau diese Unterscheidung muss im Namen und Tooltip stehen.

### 23.4 Label-Kollisionen verbessern

Nahe Werte können eine gemeinsame Beschriftung oder gezielt versetzte Texte mit kurzen Verbindungslinien erhalten. Der echte VWAP-Preis bleibt unverändert.

Dies ist auch für den EMA-Indikator sinnvoll. Zwischen zwei separaten Skripten ist dafür jedoch keine automatische globale Koordination vorauszusetzen. Zunächst dieselben Regeln je Skript verwenden; eine gemeinsame Suite nur als gesondertes Integrationsprojekt planen.

### 23.5 Preis und Abstand im Label

Optional Preis und prozentualen Abstand des aktuellen Kurses zum VWAP ergänzen:

```text
Monthly VWAP <Datum> | <Preis> | <Abstand in Prozent>
```

Vorzeichen und Nenner eindeutig definieren, etwa `(close - vwap) / abs(vwap) * 100`, und den Sonderfall `vwap == 0` abfangen. Keine Prozentangabe für ungültige oder veraltete Referenzwerte.

### 23.6 Alarme

Kreuzung, Berührung oder Annäherung erst nach fertiger Rechen- und Ankerlogik hinzufügen. Alarme nur für zulässige Datenzustände. Festlegen, ob Chartkerzen- oder Quellkerzenabschluss entscheidend ist.

Eine Berührung mit Toleranz ist etwas anderes als ein Schlusskurskreuzen. Kein unbegründetes Kauf-/Verkaufssignal aus einem Kontakt ableiten.

### 23.7 Standardabweichungsbänder

Möglich, aber nicht erste Priorität. Sie benötigen eine eigene Definition und zusätzliche Momente beziehungsweise Gewichte. Für historische Startbestände reichen PV und Volumen dann nicht mehr zwingend aus; beispielsweise kann auch eine passend berechnete Summe von `P^2 * V` erforderlich werden.

Bänder deshalb nicht ungefragt an die bestehende Seed-Schnittstelle anhängen.

### 23.8 Gemeinsame Designregeln mit dem EMA-Indikator

Einheitliche Schriftgrößen, gleiche Endpunktverankerung, dieselbe Input-/Style-Bedienregel und konsistente Hinweisgestaltung sind sinnvoll. Zusätzliche Handelslogik oder eine erzwungene Zusammenlegung sind dafür nicht notwendig.

**Empfohlene Reihenfolge:** Erst korrekte UTC-Berechnung und nachgewiesene Historienabdeckung; danach manuelle Anker und bessere Label-Lesbarkeit. Zusätzliche Signale und Bänder erst später.

---

## 24. Entscheidungsblatt für die endgültige Freigabe

| Entscheidung | Vorgabe dieses Dokuments | Status |
|---|---|---|
| Normale Datenbasis | 1 Minute, HLC3, unabhängig vom Chart. | Vorgeschlagen. |
| Lange ATH-/ATL-Historie | Strikt; bei Bedarf passende historische Summen. | Mit Nutzer abgleichen. |
| Tagesbasis-Alternative | Nur nach ausdrücklicher Wahl, mit Kennzeichnung. | Nicht automatisch freigegeben. |
| ATH-/ATL-Ankerzeit | 00:00 UTC am Extremtag. | Aus "immer 0 Uhr UTC" abgeleitete Annahme. |
| Swing-Ankerzeit | 00:00 UTC am Pivottag. | Mit Nutzer abgleichen. |
| Swing-Linien | Eine, jüngstes bestätigtes Hoch oder Tief. | Mit Nutzer abgleichen. |
| Swing-Erkennung | 1H, 3 links / 3 rechts. | Vorgeschlagener Ausgangspunkt. |
| Datum im Label | Standardmäßig eingeschaltet. | Vorgeschlagen. |
| Startsichtbarkeit | Daily/ATH/ATL aus; Weekly/Monthly/Swing ein. | Am Screenshot orientiert. |
| Marktprofil | Zuerst geprüfte 24/7-Symbole. | Konkrete Symbole und Kontolimits bei Implementierung festlegen. |

Die Antworten auf diese Punkte werden in einer Version 1.1 eingetragen. Die Code-KI kann vorher die unabhängigen Prototypen und den eindeutig definierten Kalender-/Darstellungskern umsetzen, darf aber widersprüchliche Interpretationen nicht als bestätigte Benutzerwünsche behandeln.

---

## 25. Offizielle Quellen und Verifikationshinweise

Die Quellen dokumentieren Plattformfunktionen und Grenzen. Die konkrete Engine, die Seed-Schnittstelle, die Qualitätszustände und die Defaultentscheidungen sind **eigene Entwurfsentscheidungen dieses Plans**. Eine Quellenangabe bedeutet nicht, dass TradingView die gesamte hier entworfene Architektur als fertiges Muster getestet hat.

Alle folgenden Quellen wurden für diesen Plan am 18. September 2026 konsultiert. Bei der späteren Implementierung insbesondere APIs und Kontolimits erneut prüfen.

[^tv-vwap]: TradingView Help Center, **Volume Weighted Average Price (VWAP)**. Definition und Standardquelle. `https://www.tradingview.com/support/solutions/43000502018-volume-weighted-average-price-vwap/`

[^tv-time]: TradingView Pine Script v6, **Time**. Zeitstempel, explizite Zeitzonen und Kalenderfunktionen. `https://www.tradingview.com/pine-script-docs/concepts/time/`

[^tv-mtf]: TradingView Pine Script v6, **Other timeframes and data**. Berechnungen in Datenkontexten, Zeitzuordnung und Lookahead. `https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/`

[^tv-mtf-faq]: TradingView Pine Script v6 FAQ, **Other data and timeframes**. Berechnung innerhalb eines niedrigeren Request-Kontexts versus Auswertung von Intrabar-Arrays. `https://www.tradingview.com/pine-script-docs/faq/other-data-and-timeframes/`

[^tv-ltf]: TradingView Pine Script v6, **Other timeframes and data**, Abschnitt `request.security_lower_tf()`. Intrabar-Arrays und fehlende historische Abdeckung. `https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/#requestsecurity_lower_tf`

[^tv-feeds]: TradingView Pine Script v6, **Other timeframes and data**, Abschnitt **Data feeds**. Unterschiede zwischen Intraday-, EOD- und Live-Daten. `https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/#data-feeds`

[^tv-nested]: TradingView Pine Script v6, **Other timeframes and data**, Abschnitte **Dynamic requests** und **Nested requests**. `https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/`

[^tv-seeds]: TradingView Pine Script v6, **Other timeframes and data**, Abschnitt `request.seed()`. Bestehende Pine-Seeds-Datenfeeds und derzeitige Einschränkung neuer Repositories. `https://www.tradingview.com/pine-script-docs/concepts/other-timeframes-and-data/#requestseed`

[^tv-limits]: TradingView Pine Script v6, **Limitations**. Intrabar-, Request-, Objekt-, Tuple- und Laufzeitgrenzen. `https://www.tradingview.com/pine-script-docs/writing/limitations/`

[^tv-auto]: TradingView Help Center, **VWAP Auto Anchored**. Bedeutung von `Highest High` und `Lowest Low` innerhalb der eingestellten Länge. `https://www.tradingview.com/support/solutions/43000652199-vwap-auto-anchored/`

[^tv-repaint]: TradingView Pine Script v6, **Repainting**, insbesondere **Plotting in the past**. Bestätigungszeit versus rückwirkende Pivotzeichnung. `https://www.tradingview.com/pine-script-docs/concepts/repainting/`

[^tv-barstates]: TradingView Pine Script v6, **Bar states**. Grenzen von `barstate.isconfirmed` in Requests. `https://www.tradingview.com/pine-script-docs/concepts/bar-states/`

[^tv-execution]: TradingView Pine Script v6, **Execution model**. Historische Ausführung, Echtzeitupdates, Rollback und Commit. `https://www.tradingview.com/pine-script-docs/language/execution-model/`

[^tv-inputs]: TradingView Pine Script v6, **Inputs**. Gruppen, Inline-Anordnung, Tooltips und Eingabetypen. `https://www.tradingview.com/pine-script-docs/concepts/inputs/`

[^tv-plots]: TradingView Pine Script v6, **Plots**. Plotdarstellung, feste Titel, `style`, `linestyle` und editierbare Eigenschaften. `https://www.tradingview.com/pine-script-docs/visuals/plots/`

[^tv-colors]: TradingView Pine Script v6, **Colors**. Automatische Style-Farbwähler und berechnete Farben. `https://www.tradingview.com/pine-script-docs/visuals/colors/`

[^tv-labels]: TradingView Pine Script v6, **Text and shapes**. Labelkoordinaten, Stile, Formatierung und Objektverwaltung. `https://www.tradingview.com/pine-script-docs/visuals/text-and-shapes/`

[^tv-lines]: TradingView Pine Script v6, **Lines and boxes**. Linien, Polylinien und Zeichenobjektverwaltung. `https://www.tradingview.com/pine-script-docs/visuals/lines-and-boxes/`

[^tv-nonstandard]: TradingView Pine Script v6, **Non-standard charts data**. Abweichende Preisreihen bei nicht standardmäßigen Chartarten. `https://www.tradingview.com/pine-script-docs/concepts/non-standard-charts-data/`
