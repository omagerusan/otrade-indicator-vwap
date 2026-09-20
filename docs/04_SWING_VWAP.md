# Anpassung Swing VWAP – Zwei unabhängige Swing-VWAPs auf 15-Minuten-Basis

## Zweck dieses Dokuments

Dieses Dokument beschreibt die gewünschte Anpassung des bestehenden Pine-Script-VWAP-Indikators.

Wichtig: Es sollen **zwei Swing VWAPs gleichzeitig** angezeigt werden:

1. **Swing High VWAP** – vom relevanten Swing High oberhalb des aktuellen Preises.
2. **Swing Low VWAP** – vom relevanten Swing Low unterhalb des aktuellen Preises.

Beide VWAPs müssen unabhängig voneinander berechnet und gezeichnet werden.

Die bisherige Annahme, dass nur ein einzelner aktiver Swing VWAP angezeigt werden soll, ist falsch und darf nicht übernommen werden.

---

# 1. Zielbild

Der Indikator soll gleichzeitig zwei strukturelle Swing-VWAPs darstellen.

Konzeptionell:

```text
             Swing High
                 ▲
                 │
          ╲      │
           ╲─────┼──────── Swing High VWAP
                  \
                   \       aktueller Preis
                    ●
                   /
          ────────┼──────── Swing Low VWAP
                 │
                 ▼
             Swing Low
```

Anforderungen:

- Swing High VWAP und Swing Low VWAP sind gleichzeitig sichtbar.
- Beide besitzen jeweils einen eigenen Anker.
- Beide Anker befinden sich auf tatsächlichen 15-Minuten-Kerzen.
- Der High-VWAP läuft vom Swing High bis zur aktuellen Kerze.
- Der Low-VWAP läuft vom Swing Low bis zur aktuellen Kerze.
- Ein neuer Swing High darf den Swing Low nicht verändern.
- Ein neuer Swing Low darf den Swing High nicht verändern.

---

# 2. Swing-Basis: 50 × 15-Minuten-Kerzen

Als Ausgangsbasis sollen die letzten **50 Kerzen des 15-Minuten-Timeframes** verwendet werden.

Das entspricht:

```text
50 × 15 Minuten = 12 Stunden 30 Minuten
```

Die 50 Kerzen bestimmen dabei den **Suchbereich für die Swing-Anker**.

Wichtig:

> Die 50 Kerzen sind nicht einfach eine 50-Perioden-VWAP-Berechnung.

Stattdessen:

```text
50 letzte 15m Bars
◄─────────────────────────────────────────►

       Swing High
           ▲
           │
           └────────────── High VWAP ──────────────►

                    Swing Low
                        ▼
                        └──── Low VWAP ────────────►
```

Innerhalb dieses Bereichs sollen relevante Swing Highs und Swing Lows bestimmt werden.

---

# 3. Zwei vollständig getrennte Swing-VWAPs

Die bestehende Architektur mit getrennten High-/Low-Werten ist grundsätzlich richtig und soll beibehalten werden.

Vorhandene Konzepte wie:

```pine
shVal
slVal
```

sowie:

```pine
polySh
polySl
```

und:

```pine
lblSh
lblSl
```

sollen nicht zu einem einzigen Swing-VWAP zusammengeführt werden.

Stattdessen bleiben bestehen:

```text
Swing High VWAP
Swing Low VWAP
```

Beide werden unabhängig berechnet, aktualisiert und dargestellt.

---

# 4. Fehler in der bisherigen Pivot-Erkennung

Die bisherige Logik enthält sinngemäß:

```pine
float ph = ta.pivothigh(high, pivotLeft, pivotRight)
float pl = ta.pivotlow(low, pivotLeft, pivotRight)

bool fireH = not na(ph[pivotRight])
bool fireL = not na(pl[pivotRight])
```

und später:

```pine
int pt = time[pivotRight]
highPrice := ph[pivotRight]
```

bzw. entsprechend beim Pivot Low.

Das ist problematisch, weil `ta.pivothigh()` bzw. `ta.pivotlow()` den bestätigten Pivot bereits auf der Bestätigungskerze liefern.

Die eigentliche Pivotkerze liegt `pivotRight` Kerzen zurück.

Der korrekte Grundaufbau lautet:

```pine
float ph = ta.pivothigh(high, pivotLeft, pivotRight)
float pl = ta.pivotlow(low, pivotLeft, pivotRight)

bool fireH = not na(ph)
bool fireL = not na(pl)
```

Bei bestätigtem High:

