# Flamingo — Showcase Website

Static marketing/showcase site for the Flamingo multi-vendor fashion marketplace.
Pure HTML/CSS/JS — no build step, no dependencies.

## Run locally

Any static server works:

```sh
npx http-server . -p 8642
# or
python3 -m http.server 8642
```

Then open http://localhost:8642. (Opening `index.html` directly also works,
but a server is recommended so Google Fonts and relative assets load cleanly.)

## Structure

- `index.html` — single-page site (hero, mission, customer app, vendor app, stats, download, footer)
- `css/style.css` — all styling; brand tokens at the top (`--pink: #ed1968`, `--gray: #595a5c`)
- `js/main.js` — preloader, custom cursor, magnetic buttons, scroll reveals, counters, parallax, mobile menu
- `assets/` — logos (trimmed + transparent from the designer's PNGs), placeholder QR codes

## Notes for later

- **Fonts**: Astrid (brand display font) is not freely available; the site uses
  Playfair Display as the closest Google Fonts stand-in, Poppins for body text.
  When you have the Astrid license, add `@font-face` rules and swap
  `--font-display` in `style.css`.
- **QR codes**: `assets/qr-ios.svg` / `assets/qr-android.svg` are decorative
  placeholders. Replace with real QR codes once the store listings exist.
- **Store badges**: links are `#` stubs — point them at the App Store /
  Play Store URLs at launch.
- All animations respect `prefers-reduced-motion`.
