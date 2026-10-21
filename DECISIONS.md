# Keuzes en afwijkingen

1. **Hash-routing** (`#/week`) in plaats van echte paden: GitHub Pages kent geen fallback naar index.html, zo werken alle links en de iPhone-app altijd.
2. **Getij-extremen zelf berekend** uit de 10-minutenreeks in plaats van de RWS-groepering `GETETBRKD2`: één verzoek minder per station, en dubbel laagwater bij Hoek van Holland gaat vanzelf goed.
3. **Getij-script probeert meerdere locatiecodes** en zoekt bij falen in de RWS-catalogus. De bouwomgeving had geen toegang tot RWS of Open-Meteo; de echte aanroepen zijn getest via de GitHub-workflow en in de browser na publicatie.
4. **Windbereik van kites is geschat** met de formule. Ozone publiceert het windbereik van de Edge alleen als grafiek (basis 80 kg), niet als getallen; die zijn niet overgenomen om niets te verzinnen. Wel overgenomen: Ozone-advies Edge 5–7 m → 45 cm, 8–11 m → 50 cm, 12–19 m → 55 cm bar, 23 m lijnen (`src/data/gear-db.json`, met bronnen). Andere merken kunnen later worden toegevoegd.
5. **Daglicht** = zonsopkomst − 30 min tot zonsondergang + 30 min (Open-Meteo `sunrise`/`sunset`).
6. **Offline**: service worker met netwerk-eerst; zonder bereik toont de app de laatst geladen verwachting.
7. **Sideshore-grens**: een richting buiten de sector maar binnen 30° ervan is sideshore, tenzij hij meer dan 100° van de kustrichting afwijkt; dan is hij aflandig (bijv. 185° in Kijkduin).
8. **Instellingen in localStorage** per apparaat; export/import als JSON om tussen telefoon en laptop over te zetten.
9. **Vlagen bij lichte wind** (21 okt): de check op te weinig wind telt 2/3 van de vlagen mee, vergeleken met je grootste kite. Zo wordt 11 kn met vlagen 18 "Krap, vlagerig · pak je 11m" in plaats van "te weinig".
