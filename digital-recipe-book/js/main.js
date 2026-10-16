(() => {
  const scaleEl = document.querySelector("[data-frame-scale]");
  const frame = document.querySelector("[data-figma-frame]");

  // Fill the viewport width using zoom (affects layout; no side gutters).
  const applyScale = () => {
    if (!scaleEl || !frame) return;
    const s = Math.max(window.innerWidth / 1440, 0.5);
    scaleEl.style.zoom = String(s);
    scaleEl.style.transform = "";
    scaleEl.style.width = "1440px";
    // zoom already expands layout height; clear transform margin hack
    scaleEl.style.marginBottom = "0";
    document.documentElement.style.setProperty("--frame-scale", String(s));
  };
  applyScale();
  requestAnimationFrame(applyScale);
  window.addEventListener("resize", applyScale);
  window.addEventListener("load", applyScale);

  const findAbout = () => {
    const nodes = document.querySelectorAll(".frame *");
    for (const n of nodes) {
      if (
        n.childNodes.length &&
        n.textContent &&
        n.textContent.trim() === "About The Digital Recipe Book" &&
        n.children.length === 0
      ) {
        return n;
      }
    }
    return document.querySelector('[data-name*="About"]');
  };

  document.querySelectorAll('[data-nav="about"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const onHome =
        /(?:\/|index\.html)$/.test(location.pathname) ||
        location.pathname.endsWith("/digital-recipe-book/") ||
        location.pathname.endsWith("/digital-recipe-book");
      if (!onHome) return;
      const target = findAbout();
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", "#about");
    });
  });

  if (location.hash === "#about") {
    requestAnimationFrame(() => {
      findAbout()?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Size ruled paper from each ShaderFill lineCount × host height
  document.querySelectorAll(".notebook-lines").forEach((el) => {
    const lc = parseInt(el.getAttribute("data-line-count") || "11", 10) || 11;
    const host = el.parentElement;
    const h = (host && host.clientHeight) || el.clientHeight;
    if (h > 0 && lc > 0) {
      el.style.setProperty("--line-gap", `${h / lc}px`);
    }
  });

  // Looking for More: horizontal strip; nav via Pointers (182:2889) + keyboard (no visible scrollbar)
  const scroller = document.querySelector('[data-name="Scroll Bar"]');
  const prev = document.querySelector("[data-carousel-prev]");
  const next = document.querySelector("[data-carousel-next]");

  const linkMap = {
    "Banana Crumble Muffins": "recipes/banana-crumble-muffins.html",
    "Chocolate Chip Muffins": "recipes/chocolate-chip-muffins.html",
    "Funnel Cake": "recipes/funnel-cake.html",
    "Lemon Poppyseed Loaf": "recipes/lemon-poppyseed-loaf.html",
    "Banana Bread": "recipes/banana-bread.html",
    Cookie: "recipes/chocolate-chip-cookies.html",
    "Chocolate Chip Cookies": "recipes/chocolate-chip-cookies.html",
    "Chocolate Brownies": "recipes/brownies.html",
    Brownies: "recipes/brownies.html",
    "Strawberry Compote": "recipes/strawberry-compote.html",
    "Chocolate Ganache": "recipes/chocolate-ganache.html",
    "image 2": "recipes/brownies.html",
    "image 4": "recipes/banana-crumble-muffins.html",
    "image 6": "recipes/lemon-poppyseed-loaf.html",
    "image 9": "recipes/funnel-cake.html",
  };

  if (scroller) {
    scroller.style.overflowX = "auto";
    scroller.style.overflowY = "hidden";

    // Only shift Figma nodes — never inset-filled <img left:0> children.
    const movers = [];
    scroller.querySelectorAll("[data-node-id]").forEach((el) => {
      if (!el.style.left) return;
      const base = parseFloat(el.style.left);
      if (Number.isNaN(base)) return;
      const w = parseFloat(el.style.width);
      movers.push({ el, base, width: Number.isNaN(w) ? 0 : w });
    });

    if (movers.length) {
      const minLeft = Math.min(...movers.map((m) => m.base));
      const maxRight = Math.max(
        ...movers.map((m) => m.base + (m.width || 336))
      );
      const pad = 16;
      const trackW = Math.ceil(maxRight - minLeft + pad * 2);

      let track = scroller.querySelector(":scope > .carousel-track");
      if (!track) {
        track = document.createElement("div");
        track.className = "carousel-track";
        while (scroller.firstChild) track.appendChild(scroller.firstChild);
        scroller.appendChild(track);
      }
      track.style.cssText = `position:relative;width:${trackW}px;height:100%;`;

      movers.forEach(({ el, base }) => {
        el.style.left = `${base - minLeft + pad}px`;
      });

      // Resting view ~ Banana Crumble Muffins (Figma default)
      requestAnimationFrame(() => {
        const prefer = scroller.querySelector(
          '[data-name="Banana Crumble Muffins"]'
        );
        if (prefer && prefer.style.left) {
          scroller.scrollLeft = Math.max(0, parseFloat(prefer.style.left) - 40);
        } else {
          scroller.scrollLeft = Math.max(
            0,
            (trackW - scroller.clientWidth) / 2
          );
        }
      });
    }

    const step = 368;
    const scrollBy = (dir) => {
      scroller.scrollBy({ left: dir * step, behavior: "smooth" });
    };
    prev?.addEventListener("click", () => scrollBy(-1));
    next?.addEventListener("click", () => scrollBy(1));
    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") scrollBy(-1);
      if (event.key === "ArrowRight") scrollBy(1);
    });

    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let moved = 0;
    scroller.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      dragging = true;
      moved = 0;
      startX = event.clientX;
      startScroll = scroller.scrollLeft;
      try {
        scroller.setPointerCapture(event.pointerId);
      } catch (_) {
        /* ignore */
      }
    });
    scroller.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      const dx = event.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      scroller.scrollLeft = startScroll - dx;
    });
    const endDrag = () => {
      dragging = false;
    };
    scroller.addEventListener("pointerup", endDrag);
    scroller.addEventListener("pointercancel", endDrag);

    scroller.querySelectorAll("[data-name]").forEach((el) => {
      const href = linkMap[el.getAttribute("data-name") || ""];
      if (!href) return;
      el.style.cursor = "pointer";
      el.addEventListener("click", (event) => {
        if (moved > 8) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        location.href = href;
      });
    });
  }
})();