```pine
int highPivotTime = time[pivotRight]
float highPivotPrice = ph
```

Bei bestätigtem Low:

```pine
int lowPivotTime = time[pivotRight]
float lowPivotPrice = pl
```

Die zusätzliche Verwendung von:

```pine
ph[pivotRight]
pl[pivotRight]
```

soll entfernt werden.

---

# 5. Swing-Timeframe fest auf 15 Minuten setzen

Die Swing-Struktur soll unabhängig vom aktuell gewählten Chart-Timeframe immer auf 15-Minuten-Daten beruhen.

Empfohlene Definition:

```pine
const string SWING_TF = "15"
```

Der bisherige frei wählbare Swing-Timeframe:

```text
60
240
D
```

soll für diese Swing-Logik entfernt werden.

Die Swing-VWAPs sollen auf:

```text
15m Chart
1H Chart
4H Chart
Daily Chart
```

immer dieselben Swing-Anker verwenden.

---

# 6. Inputs für die Swing-Erkennung

Empfohlene Inputs:

```pine
const string SWING_TF = "15"

int swingLookback = input.int(
    50,
    "Swing Lookback",
    minval = 10,
    maxval = 200,
    group = GRP_SWING,
    tooltip = "Anzahl der 15-Minuten-Kerzen, innerhalb derer Swing High und Swing Low gesucht werden.",
    display = display.none
)

int pivotLeft = input.int(
    3,
    "Pivot links",
    minval = 1,
    maxval = 10,
    group = GRP_SWING,
    display = display.none
)

int pivotRight = input.int(
    3,
    "Pivot rechts",
    minval = 1,
    maxval = 10,
    group = GRP_SWING,
    display = display.none
)
```

Startwerte:

```text
Swing Lookback = 50
Pivot links    = 3
Pivot rechts   = 3
```

---

# 7. Relevanten High- und Low-Anker innerhalb der 50 Kerzen bestimmen

Die Swing-Erkennung soll nicht einfach den zuletzt bestätigten Pivot verwenden.

Stattdessen:

## Swing High

Innerhalb der letzten 50 15m-Kerzen:

1. alle bestätigten Pivot Highs berücksichtigen,
2. davon das höchste Pivot High bestimmen,
3. dieses als Swing-High-Anker verwenden.

Konzeptionell:

```text
alle bestätigten Pivot Highs
             ↓
      höchstes davon
             ↓
   Swing High VWAP Anchor
```

## Swing Low

Innerhalb der letzten 50 15m-Kerzen:

1. alle bestätigten Pivot Lows berücksichtigen,
2. davon das tiefste Pivot Low bestimmen,
3. dieses als Swing-Low-Anker verwenden.

Konzeptionell:

```text
alle bestätigten Pivot Lows
             ↓
      tiefstes davon
             ↓
    Swing Low VWAP Anchor
```

---

# 8. Lage der Swing-Anker relativ zum aktuellen Preis

Zusätzlich soll geprüft werden:

Für das Swing High:

```text
Swing High Preis > aktueller Preis
```

Für das Swing Low:

```text
Swing Low Preis < aktueller Preis
```

Damit soll vermieden werden, dass ein unpassender Anker auf der falschen Seite des aktuellen Preises verwendet wird.

Wichtig:

> Diese Regel betrifft nur die Auswahl des Ankers.

Der VWAP selbst darf den aktuellen Preis später theoretisch kreuzen.

Der VWAP darf nicht künstlich oberhalb oder unterhalb des Preises gehalten werden.

---

# 9. Vorgeschlagene neue `f_swingPack()`-Logik

Konzeptionelles Beispiel:

```pine
f_swingPack() =>
    float ph = ta.pivothigh(
        high,
        pivotLeft,
        pivotRight
    )

    float pl = ta.pivotlow(
        low,
        pivotLeft,
        pivotRight
    )

    int searchLength =
        math.max(
            1,
            swingLookback - pivotRight
        )

    int highConfirmOffset =
        ta.highestbars(
            ph,
            searchLength
        )

    int lowConfirmOffset =
        ta.lowestbars(
            pl,
            searchLength
        )

    bool haveHigh =
        not na(highConfirmOffset) and
        not na(ph[highConfirmOffset])

    bool haveLow =
        not na(lowConfirmOffset) and
        not na(pl[lowConfirmOffset])

    int highPivotOffset =
        haveHigh
        ? highConfirmOffset + pivotRight
        : na

    int lowPivotOffset =
        haveLow
        ? lowConfirmOffset + pivotRight
        : na

    float highPrice =
        haveHigh
        ? ph[highConfirmOffset]
        : na

    float lowPrice =
        haveLow
        ? pl[lowConfirmOffset]
        : na

    int highPivotTime =
        haveHigh
        ? time[highPivotOffset]
        : na

    int lowPivotTime =
        haveLow
        ? time[lowPivotOffset]
        : na

    int highKnownAt =
        haveHigh
        ? time_close[highConfirmOffset]
        : na

    int lowKnownAt =
        haveLow
        ? time_close[lowConfirmOffset]
        : na

    bool validHigh =
        haveHigh and
        highPrice > close

    bool validLow =
        haveLow and
        lowPrice < close

    [
        validHigh ? highPivotTime : na,
        validHigh ? highKnownAt : na,
        validHigh ? highPrice : na,

        validLow ? lowPivotTime : na,
        validLow ? lowKnownAt : na,
        validLow ? lowPrice : na
    ]
```

