/* ═══════════════════════════════════════════
   FLAMINGO — interactions & animations
   ═══════════════════════════════════════════ */

(() => {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ───────── Preloader ───────── */
  const preloader = document.getElementById("preloader");
  const finishLoad = () => {
    preloader.classList.add("done");
    document.body.classList.add("loaded");
    setTimeout(() => preloader.remove(), 1400);
  };
  if (prefersReduced) {
    finishLoad();
  } else {
    // let the letters play, then lift the curtain
    window.addEventListener("load", () => setTimeout(finishLoad, 900));
    // safety: never trap the user behind the preloader
    setTimeout(finishLoad, 3500);
  }

  /* ───────── Custom cursor ───────── */
  const cursor = document.getElementById("cursor");
  const cursorDot = document.getElementById("cursorDot");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (finePointer && !prefersReduced) {
    let mx = -100, my = -100, cx = -100, cy = -100;
    window.addEventListener("mousemove", (e) => {
      mx = e.clientX; my = e.clientY;
      cursorDot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    }, { passive: true });

    const lerpCursor = () => {
      cx += (mx - cx) * 0.16;
      cy += (my - cy) * 0.16;
      cursor.style.transform = `translate(${cx}px, ${cy}px) translate(-50%, -50%)`;
      requestAnimationFrame(lerpCursor);
    };
    lerpCursor();

    document.querySelectorAll("a, button, .feature-card, .qr-card").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("grow"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("grow"));
    });
  }

  /* ───────── Magnetic buttons ───────── */
  if (finePointer && !prefersReduced) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      const strength = 0.35;
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - (r.left + r.width / 2);
        const y = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transition = "transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
        el.style.transform = "";
        setTimeout(() => (el.style.transition = ""), 500);
      });
    });
  }

  /* ───────── Nav: glass on scroll, hide on scroll down ───────── */
  const nav = document.getElementById("nav");
  let lastY = window.scrollY;
  let ticking = false;

  const onScrollNav = () => {
    const y = window.scrollY;
    nav.classList.toggle("scrolled", y > 30);
    if (y > lastY && y > 300 && !document.getElementById("mobileMenu").classList.contains("open")) {
      nav.classList.add("hidden");
    } else {
      nav.classList.remove("hidden");
    }
    lastY = y;
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(onScrollNav); ticking = true; }
  }, { passive: true });

  /* ───────── Mobile menu ───────── */
  const burger = document.getElementById("burger");
  const mobileMenu = document.getElementById("mobileMenu");
  const toggleMenu = (open) => {
    burger.classList.toggle("open", open);
    mobileMenu.classList.toggle("open", open);
    document.body.style.overflow = open ? "hidden" : "";
  };
  burger.addEventListener("click", () => toggleMenu(!mobileMenu.classList.contains("open")));
  mobileMenu.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => toggleMenu(false))
  );

  /* ───────── Scroll reveals ───────── */
  const revealEls = document.querySelectorAll(
    ".reveal-up, .reveal-card, .reveal-left, .reveal-scale, .dashboard"
  );
  const staggerParents = new Map();

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        // stagger siblings that reveal together
        const parent = el.parentElement;
        const delayBase = staggerParents.get(parent) || 0;
        el.style.transitionDelay = `${delayBase}s`;
        staggerParents.set(parent, Math.min(delayBase + 0.12, 0.48));
        setTimeout(() => staggerParents.set(parent, 0), 800);

        el.classList.add("in-view");
        io.unobserve(el);
      });
    },
    { threshold: 0.18, rootMargin: "0px 0px -40px 0px" }
  );
  revealEls.forEach((el) => io.observe(el));

  /* ───────── Animated counters ───────── */
  const fmt = (n) => n.toLocaleString("en-US");
  const counterIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        counterIO.unobserve(el);
        const target = parseInt(el.dataset.counter, 10);
        const prefix = el.dataset.prefix || "";
        const dur = 1800;
        const t0 = performance.now();
        const step = (t) => {
          const p = Math.min((t - t0) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 4);
          el.textContent = prefix + fmt(Math.round(target * eased));
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    },
    { threshold: 0.5 }
  );
  document.querySelectorAll("[data-counter]").forEach((el) => counterIO.observe(el));

  /* ───────── Hero parallax ───────── */
  if (!prefersReduced) {
    const parallaxEls = document.querySelectorAll("[data-parallax]");
    let pTicking = false;
    const onParallax = () => {
      const y = window.scrollY;
      parallaxEls.forEach((el) => {
        const speed = parseFloat(el.dataset.parallax);
        el.style.translate = `0 ${y * speed}px`;
      });
      pTicking = false;
    };
    window.addEventListener("scroll", () => {
      if (!pTicking) { requestAnimationFrame(onParallax); pTicking = true; }
    }, { passive: true });
  }

  /* ───────── Manifesto: light up word by word ───────── */
  const manifesto = document.getElementById("manifestoText");
  if (manifesto) {
    const pinkWords = new Set(["flamingo", "stage,", "tools,", "audience"]);
    const words = manifesto.textContent.trim().split(/\s+/);
    manifesto.innerHTML = words
      .map((w) => `<span class="m-word${pinkWords.has(w.toLowerCase()) ? " pink" : ""}">${w}</span>`)
      .join(" ");
    const mWords = manifesto.querySelectorAll(".m-word");

    const litProgress = () => {
      const r = manifesto.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 when top of text hits 85% of viewport, 1 when bottom passes 45%
      const start = vh * 0.85;
      const end = vh * 0.45;
      const p = (start - r.top) / (start - end + r.height);
      return Math.max(0, Math.min(1, p));
    };
    let mTicking = false;
    const onManifesto = () => {
      const count = Math.floor(litProgress() * mWords.length);
      mWords.forEach((w, i) => w.classList.toggle("lit", i < count));
      mTicking = false;
    };
    window.addEventListener("scroll", () => {
      if (!mTicking) { requestAnimationFrame(onManifesto); mTicking = true; }
    }, { passive: true });
    onManifesto();
  }

  /* ───────── Fluid anchor scrolling ─────────
     Native smooth scroll is short and snappy; this is a long,
     distance-aware glide the user can interrupt at any moment. */
  let scrollAnim = null;

  const cancelScrollAnim = () => {
    if (scrollAnim !== null) {
      cancelAnimationFrame(scrollAnim);
      scrollAnim = null;
    }
  };
  ["wheel", "touchstart", "keydown"].forEach((evt) =>
    window.addEventListener(evt, cancelScrollAnim, { passive: true })
  );

  const easeInOutQuint = (t) =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

  const smoothScrollTo = (targetY) => {
    cancelScrollAnim();
    const startY = window.scrollY;
    const maxY = document.documentElement.scrollHeight - window.innerHeight;
    const endY = Math.max(0, Math.min(targetY, maxY));
    const dist = endY - startY;
    if (Math.abs(dist) < 2) return;
    // ~1s for a section hop, up to ~1.6s across the page
    const dur = Math.min(1600, Math.max(850, Math.abs(dist) * 0.35));
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      window.scrollTo(0, startY + dist * easeInOutQuint(p));
      scrollAnim = p < 1 ? requestAnimationFrame(step) : null;
    };
    scrollAnim = requestAnimationFrame(step);
  };

  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href");
      if (id.length <= 1) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 70;
      if (prefersReduced) {
        window.scrollTo(0, top);
      } else {
        smoothScrollTo(top);
      }
    });
  });

  /* ───────── Tilt on phone & dashboard (desktop) ───────── */
  if (finePointer && !prefersReduced) {
    document.querySelectorAll(".dashboard, .qr-card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const r = card.getBoundingClientRect();
        const rx = ((e.clientY - r.top) / r.height - 0.5) * -5;
        const ry = ((e.clientX - r.left) / r.width - 0.5) * 5;
        card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "";
      });
    });
  }
})();
