# Specificatie kite-dashboard

Volledige versie: het document "Kite-dashboard: bouwopdracht" in Claude. Dit is de samenvatting die bij de code hoort.

## Pagina's (hash-routes, werken op GitHub Pages)
| Route | Inhoud |
| --- | --- |
| `#/` Nu | Beste spot nu, per spot uurstrip (daglicht) met wind/vlagen in kleur, kitemaat-label, regen, getij |
| `#/week` | 7 dagen: desktop raster spots × dagen, mobiel een kaart per dag |
| `#/spot/:id` | 36-uursgrafiek wind+vlagen+regen, getijcurve met HW/LW, water- en luchttemperatuur, golfhoogte |
| `#/gear` | Kites, bars, boards invullen; beste kite + bar + board per spot; windbereik-grafiek; gaten in quiver |
| `#/instellingen` | Gewicht, power (−2…+2), vlagen-aandeel, volgorde spots, export/import |
| `#/over` | Bronnen, formule, kleurschaal |

Breakpoint 768 px: daaronder tabbalk onderin en compacte weergave (10 uren per spot).

## Kitemaat
`maat = gewicht ÷ effectieve wind × (2,2 + 0,1 × power)`, effectieve wind = gemiddeld + aandeel × (vlagen − gemiddeld), standaard aandeel 1/3.
Labels: groen "Ideaal Xm / pak je Ym" als een quiver-kite binnen 1,2 m ligt (gelijke afstand → kleinere); "Krap, vlagerig / pak je <grootste>m" als de gemiddelde wind te weinig is voor je grootste kite maar de wind met 2/3 van de vlagen wél (telt als kitebaar); anders oranje "Ideaal Xm"; >17 m "Te weinig wind"; <5 m "Te veel wind"; aflandig → "Aflandig".

## Windrichting
Per spot een goede sector (met de klok mee). Buiten de sector maar binnen 30° → sideshore; meer dan 100° van de kustrichting → aflandig (geen advies, telt niet mee).

## Kleurschaal (kn → RGB, lineair ertussen)
0 (181,212,244) · 8 (133,183,235) · 12 (93,202,165) · 16 (151,196,89) · 20 (239,208,39) · 24 (239,159,39) · 28 (226,75,74) · 34 (163,45,45) · 40 (127,119,221). Tekst wit vanaf 27 kn.

## Beste spot
Alleen daglicht en niet aflandig. +3 groen of krap, +1 oranje, +2 bij effectieve wind 16–24 kn (of 14–16 kn met vlagen ≥ 20), −1 bij ≥1 mm regen, −1 bij vlagen >12 kn boven gemiddeld. Week: per dag het sterkste uur als gemiddeld/vlagen; "te weinig wind" alleen als de hoogste vlaag < 15 kn, anders "geen goed moment". Gelijk → bovenste in volgorde.

## Data
- Open-Meteo forecast: `models=knmi_seamless`, `wind_speed_unit=kn`, `timeformat=unixtime` (tijden in Europe/Amsterdam via Intl, dus correct rond zomer/wintertijd).
- Open-Meteo marine: zeetemperatuur, golfhoogte, `sea_level_height_msl` als getij-noodoplossing.
- Rijkswaterstaat ddapi20 `OphalenWaarnemingen`, `WATHTE` + `ProcesType: astronomisch`, 8 dagen, stations scheveningen en hoekvanholland. HW/LW worden uit de 10-minutenreeks berekend (dubbel laagwater mogelijk).