Dieses Beispiel ist als Architekturvorgabe zu verstehen und muss vor Übernahme in den finalen Code kompiliert und getestet werden.

---

# 10. Swing-Daten mit festem 15m-Request abrufen

Die Swing-Erkennung soll unabhängig von `calcTf` auf 15 Minuten laufen.

Konzeptionell:

```pine
[
    hPt,
    hKn,
    hPx,
    lPt,
    lKn,
    lPx
] = request.security(
    syminfo.tickerid,
    "15",
    f_swingPack(),
    barmerge.gaps_off,
    barmerge.lookahead_off
)
```

Der normale Berechnungs-Timeframe des restlichen VWAP-Indikators darf die Swing-Struktur nicht verändern.

---

# 11. Wichtigstes Darstellungsproblem: Die Linie beginnt aktuell zu spät

Im bestehenden Script werden Punkte für die Swing-Polyline erst ab dem Zeitpunkt gesammelt, an dem der Pivot erkannt bzw. übernommen wurde.

Sinngemäß:

```pine
array.push(times, time)
array.push(vals, px)
```

Bei einem Pivot mit drei rechten Bestätigungskerzen entsteht dadurch z. B.:

```text
15:00    Pivot High
15:15
15:30
15:45    Pivot wird bestätigt
```

Falsch wäre:

```text
15:00      15:15      15:30      15:45
                                     ●──────
                                     ↑
                              Linie beginnt hier
```

Gewünscht ist:

```text
15:00      15:15      15:30      15:45
  ●─────────●──────────●──────────●
  ↑
Anchor
```

Die Linie darf erst bei 15:45 bekannt werden, muss dann aber rückwirkend korrekt von der tatsächlichen Pivotkerze 15:00 gezeichnet werden.

---

# 12. VWAP muss ab der tatsächlichen Ankerkerze rekonstruiert werden

Für den Swing High VWAP:

```text
Swing High Anchor
        ↓
PV = 0
V  = 0

jede 15m-Kerze
vom High bis jetzt:
    PV += Preis × Volumen
    V  += Volumen

    VWAP = PV / V
```

Für den Swing Low VWAP:

```text
Swing Low Anchor
        ↓
PV = 0
V  = 0

jede 15m-Kerze
vom Low bis jetzt:
    PV += Preis × Volumen
    V  += Volumen

    VWAP = PV / V
```

Beide Berechnungen laufen unabhängig voneinander.

---

# 13. Rekonstruktion der Polyline

Konzeptioneller Aufbau:

```pine
f_buildSwingPoints(int anchorOffset) =>
    array<chart.point> points =
        array.new<chart.point>()

    float cumPv = 0.0
    float cumV = 0.0

    if not na(anchorOffset)

        for n = 0 to swingLookback - 1

            int i =
                anchorOffset - n

            if i >= 0

                float p =
                    switch priceSrc
                        "HL2"   => hl2[i]
                        "Close" => close[i]
                        "OHLC4" => ohlc4[i]
                        => hlc3[i]

                float v =
                    volume[i]

                if not na(p) and
                   not na(v) and
                   v > 0

                    cumPv += p * v
                    cumV += v

                    float currentVwap =
                        cumPv / cumV

                    array.push(
                        points,
                        chart.point.from_time(
                            time[i],
                            currentVwap
                        )
                    )

    points
```

Diese Logik wird zweimal verwendet:

```text
High Anchor → High VWAP Punkte
Low Anchor  → Low VWAP Punkte
```

---

# 14. VWAPs müssen auf den tatsächlichen Kerzen verankert sein

Die horizontale Position des ersten VWAP-Punkts muss sein:

