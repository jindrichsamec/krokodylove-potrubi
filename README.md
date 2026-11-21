# Krokodýlové potrubí

Dětská hra pro iPad: otáčej dílky potrubí, pusť kohoutek a dostaň vodu ke všem krokodýlům ve vanách.

100 úrovní, každých deset přibude krokodýl (1–10: jeden, … 91–100: deset). Od 6 krokodýlů stojí domy po obou stranách potrubí. Úrovně se odemykají postupně; adresa s `?vse` odemkne všechny (postup se tím nepřepíše).

## Hraní

https://jindrichsamec.github.io/krokodylove-potrubi/

Na iPadu: otevřít v Safari → Sdílet → Přidat na plochu. Po prvním otevření hra běží i bez internetu (service worker si ji uloží do zařízení); nová verze se stáhne sama při dalším spuštění online.

Každý push do `main` hru otestuje, sestaví a nasadí na GitHub Pages (`.github/workflows/deploy.yml`).

## Lokální spuštění

```sh
npm install
npm run dev        # http://localhost:5173, v síti http://<IP Macu>:5173
npm run build && npm run preview   # produkční build včetně offline režimu, http://localhost:4173
```

## Vývoj

```sh
npm test           # herní logika (dílky, tok vody, generátor úrovní)
npm run build      # typecheck + produkční build do dist/ (vč. sw.js)
```

- `src/game` – pravidla bez DOM: dílky, tok vody, generátor, křivka obtížnosti (`levels.ts`)
- `src/ui` – SVG scéna a obrazovky
- `src/audio` – hudba a zvuky generované přes Web Audio (žádné soubory)
- `src/sw.template.js` – service worker pro offline běh; seznam souborů doplní `vite.config.ts` při buildu
