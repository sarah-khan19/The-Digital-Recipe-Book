(() => {
  const scaleEl = document.querySelector("[data-frame-scale]");
  const frame = document.querySelector("[data-figma-frame]");

  const applyScale = () => {
    if (!scaleEl || !frame) return;
    const s = Math.min(window.innerWidth, 1440) / 1440;
    scaleEl.style.transform = `scale(${s})`;
    scaleEl.style.width = "1440px";
    const h = frame.offsetHeight * s;
    scaleEl.style.marginBottom = `${h - frame.offsetHeight}px`;
    document.documentElement.style.setProperty("--frame-scale", String(s));
  };
  applyScale();
  window.addEventListener("resize", applyScale);

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
      if (!onHome) return; // follow href to index.html#about
      const target = findAbout();
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      history.replaceState(null, "", "#about");
    });
  });

  if (location.hash === "#about") {
    requestAnimationFrame(() => {
      const target = findAbout();
      target?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // Carousel: shift absolute-positioned recipe cards inside View All Recipes Section
  const section = document.querySelector('[data-name="View All Recipes Section"]');
  const prev = document.querySelector("[data-carousel-prev]");
  const next = document.querySelector("[data-carousel-next]");
  if (section && (prev || next)) {
    section.style.overflow = "hidden";
    const movers = [];
    section.querySelectorAll(":scope > *").forEach((el) => {
      const left = el.style.left;
      if (!left) return;
      const base = parseFloat(left);
      if (Number.isNaN(base)) return;
      movers.push({ el, base });
    });
    // If direct children lack left, gather descendants with data-name recipe cards
    if (movers.length < 3) {
      movers.length = 0;
      section.querySelectorAll("[data-name]").forEach((el) => {
        if (!el.style.left) return;
        const base = parseFloat(el.style.left);
        if (Number.isNaN(base)) return;
        movers.push({ el, base });
      });
    }

    let offset = 0;
    const step = 368;
    const minOffset = -368 * 6;
    const maxOffset = 368 * 2;
    const apply = () => {
      movers.forEach(({ el, base }) => {
        el.style.left = `${base + offset}px`;
      });
    };
    const scrollBy = (dir) => {
      offset = Math.max(minOffset, Math.min(maxOffset, offset + dir * -step));
      apply();
    };
    prev?.addEventListener("click", () => scrollBy(-1));
    next?.addEventListener("click", () => scrollBy(1));
    document.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") scrollBy(-1);
      if (event.key === "ArrowRight") scrollBy(1);
    });

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
    section.querySelectorAll("[data-name]").forEach((el) => {
      const href = linkMap[el.getAttribute("data-name") || ""];
      if (!href) return;
      el.style.cursor = "pointer";
      el.addEventListener("click", () => {
        location.href = href;
      });
    });
  }
})();
