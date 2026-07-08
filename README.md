# Flamingo — Showcase Website

Static marketing/showcase site for the Flamingo multi-vendor fashion marketplace.
Pure HTML/CSS/JS with all libraries vendored locally — no build step, no network
dependencies beyond Google Fonts.

## Run locally

Any static server works:

```sh
npx http-server . -p 8642
# or
python3 -m http.server 8642
```

Then open http://localhost:8642. (Opening `index.html` directly also works —
all scripts are classic non-module scripts.)

## Structure

- `index.html` — single-page site (hero, mission, customer app, vendor app, stats, download, footer)
- `css/style.css` — all styling; brand tokens at the top (`--pink: #ed1968`, `--gray: #595a5c`)
- `js/vendor/` — vendored libraries: GSAP 3.13 (+ ScrollTrigger, SplitText), Lenis 1.3, Three.js r147 (UMD)
- `js/experience.js` — Three.js backdrop: flowing silk-ribbon shader + drifting petal
  particle field, reactive to mouse and scroll (exposed as `window.FlamingoGL`)
- `js/main.js` — Lenis smooth scrolling + all GSAP choreography
- `assets/` — logos (trimmed + transparent from the designer's PNGs), placeholder QR codes

## The experience

- **Smooth scroll**: Lenis (`duration: 1.7`, expo easing) — slow, heavy, awwwards-style
  glide; anchors tween over ~2s. ScrollTrigger is driven from Lenis's scroll event.
- **Preloader**: dark curtain, staggered serif letters, 0→100 counter, two-panel lift
  into a choreographed hero intro (char-split headline, phone + float-cards pop).
- **WebGL backdrop**: fixed canvas behind the content (`z-index` layering — sections
  with solid backgrounds cover it). Ribbon drifts/fades with scroll, camera follows
  the pointer. Skipped entirely for reduced motion, missing WebGL, no-JS.
- **Scroll choreography**: pinned manifesto with word-by-word color scrub, velocity-
  reactive marquee (skews + speeds up/reverses with scroll), masked line reveals for
  titles, dashboard chart line draw + counters, footer word rising letter-by-letter.
- **Micro-interactions**: springy magnetic buttons, rolling hover labels, 3D tilt
  cards, custom cursor (dot + lagging ring).

## Accessibility / fallbacks

- All hidden/initial animation states are applied from JS: with JS disabled or
  `prefers-reduced-motion`, the site renders fully static and complete.
- `<noscript>` hides the preloader, canvas and custom cursor.
- Cursor/magnetic/tilt only activate on fine-pointer (hover-capable) devices.

## Notes for later

- **Fonts**: Astrid (brand display font) is not freely available; the site uses
  Playfair Display as the closest Google Fonts stand-in, Poppins for body text.
  When you have the Astrid license, add `@font-face` rules and swap
  `--font-display` in `style.css`.
- **QR codes**: `assets/qr-ios.svg` / `assets/qr-android.svg` are decorative
  placeholders. Replace with real QR codes once the store listings exist.
- **Store badges**: links are `#` stubs — point them at the App Store /
  Play Store URLs at launch.
