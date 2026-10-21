# Kite-dashboard

Wind, vlagen, regen, getij en je ideale kitemaat voor Kijkduin/Zandmotor, Hoek van Holland, Maasvlakte/Slufter en Scheveningen. Werkt als website op de laptop en als app op je iPhone-beginscherm.

**Live:** https://frisobalt-web.github.io/kite-dashboard/

## Op je iPhone
Open de link in Safari → Deel → **Zet op beginscherm**.

## Aanpassen
- **Spots, windrichtingen, getijstation:** `src/config/spots.json`
- **Gewicht, power, quiver/gear, volgorde spots:** in de app (Instellingen en Gear), bewaard op je apparaat; overzetten met Exporteren/Importeren.
- **Bar-advies van fabrikanten:** `src/data/gear-db.json`

## Hoe het werkt
- Wind en regen: KNMI HARMONIE via Open-Meteo, live in de browser (15 min cache).
- Getij: Rijkswaterstaat, elke nacht opgehaald door de workflow *Getij ophalen* → `public/data/tides.json`. Lukt dat niet, dan toont de app een benadering (Open-Meteo) met dat label erbij.
- Elke push naar `main` en elke getij-update publiceert de site opnieuw via *Site publiceren*.

## Ontwikkelen
```
npm install
npm run dev      # lokaal bekijken
npm test         # tests
npm run build    # productie-build
npm run tides    # getij ophalen (heeft internet nodig)
```

Zie `SPEC.md` voor de specificatie en `DECISIONS.md` voor gemaakte keuzes.
