# FireWatch — NASA FIRMS + Vercel

Mappa web responsive per monitorare gli hotspot rilevati dai satelliti VIIRS NOAA-20 e NOAA-21 tramite NASA FIRMS.

## 1. Prerequisiti

- Account Vercel
- Una FIRMS MAP_KEY gratuita
- GitHub (consigliato) oppure Vercel CLI

Richiedi la MAP_KEY qui:
https://firms.modaps.eosdis.nasa.gov/api/map_key/

## 2. Deploy su Vercel

### Metodo GitHub
1. Carica questa cartella in un repository GitHub.
2. In Vercel: Add New → Project → importa il repository.
3. Non serve un build command.
4. Aggiungi una Environment Variable:
   - Name: `FIRMS_MAP_KEY`
   - Value: la tua MAP_KEY NASA
5. Deploy.

### Metodo CLI
```bash
npm i -g vercel
vercel login
vercel
vercel env add FIRMS_MAP_KEY
vercel --prod
```

## 3. Come funziona

Il browser chiama `/api/fires`. La serverless function di Vercel interroga NASA FIRMS, normalizza il CSV e restituisce JSON al client.

Per evitare richieste eccessive:
- cache server-side: 4 minuti per combinazione query
- refresh client: 5 minuti
- il browser non espone la MAP_KEY

## 4. Dati

Fonte: NASA LANCE / FIRMS, VIIRS Near Real-Time.

Campi mostrati:
- coordinate
- FRP (Fire Radiative Power)
- confidence
- satellite
- data/ora acquisizione
- brightness
- day/night

Nota: un hotspot satellitare è una rilevazione termica e non è automaticamente un incendio boschivo confermato.

## 5. Personalizzazione

Il file `public/app.js` contiene:
- bounding box iniziale
- intervallo di refresh
- colori/dimensione hotspot
- popup
- sorgenti VIIRS

`public/styles.css` contiene tutta la UI.

## Licenza / attribuzione

I dati di fuoco provengono da NASA FIRMS. Verifica sempre i termini e le condizioni NASA/FIRMS per il tuo uso e mantieni le attribuzioni richieste.


## Funzionalità dashboard
- filtri temporali 24h/48h/3/5 giorni
- filtro FRP minimo
- filtro alta confidenza
- feed delle rilevazioni più intense
- vista hotspot / heat overlay
- mappa dark / satellite
- fullscreen e geolocalizzazione browser
- statistiche dinamiche
- responsive desktop/mobile
