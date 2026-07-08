/* ═══════════════════════════════════════════
   FLAMINGO — interactions & animations
   Lenis (smooth scroll) + GSAP (choreography)
   All hidden/initial states are set from JS so the
   site stays fully visible without JS or with
   prefers-reduced-motion.
   ═══════════════════════════════════════════ */

(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  let lenis = null;
  let manifestoST = null; // the pinned "Our mission" ScrollTrigger (assigned later)

  /* ───────── Mobile menu (always active) ───────── */
  const burger = $("#burger");
  const mobileMenu = $("#mobileMenu");
  const menuOpen = () => mobileMenu.classList.contains("open");
  const toggleMenu = (open) => {
    burger.classList.toggle("open", open);
    mobileMenu.classList.toggle("open", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener("click", () => toggleMenu(!menuOpen()));
  mobileMenu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => toggleMenu(false))
  );

  /* ───────── Motion off / no GSAP → static site ───────── */
  if (prefersReduced || !window.gsap || !window.ScrollTrigger) {
    const pre = $("#preloader");
    if (pre) pre.remove();
    return;
  }

  gsap.registerPlugin(ScrollTrigger, SplitText);

  /* ───────── Lenis: slow, buttery scroll ───────── */
  if (window.Lenis) {
    lenis = new Lenis({
      duration: 1.5,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 0.99,
      touchMultiplier: 1.63,
    });
    lenis.on("scroll", (e) => {
      ScrollTrigger.update();
      window.FlamingoGL && window.FlamingoGL.setScroll(e.scroll);
    });
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop(); // held while the preloader plays
  }

  /* ───────── Anchor gliding ─────────
     The "Our mission" section is pinned: it consumes ~1.2 viewports of scroll
     to play its word-by-word reveal. That's lovely when scrolling by hand, but
     a nav-link jump to a section *below* it would otherwise crawl through that
     pinned dwell. So for those jumps we drop the pin for the duration of the
     glide (compensating layout shifts so nothing visibly jumps) and restore it
     on arrival — the reveal stays intact for normal scrolling.
     ease-in-out (smootherstep): gentle accelerate → decelerate, no lurch. */
  const NAV_OFFSET = 72;
  const smootherstep = (t) => t * t * t * (t * (t * 6 - 15) + 10);

  const restorePin = () => {
    if (!manifestoST || manifestoST.enabled) return;
    const y = window.scrollY;
    manifestoST.enable();
    ScrollTrigger.refresh();
    // re-adding the pin grows the page above the manifesto's end; if we're
    // past it, bump the scroll by that amount so the view doesn't jump.
    const pinDist = manifestoST.end - manifestoST.start;
    if (y > manifestoST.start - 1 && pinDist > 0) {
      lenis.scrollTo(y + pinDist, { immediate: true, force: true });
    }
  };

  const dropPin = () => {
    if (!manifestoST || !manifestoST.enabled) return;
    const y = window.scrollY;
    const consumedAbove = Math.max(0, Math.min(y, manifestoST.end) - manifestoST.start);
    manifestoST.disable();
    ScrollTrigger.refresh();
    if (consumedAbove > 0) {
      lenis.scrollTo(Math.max(0, y - consumedAbove), { immediate: true, force: true });
    }
  };

  const glideTo = (target) => {
    if (!lenis) { target.scrollIntoView({ behavior: "smooth" }); return; }
    restorePin(); // settle any in-flight bypass back to the normal layout first

    const st = manifestoST;
    const yStart = window.scrollY;
    const targetY = target.getBoundingClientRect().top + yStart - NAV_OFFSET;
    const crossesPin =
      st && st.enabled && st.pin && targetY > st.start + 4 && yStart < st.end - 4;

    if (!crossesPin) {
      lenis.scrollTo(targetY, { duration: 1.7, easing: smootherstep });
      return;
    }

    dropPin();
    const targetY2 = target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET;
    lenis.scrollTo(targetY2, {
      duration: 1.5,
      easing: smootherstep,
      onComplete: restorePin,
    });
  };

  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length <= 1) { e.preventDefault(); return; } // '#' stubs
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      glideTo(target);
    });
  });

  /* ───────── Rolling labels (nav links & buttons) ───────── */
  $$("[data-roll]").forEach((el) => {
    const text = el.textContent.trim();
    el.innerHTML =
      `<span class="roll"><span class="roll__t">${text}</span>` +
      `<span class="roll__t roll__t--dup" aria-hidden="true">${text}</span></span>`;
  });

  /* ───────── Custom cursor ───────── */
  const cursor = $("#cursor");
  const cursorDot = $("#cursorDot");
  if (finePointer && cursor) {
    const curX = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3.out" });
    const curY = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3.out" });
    window.addEventListener("mousemove", (e) => {
      gsap.set(cursorDot, { x: e.clientX, y: e.clientY });
      curX(e.clientX);
      curY(e.clientY);
    }, { passive: true });
    window.addEventListener("mousedown", () => gsap.to(cursor, { scale: 0.75, duration: 0.25 }));
    window.addEventListener("mouseup", () => gsap.to(cursor, { scale: 1, duration: 0.35, ease: "back.out(2)" }));
    $$("a, button, .feature-card, [data-tilt]").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("grow"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("grow"));
    });
  }

  /* ───────── Magnetic elements (springy) ───────── */
  if (finePointer) {
    $$("[data-magnetic]").forEach((el) => {
      const xTo = gsap.quickTo(el, "x", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.8, ease: "elastic.out(1, 0.4)" });
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.35);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.35);
      });
      el.addEventListener("mouseleave", () => { xTo(0); yTo(0); });
    });
  }

  /* ───────── 3D tilt cards ───────── */
  if (finePointer) {
    $$("[data-tilt]").forEach((card) => {
      gsap.set(card, { transformPerspective: 900 });
      const rx = gsap.quickTo(card, "rotationX", { duration: 0.6, ease: "power3.out" });
      const ry = gsap.quickTo(card, "rotationY", { duration: 0.6, ease: "power3.out" });
      const lift = gsap.quickTo(card, "z", { duration: 0.6, ease: "power3.out" });
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        rx(((e.clientY - r.top) / r.height - 0.5) * -7);
        ry(((e.clientX - r.left) / r.width - 0.5) * 7);
        lift(24);
      });
      card.addEventListener("mouseleave", () => { rx(0); ry(0); lift(0); });
    });
  }

  /* ───────── Nav: glass + hide/show ───────── */
  const nav = $("#nav");
  const navSlide = gsap.quickTo(nav, "yPercent", { duration: 0.65, ease: "power3.out" });

  /* ═════════ Everything below waits for fonts so text splits measure correctly ═════════ */
  const fontsReady = Promise.race([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise((r) => setTimeout(r, 2200)),
  ]);

  fontsReady.then(() => {
    /* ── Split hero title ── */
    const heroLineChars = $$(".hero__title-line").map(
      (line) => new SplitText(line, { type: "chars" }).chars
    );
    gsap.set(heroLineChars.flat(), { yPercent: 130, rotate: 6 });

    /* ── Initial states for the hero intro ── */
    gsap.set(nav, { y: -26, autoAlpha: 0 });
    gsap.set(".hero__eyebrow-line", { scaleX: 0 });
    gsap.set(".hero__eyebrow-text", { autoAlpha: 0, y: 10 });
    gsap.set([".hero__sub", ".hero__actions", ".hero__meta"], { autoAlpha: 0, y: 34 });
    gsap.set(".hero__ring", { autoAlpha: 0, scale: 0.7 });
    gsap.set("#heroPhone", { autoAlpha: 0, y: 110, rotation: 10 });
    gsap.set("#heroBird", { autoAlpha: 0, x: -60, rotation: -14 });
    gsap.set(["#floatCard1", "#floatCard2"], { autoAlpha: 0, scale: 0 });
    gsap.set("#heroScrollHint", { autoAlpha: 0 });

    /* ── Hero intro timeline (played when the curtain lifts) ── */
    const intro = gsap.timeline({ paused: true, defaults: { ease: "power4.out" } });
    intro
      .to("#webgl", { opacity: 1, duration: 2.4, ease: "power2.out" }, 0)
      .to(nav, { y: 0, autoAlpha: 1, duration: 1 }, 0.15)
      .to(".hero__eyebrow-line", { scaleX: 1, duration: 0.9 }, 0.2)
      .to(".hero__eyebrow-text", { autoAlpha: 1, y: 0, duration: 0.8 }, 0.35);
    heroLineChars.forEach((chars, i) => {
      intro.to(chars, { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.03 }, 0.3 + i * 0.12);
    });
    intro
      .to(".hero__sub", { autoAlpha: 1, y: 0, duration: 1 }, 0.95)
      .to(".hero__actions", { autoAlpha: 1, y: 0, duration: 1 }, 1.1)
      .to(".hero__meta", { autoAlpha: 1, y: 0, duration: 1 }, 1.25)
      .to(".hero__ring", { autoAlpha: 1, scale: 1, duration: 1.6, ease: "power3.out" }, 0.55)
      .to("#heroPhone", { autoAlpha: 1, y: 0, rotation: 2, duration: 1.6 }, 0.65)
      .to("#heroBird", { autoAlpha: 0.9, x: 0, rotation: 0, duration: 1.3 }, 0.9)
      .to("#floatCard1", { autoAlpha: 1, scale: 1, duration: 1, ease: "elastic.out(1, 0.5)" }, 1.35)
      .to("#floatCard2", { autoAlpha: 1, scale: 1, duration: 1, ease: "elastic.out(1, 0.5)" }, 1.5)
      .to("#heroScrollHint", { autoAlpha: 1, duration: 0.8 }, 1.8)
      .add(() => {
        // ambient floating, started only once the intro settles
        gsap.to("#heroPhone", { y: -16, duration: 3, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to("#heroBird", { y: -12, rotation: -3, duration: 2.6, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to("#floatCard1", { y: -10, duration: 2.4, yoyo: true, repeat: -1, ease: "sine.inOut" });
        gsap.to("#floatCard2", { y: -10, duration: 2.8, yoyo: true, repeat: -1, ease: "sine.inOut", delay: 0.6 });
        // switch the cards' backdrop blur on now that their scale-in is done
        $$(".float-card").forEach((c) => c.classList.add("float-card--ready"));
      }, 2.2);

    /* ── Preloader sequence ── */
    const preloader = $("#preloader");
    const preWord = $("#preloaderWord");
    const preCount = $("#preloaderCount");
    preWord.innerHTML = preWord.textContent.trim().split("")
      .map((c) => `<span class="pl-char">${c}</span>`).join("");
    const preChars = $$(".pl-char", preWord);
    const counter = { v: 0 };

    gsap.timeline({ delay: 0.1 })
      .from(preChars, { yPercent: 115, rotate: 5, duration: 1, ease: "power4.out", stagger: 0.05 })
      .from(".preloader__tag", { autoAlpha: 0, y: 14, duration: 0.7, ease: "power3.out" }, "-=0.55")
      .to(counter, {
        v: 100, duration: 1.6, ease: "power2.inOut",
        onUpdate: () => { preCount.textContent = Math.round(counter.v); },
      }, 0.2)
      .to(preChars, { yPercent: -115, duration: 0.65, ease: "power3.in", stagger: 0.035 }, "+=0.1")
      .to([".preloader__tag", ".preloader__bird", ".preloader__count"],
        { autoAlpha: 0, duration: 0.4 }, "<0.2")
      .to(".preloader__panel", {
        yPercent: -100, duration: 0.95, ease: "power4.inOut", stagger: 0.1,
        onStart: () => {
          lenis && lenis.start();
          intro.play();
        },
      }, "-=0.05")
      .set(preloader, { display: "none" });

    // safety: never trap the user behind the preloader
    setTimeout(() => {
      if (preloader.style.display !== "none" && intro.progress() === 0) {
        gsap.set(preloader, { display: "none" });
        lenis && lenis.start();
        intro.play();
      }
    }, 6000);

    /* ── Scroll progress bar ── */
    gsap.to("#progress", {
      scaleX: 1, ease: "none",
      scrollTrigger: { start: 0, end: "max", scrub: 0.3 },
    });

    /* ── Nav behaviour ── */
    ScrollTrigger.create({
      start: 0, end: "max",
      onUpdate(self) {
        const y = self.scroll();
        nav.classList.toggle("scrolled", y > 30);
        if (self.direction === 1 && y > 300 && !menuOpen()) navSlide(-120);
        else navSlide(0);
      },
    });

    /* ── Hero scrubbed exit ── */
    gsap.timeline({
      scrollTrigger: { trigger: "#hero", start: "top top", end: "bottom top", scrub: 0.8 },
      defaults: { ease: "none" },
    })
      .to(".hero__text", { yPercent: -16, autoAlpha: 0.15 }, 0)
      .to("#heroVisual", { y: 110 }, 0)
      .to("#heroScrollHint", { autoAlpha: 0, duration: 0.2 }, 0)
      .to(".hero__blob--1", { y: 140 }, 0)
      .to(".hero__blob--2", { y: -90 }, 0);

    /* ── Marquee: infinite loop that reacts to scroll velocity ── */
    const track = $("#marqueeTrack");
    if (track) {
      const loop = gsap.to(track, { xPercent: -50, repeat: -1, duration: 26, ease: "none" });
      const skewTo = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3.out" });
      ScrollTrigger.create({
        start: 0, end: "max",
        onUpdate(self) {
          const v = self.getVelocity();
          gsap.to(loop, {
            timeScale: gsap.utils.clamp(-4, 4, 1 + v / 350),
            duration: 0.4, overwrite: "auto",
          });
          skewTo(gsap.utils.clamp(-10, 10, v / 220));
        },
      });
      ScrollTrigger.addEventListener("scrollEnd", () => {
        skewTo(0);
        gsap.to(loop, { timeScale: 1, duration: 1, overwrite: "auto" });
      });
    }

    /* ── Generic reveals ── */
    $$("[data-reveal]").forEach((el) => {
      gsap.set(el, { y: 36, autoAlpha: 0 });
      ScrollTrigger.create({
        trigger: el, start: "top 88%", once: true,
        onEnter: () => gsap.to(el, { y: 0, autoAlpha: 1, duration: 1.1, ease: "power4.out" }),
      });
    });

    /* ── Section titles: masked line reveals ── */
    $$("[data-title]").forEach((el) => {
      const split = new SplitText(el, { type: "lines", mask: "lines" });
      gsap.set(split.lines, { yPercent: 120 });
      ScrollTrigger.create({
        trigger: el, start: "top 85%", once: true,
        onEnter: () => gsap.to(split.lines, {
          yPercent: 0, duration: 1.25, stagger: 0.1, ease: "power4.out",
        }),
      });
    });

    /* ── Manifesto: pinned, words light up as you scroll ── */
    const manifesto = $("#manifestoText");
    if (manifesto) {
      const pinkWords = new Set(["flamingo", "stage,", "tools,", "audience"]);
      manifesto.innerHTML = manifesto.textContent.trim().split(/\s+/)
        .map((w) => `<span class="m-word${pinkWords.has(w.toLowerCase()) ? " pink" : ""}">${w}</span>`)
        .join(" ");
      const words = $$(".m-word", manifesto);

      const manifestoTL = gsap.timeline({
        scrollTrigger: {
          trigger: ".manifesto", start: "top top", end: "+=120%",
          scrub: 0.5, pin: true, anticipatePin: 1,
        },
      })
        .fromTo(words,
          { color: "rgba(89, 90, 92, 0.16)" },
          {
            color: (i, el) => (el.classList.contains("pink") ? "#ed1968" : "#1c1c1e"),
            stagger: 0.18, duration: 1, ease: "none",
          }, 0)
        .fromTo("#manifestoFoot",
          { autoAlpha: 0, y: 30 },
          { autoAlpha: 1, y: 0, duration: 2.5, ease: "power2.out" }, ">-1");
      manifestoST = manifestoTL.scrollTrigger;
    }

    /* ── Shop: feature cards ── */
    $$("#shopCards .feature-card").forEach((card, i) => {
      gsap.set(card, { y: 70, autoAlpha: 0 });
      ScrollTrigger.create({
        trigger: card, start: "top 88%", once: true,
        onEnter: () => gsap.to(card, {
          y: 0, autoAlpha: 1, duration: 1.2, ease: "power4.out", delay: (i % 2) * 0.12,
        }),
      });
    });
    // slight differential drift between the two card columns
    const cardDrift = {
      trigger: "#shopCards", start: "top bottom", end: "bottom top", scrub: 1,
    };
    gsap.to("#shopCards .feature-card:nth-child(odd)", { yPercent: -6, ease: "none", scrollTrigger: cardDrift });
    gsap.to("#shopCards .feature-card:nth-child(even)", { yPercent: 5, ease: "none", scrollTrigger: { ...cardDrift } });

    /* ── Sell: dashboard reveal + live chart ── */
    const dashboard = $("#dashboard");
    if (dashboard) {
      gsap.set(dashboard, { y: 90, rotationX: 8, autoAlpha: 0, transformPerspective: 900 });
      ScrollTrigger.create({
        trigger: dashboard, start: "top 82%", once: true,
        onEnter: () => {
          gsap.to(dashboard, { y: 0, rotationX: 0, autoAlpha: 1, duration: 1.4, ease: "power4.out" });
          const line = $("#chartLine");
          const len = line.getTotalLength();
          gsap.fromTo(line,
            { strokeDasharray: len, strokeDashoffset: len },
            { strokeDashoffset: 0, duration: 1.8, ease: "power2.inOut", delay: 0.4 });
          gsap.fromTo("#chartArea", { opacity: 0 }, { opacity: 1, duration: 1, delay: 1.7 });
          gsap.fromTo("#chartPulse", { opacity: 0 }, {
            opacity: 1, duration: 0.3, delay: 2,
            onComplete: () => gsap.fromTo("#chartPulse",
              { attr: { r: 4 }, opacity: 1 },
              { attr: { r: 13 }, opacity: 0, duration: 1.6, repeat: -1, repeatDelay: 0.6, ease: "power2.out" }),
          });
          $$(".dstat__bar i", dashboard).forEach((bar) => {
            const w = bar.style.getPropertyValue("--w") || "70%";
            gsap.fromTo(bar, { width: 0 }, { width: w, duration: 1.4, ease: "power4.out", delay: 0.7 });
          });
        },
      });
    }

    /* ── Sell: feature list + glow drift ── */
    $$("#sellFeatures .sell-feature").forEach((f, i) => {
      gsap.set(f, { x: -48, autoAlpha: 0 });
      ScrollTrigger.create({
        trigger: f, start: "top 88%", once: true,
        onEnter: () => gsap.to(f, { x: 0, autoAlpha: 1, duration: 1.1, ease: "power4.out", delay: i * 0.05 }),
      });
    });
    gsap.fromTo("#sellGlow", { y: -60 }, {
      y: 140, ease: "none",
      scrollTrigger: { trigger: "#sell", start: "top bottom", end: "bottom top", scrub: 1 },
    });

    /* ── Counters ── */
    $$("[data-counter]").forEach((el) => {
      const target = parseInt(el.dataset.counter, 10);
      const prefix = el.dataset.prefix || "";
      const state = { v: 0 };
      el.textContent = prefix + "0";
      ScrollTrigger.create({
        trigger: el, start: "top 85%", once: true,
        onEnter: () => gsap.to(state, {
          v: target, duration: 2.2, ease: "power3.out",
          onUpdate: () => { el.textContent = prefix + Math.round(state.v).toLocaleString("en-US"); },
        }),
      });
    });

    /* ── Download ── */
    gsap.set("#downloadIcon", { scale: 0.5, rotation: -14, autoAlpha: 0 });
    ScrollTrigger.create({
      trigger: "#downloadIcon", start: "top 88%", once: true,
      onEnter: () => gsap.to("#downloadIcon", {
        scale: 1, rotation: 0, autoAlpha: 1, duration: 1.2, ease: "elastic.out(1, 0.55)",
      }),
    });
    $$("#downloadCards .qr-card").forEach((card, i) => {
      gsap.set(card, { y: 80, rotation: i === 0 ? -3 : 3, autoAlpha: 0 });
      ScrollTrigger.create({
        trigger: card, start: "top 88%", once: true,
        onEnter: () => gsap.to(card, {
          y: 0, rotation: 0, autoAlpha: 1, duration: 1.3, ease: "power4.out", delay: i * 0.12,
        }),
      });
    });

    /* ── Footer: giant word rises letter by letter ── */
    const footerWord = $("#footerWord");
    if (footerWord) {
      footerWord.innerHTML = footerWord.textContent.trim().split("")
        .map((c) => `<span class="fw-char">${c}</span>`).join("");
      gsap.fromTo(".fw-char",
        { yPercent: 70, autoAlpha: 0 },
        {
          yPercent: 0, autoAlpha: 1, stagger: 0.06, ease: "power3.out",
          // ends exactly when the word's bottom clears the viewport bottom,
          // i.e. at (or before) max scroll on any viewport
          scrollTrigger: { trigger: footerWord, start: "top bottom", end: "bottom bottom", scrub: 0.6 },
        });
    }

    ScrollTrigger.refresh();
  });
})();