```text
time der tatsächlichen 15-Minuten-Swing-Kerze
```

Nicht:

```text
Zeitpunkt der Pivot-Bestätigung
```

und nicht:

```text
aktuelle Chartkerze
```

Es soll `xloc.bar_time` verwendet werden.

---

# 15. Bedeutung von „in der Kerze verankert“

Der Swing-VWAP startet zeitlich auf der korrekten Swing-Kerze.

Der erste VWAP-Wert muss aber nicht exakt am Wick-High oder Wick-Low liegen.

Bei HLC3 gilt z. B.:

```text
HLC3 = (High + Low + Close) / 3
```

Damit befindet sich der erste VWAP-Wert mathematisch innerhalb der Ankerkerze.

Beispiel:

```text
High Wick
   │
┌──┴──┐
│     │
│  ●──┼──────── VWAP
│     │
└─────┘
```

Der VWAP darf nicht künstlich direkt am High oder Low der Kerze gestartet werden, wenn als Preisquelle z. B. HLC3 verwendet wird.

---

# 16. High und Low müssen unabhängig aktualisiert werden

Verbindliche Regel:

## Neuer Swing High

```text
neues Swing High erkannt
          ↓
High Anchor ändern
          ↓
nur High VWAP neu berechnen
          ↓
Low VWAP unverändert lassen
```

## Neuer Swing Low

```text
neues Swing Low erkannt
          ↓
Low Anchor ändern
          ↓
nur Low VWAP neu berechnen
          ↓
High VWAP unverändert lassen
```

Nicht erlaubt:

```text
neuer High Pivot
      ↓
beide Swing VWAPs zurücksetzen
```

---

# 17. Labels

Es sollen weiterhin zwei getrennte Labels existieren.

Empfohlene Varianten:

```text
Swing High VWAP 19.09.2026
Swing Low VWAP 20.09.2026
```

oder kompakter:

```text
Swing VWAP ▲ 19.09.2026
Swing VWAP ▼ 20.09.2026
```

Empfehlung für die kompakte Darstellung:

```text
▲ = Swing High
▼ = Swing Low
```

Die bestehenden separaten Label-Objekte können dafür beibehalten werden:

```pine
lblSh
lblSl
```

---

# 18. Swing VWAP vom normalen `calcTf` trennen

Der restliche VWAP-Indikator kann weiterhin eine frei wählbare Berechnungsbasis besitzen.

Für die Swing-Struktur sollte dagegen fest gelten:

```text
Swing Structure = 15m
Swing VWAP Preis-/Volumenbasis = 15m
```

Ziel:

Ein Swing VWAP soll identisch bleiben, egal ob der Benutzer den Chart auf:

```text
5m
15m
1H
4H
1D
```

stellt.

Ein Wechsel des Chart-Timeframes darf den Swing-Anker nicht verändern.

---

# 19. Verbindliche Zieldefinition

| Punkt | Definition |
|---|---|
| Anzahl Swing VWAPs | 2 gleichzeitig |
| High VWAP | eigener VWAP vom Swing High |
| Low VWAP | eigener VWAP vom Swing Low |
| Swing-Datenbasis | 15 Minuten |
| Suchfenster | 50 × 15m Kerzen |
| High-Auswahl | höchster bestätigter Pivot High im Fenster |
| Low-Auswahl | tiefster bestätigter Pivot Low im Fenster |
| High-Anker | bevorzugt oberhalb des aktuellen Preises |
| Low-Anker | bevorzugt unterhalb des aktuellen Preises |
| Pivot links | initial 3 |
| Pivot rechts | initial 3 |
| High/Low voneinander abhängig | Nein |
| VWAP-Berechnung | jeweils Anchor → aktuelle Kerze |
| Linienstart | tatsächliche Swing-Kerze |
| Pivot-Bestätigung | darf später erfolgen |
| High-Polyline | `polySh` beibehalten |
| Low-Polyline | `polySl` beibehalten |
| High-Label | separat |
| Low-Label | separat |
| Preisquelle | bestehende Auswahl HLC3 / HL2 / Close / OHLC4 |
| normaler `calcTf` | nicht zur Swing-Strukturerkennung verwenden |

---

# 20. Noch zu entscheidender Punkt: Verhalten des 50-Bar-Fensters

Es muss noch definiert werden, wie ein bereits aktiver Swing-Anker behandelt wird.

## Variante A – Rolling Window

Der aktuell höchste bzw. tiefste Pivot wird ausschließlich aus den letzten 50 15m-Kerzen bestimmt.

Sobald der bisherige Anker älter als 50 Kerzen wird, fällt er aus dem Fenster und wird ersetzt.

Vorteil:

- klare und einfache Definition
- immer aktueller Intraday-Kontext

Nachteil:

- VWAP kann abrupt auf einen anderen Anker springen

## Variante B – Anchor Lock

Die letzten 50 Kerzen dienen nur dazu, einen neuen strukturellen Swing zu erkennen.

Ist ein Swing High oder Swing Low einmal als aktiver Anker gewählt, bleibt dieser erhalten, bis ein neuer relevanter Swing desselben Typs erkannt wird.

Vorteil:

- ruhigere und stabilere VWAPs
- weniger unnötige Ankerwechsel
- näher an einer strukturellen Swing-Betrachtung

Empfehlung:

> **Anchor Lock verwenden.**

Dabei bleiben High und Low weiterhin vollständig unabhängig.

---

# 21. Zusammenfassung für die Implementierung

Die Swing-Komponente des VWAP-Indikators soll in Zukunft folgende Architektur besitzen:

```text
                    FESTE 15m DATENBASIS
                           │
                           ▼
                 letzte 50 15m Kerzen
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
      bestätigte Pivot Highs    bestätigte Pivot Lows
              │                         │
              ▼                         ▼
      höchstes relevantes       tiefstes relevantes
          Swing High                Swing Low
              │                         │
              ▼                         ▼
       eigener High-VWAP        eigener Low-VWAP
              │                         │
              └────────────┬────────────┘
                           ▼
                 beide gleichzeitig
                    im Chart
```

Wichtigste Regeln:

1. Es gibt immer zwei unabhängige Swing-VWAP-Strukturen.
2. Die Swing-Basis ist fest 15 Minuten.
3. Der Suchbereich beginnt mit 50 Kerzen.
4. Das Swing High und Swing Low werden separat bestimmt.
5. Die bestehende doppelte Verschiebung bei `ph[pivotRight]` / `pl[pivotRight]` wird entfernt.
6. Die VWAP-Linie beginnt rückwirkend auf der tatsächlichen Pivotkerze.
7. Der High-VWAP wird nur durch einen neuen High-Anker verändert.
8. Der Low-VWAP wird nur durch einen neuen Low-Anker verändert.
9. Die Linie wird mit tatsächlichen Kerzenzeiten (`xloc.bar_time`) gezeichnet.
10. Die Berechnung des Swing-VWAPs wird vom allgemeinen `calcTf` entkoppelt.
11. Der VWAP startet mathematisch mit der gewählten Preisquelle der Ankerkerze und nicht künstlich auf dem Wick.
12. Vorzugsweise soll ein Anchor-Lock eingesetzt werden, damit die Swing-VWAPs nicht allein wegen des rollierenden 50-Bar-Fensters springen.

---

# 22. Implementierungsauftrag an die Code-KI

Bitte ändere ausschließlich den Swing-VWAP-Teil des bestehenden Pine Scripts entsprechend dieser Spezifikation.

Dabei:

- Daily, Weekly, Monthly, ATH und ATL VWAP nicht unnötig verändern.
- Zwei Swing VWAPs beibehalten.
- Bestehende High-/Low-Labels und High-/Low-Polylines soweit sinnvoll weiterverwenden.
- Swing-Erkennung auf feste 15m-Daten umstellen.
- 50 Bars als initialen Suchbereich implementieren.
- Pivot-Logik korrigieren.
- High und Low unabhängig verwalten.
- Linien rückwirkend ab der tatsächlichen Pivotkerze rekonstruieren.
- Keine zukünftigen Daten verwenden.
- Keine künstliche Verschiebung des VWAPs auf das Swing-High oder Swing-Low vornehmen.
- Code nach jeder wesentlichen Änderung kompilieren und auf Pine Script v6 prüfen.
- Besonders auf 15m-, 1H- und 4H-Charts testen.
- Prüfen, dass die Swing-Anker auf allen Chart-Timeframes identisch bleiben.
- Prüfen, dass beide Linien nach einem Reload des Charts dieselben Anker und Werte liefern.
- Änderungen am restlichen Indikator nur vornehmen, wenn sie technisch zwingend notwendig sind.

Vor einer endgültigen Implementierung soll die Code-KI zusätzlich dokumentieren, wie das Verhalten des 50-Bar-Fensters umgesetzt wurde:

```text
Rolling Window
oder
Anchor Lock
```

Bevorzugte Variante:

```text
Anchor Lock
```
