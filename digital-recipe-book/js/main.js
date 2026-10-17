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

  // Size ruled paper from each ShaderFill lineCount × host height.
  // Recipe Ingredients (data-margin=1): redistribute items to a uniform row
  // pitch, then draw even notebook rules so every bullet+text sits mid-gap.
  const ingredientInkMid = (p, paperTop) => {
    let textNode = null;
    const walk = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) {
      if (walk.currentNode.nodeValue && walk.currentNode.nodeValue.trim()) {
        textNode = walk.currentNode;
        break;
      }
    }
    if (textNode) {
      const full = textNode.nodeValue;
      const ts = full.length - full.trimStart().length;
      const te = full.trimEnd().length;
      const range = document.createRange();
      range.setStart(textNode, ts);
      range.setEnd(textNode, Math.max(ts + 1, te));
      const gr = range.getBoundingClientRect();
      if (gr.height > 0) return (gr.top + gr.bottom) / 2 - paperTop;
    }
    const r = p.getBoundingClientRect();
    return r.top - paperTop + Math.min(17, r.height * 0.36);
  };

  const collectIngredientItems = (root, paperRect) => {
    return [...root.querySelectorAll("p")]
      .filter((p) => {
        const t = p.textContent.trim();
        if (!t || /ingredients/i.test(t)) return false;
        const cs = getComputedStyle(p);
        if (cs.position !== "absolute") return false;
        const fs = parseFloat(cs.fontSize);
        if (fs < 20 || fs > 28) return false;
        const left = parseFloat(cs.left);
        if (!Number.isNaN(left) && (left < 100 || left > 250)) return false;
        const r = p.getBoundingClientRect();
        const mid = (r.top + r.bottom) / 2;
        return mid >= paperRect.top - 1 && mid <= paperRect.bottom + 1;
      })
      .map((p) => {
        const wrap =
          p.parentElement &&
          p.parentElement.classList &&
          p.parentElement.classList.contains("fig")
            ? p.parentElement
            : null;
        const bullet = wrap
          ? [...wrap.querySelectorAll("div.fig")].find((d) => {
              const w = parseFloat(getComputedStyle(d).width);
              const h = parseFloat(getComputedStyle(d).height);
              return w > 6 && w < 16 && h > 6 && h < 16;
            })
          : null;
        const top = parseFloat(p.style.top);
        const bulletTop = bullet ? parseFloat(bullet.style.top) : NaN;
        const bulletOffset = Number.isFinite(bulletTop) && Number.isFinite(top)
          ? bulletTop - top
          : 13.21;
        return {
          p,
          wrap,
          bullet,
          bulletOffset,
          top: Number.isFinite(top) ? top : p.getBoundingClientRect().top - paperRect.top,
          inkMid: ingredientInkMid(p, paperRect.top),
        };
      })
      .sort((a, b) => a.inkMid - b.inkMid);
  };

  const splitIngredientGroups = (items) => {
    if (!items.length) return [];
    const spacings = [];
    for (let i = 1; i < items.length; i++) {
      spacings.push(items[i].inkMid - items[i - 1].inkMid);
    }
    const median =
      spacings.length > 0
        ? [...spacings].sort((a, b) => a - b)[Math.floor(spacings.length / 2)]
        : 63;
    const groups = [];
    let cur = [items[0]];
    for (let i = 1; i < items.length; i++) {
      if (items[i].inkMid - items[i - 1].inkMid > median * 1.35) {
        groups.push(cur);
        cur = [items[i]];
      } else cur.push(items[i]);
    }
    groups.push(cur);
    return { groups, median };
  };

  const setAbsTop = (node, top) => {
    if (!node) return;
    node.style.top = `${top.toFixed(2)}px`;
  };

  const redistributeIngredientGroup = (group, median) => {
    if (group.length < 2) return median;
    const spacings = [];
    for (let i = 1; i < group.length; i++) {
      spacings.push(group[i].inkMid - group[i - 1].inkMid);
    }
    const gap = [...spacings].sort((a, b) => a - b)[Math.floor(spacings.length / 2)];
    // Keep first row; place the rest on a uniform CSS-top grid (same pitch).
    const top0 = group[0].top;
    const inkOffset = group[0].inkMid - top0;
    group.forEach((item, i) => {
      const newTop = top0 + i * gap;
      setAbsTop(item.p, newTop);
      setAbsTop(item.bullet, newTop + item.bulletOffset);
      if (item.wrap && /top:\s*[\d.]+px/.test(item.wrap.getAttribute("style") || "")) {
        const style = item.wrap.getAttribute("style") || "";
        item.wrap.setAttribute(
          "style",
          style.replace(/top:\s*[\d.]+px/, `top:${newTop.toFixed(2)}px`)
        );
      }
      item.top = newTop;
      item.inkMid = newTop + inkOffset;
    });
    return gap;
  };

  const ruleYsFromUniformMids = (groups, paperH, avoidBands) => {
    const ys = [];
    groups.forEach((g) => {
      if (!g.length) return;
      const gap =
        g.length >= 2 ? g[1].inkMid - g[0].inkMid : 63;
      const yMin = g[0].inkMid - gap * 0.85;
      const yMax = g[g.length - 1].inkMid + gap * 0.85;
      // Rules at inkMid ± gap/2 (exact mid-gap for every row).
      let y = g[0].inkMid - gap / 2;
      while (y > yMin) y -= gap;
      while (y < yMin - 1e-6) y += gap;
      while (y <= yMax + 1e-6) {
        ys.push(y);
        y += gap;
      }
    });
    ys.sort((a, b) => a - b);
    const uniq = [];
    ys.forEach((y) => {
      if (!uniq.length || Math.abs(y - uniq[uniq.length - 1]) > 0.5) uniq.push(y);
    });
    const bands = avoidBands || [];
    return uniq.filter((y) => {
      if (y < -2 || y > paperH + 2) return false;
      return !bands.some((b) => y >= b.top + 4 && y <= b.bottom - 4);
    });
  };

  const renderIngredientRules = (el, ys) => {
    el.querySelectorAll(".notebook-rule").forEach((n) => n.remove());
    ys.forEach((top) => {
      if (top < -2 || top > el.clientHeight + 2) return;
      const rule = document.createElement("div");
      rule.className = "notebook-rule";
      rule.setAttribute("aria-hidden", "true");
      rule.style.top = `${top.toFixed(2)}px`;
      el.appendChild(rule);
    });
  };

  const alignIngredientNotebook = (el) => {
    const host = el.parentElement;
    const paper = (host && host.parentElement) || host || el;
    const paperRect = paper.getBoundingClientRect();
    const paperH = paperRect.height || el.clientHeight || 0;

    const root =
      el.closest('[data-name="Ingredients"]') ||
      paper.closest('[data-name="Ingredients"]') ||
      document;
    const headerBands = [...root.querySelectorAll("p")]
      .filter((p) => /ingredients/i.test(p.textContent.trim()))
      .map((p) => {
        const r = p.getBoundingClientRect();
        return { top: r.top - paperRect.top, bottom: r.bottom - paperRect.top };
      });

    const items = collectIngredientItems(root, paperRect);
    if (!items.length) return;

    const { groups, median } = splitIngredientGroups(items);
    let pitch = median;
    groups.forEach((g) => {
      pitch = redistributeIngredientGroup(g, median) || pitch;
    });

    const ys = ruleYsFromUniformMids(groups, paperH, headerBands);
    renderIngredientRules(el, ys);
    el.style.setProperty("--line-gap", `${pitch}px`);
  };

  const syncNotebookLines = () => {
    document.querySelectorAll(".notebook-lines").forEach((el) => {
      if (el.getAttribute("data-margin") === "1") {
        alignIngredientNotebook(el);
        return;
      }
      const lc = parseInt(el.getAttribute("data-line-count") || "11", 10) || 11;
      const host = el.parentElement;
      const h = (host && host.clientHeight) || el.clientHeight;
      if (h > 0 && lc > 0) {
        el.style.setProperty("--line-gap", `${h / lc}px`);
      }
    });
  };
  syncNotebookLines();
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(syncNotebookLines).catch(() => {});
  }
  window.addEventListener("load", syncNotebookLines);

  // Looking for More: horizontal strip; nav via Pointers (182:2889) + keyboard (no visible scrollbar)
  const scroller = document.querySelector('[data-name="Scroll Bar"]');
  // Hotspots + Figma triangle nodes (both carry data-carousel-prev/next).
  const prevButtons = [
    ...document.querySelectorAll("[data-carousel-prev]"),
  ];
  const nextButtons = [
    ...document.querySelectorAll("[data-carousel-next]"),
  ];

  // Recipe card roots in the Looking for More strip (and unique image aliases).
  const linkMap = {
    "Chocolate Ganache": "recipes/chocolate-ganache.html",
    "Strawberry Compote": "recipes/strawberry-compote.html",
    "Banana Bread": "recipes/banana-bread.html",
    "Banana Crumble Muffins": "recipes/banana-crumble-muffins.html",
    "Chocolate Chip Muffins": "recipes/chocolate-chip-muffins.html",
    "Funnel Cake": "recipes/funnel-cake.html",
    "Lemon Poppyseed Loaf": "recipes/lemon-poppyseed-loaf.html",
    Brownies: "recipes/brownies.html",
    "Chocolate Brownies": "recipes/brownies.html",
    Cookies: "recipes/chocolate-chip-cookies.html",
    Cookie: "recipes/chocolate-chip-cookies.html",
    "Chocolate Chip Cookies": "recipes/chocolate-chip-cookies.html",
    "image 2": "recipes/brownies.html",
    "image 4": "recipes/banana-crumble-muffins.html",
    "image 6": "recipes/lemon-poppyseed-loaf.html",
    "image 9": "recipes/funnel-cake.html",
  };

  if (scroller) {
    // Prevent the browser from restoring a mid-strip overflow scrollLeft.
    try {
      if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    } catch (_) {
      /* ignore */
    }

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

      // Real <a> overlays on each recipe card paper so clicks always navigate
      // (works even if event delegation / drag suppress fails).
      const trackEl = scroller.querySelector(":scope > .carousel-track") || scroller;
      trackEl.querySelectorAll("a.carousel-card-link").forEach((a) => a.remove());
      const papers = [...trackEl.querySelectorAll("[data-node-id]")].filter(
        (el) => {
          const w = parseFloat(el.style.width);
          const h = parseFloat(el.style.height);
          // Card paper frames are ~336×175; skip nested images/titles.
          return w >= 300 && w <= 360 && h >= 150 && h <= 200 && el.style.left;
        }
      );
      const seenHref = new Set();
      papers.forEach((paper) => {
        let href = null;
        let n = paper;
        while (n && n !== scroller) {
          const name = n.getAttribute && n.getAttribute("data-name");
          if (name && linkMap[name]) {
            href = linkMap[name];
            break;
          }
          n = n.parentElement;
        }
        if (!href) {
          // Match nearby title text for display:contents groups
          const left = parseFloat(paper.style.left);
          const titles = [...trackEl.querySelectorAll("p")].filter((p) => {
            const pl = parseFloat(p.style.left);
            return !Number.isNaN(pl) && Math.abs(pl - (left + 250)) < 200;
          });
          for (const p of titles) {
            const t = (p.textContent || "").replace(/\s+/g, " ").trim();
            for (const [key, url] of Object.entries(linkMap)) {
              if (t === key || t === `${key} ` || t.includes(key)) {
                href = url;
                break;
              }
            }
            if (href) break;
            if (t === "Chocolate Chip Cookies") href = linkMap.Cookies;
            if (t === "Chocolate Brownies") href = linkMap.Brownies;
            if (href) break;
          }
        }
        if (!href || seenHref.has(href)) return;
        seenHref.add(href);
        const a = document.createElement("a");
        a.className = "carousel-card-link";
        a.href = href;
        a.setAttribute(
          "aria-label",
          `Open ${href.split("/").pop().replace(".html", "")}`
        );
        a.style.cssText = [
          "position:absolute",
          `left:${paper.style.left}`,
          `top:${paper.style.top || "34px"}`,
          `width:${paper.style.width}`,
          `height:${paper.style.height || "175px"}`,
          "z-index:20",
          "display:block",
          "cursor:pointer",
          "pointer-events:auto",
        ].join(";");
        trackEl.appendChild(a);
      });
    }

    // Default at the start of the strip (Cookies → … → Ganache).
    const resetScrollStart = () => {
      scroller.scrollLeft = 0;
      try {
        scroller.scrollTo({ left: 0, top: 0, behavior: "instant" });
      } catch (_) {
        scroller.scrollTo(0, 0);
      }
    };
    resetScrollStart();
    requestAnimationFrame(resetScrollStart);
    requestAnimationFrame(() => requestAnimationFrame(resetScrollStart));
    window.addEventListener("load", resetScrollStart);
    window.addEventListener("pageshow", (event) => {
      resetScrollStart();
      // bfcache restore can re-apply overflow scroll after pageshow.
      if (event.persisted) {
        setTimeout(resetScrollStart, 0);
        setTimeout(resetScrollStart, 50);
      }
    });
    setTimeout(resetScrollStart, 0);
    setTimeout(resetScrollStart, 50);
    setTimeout(resetScrollStart, 200);
    setTimeout(resetScrollStart, 500);
    // Images / fonts can shift layout and let the UA restore scroll — pin again.
    scroller.querySelectorAll("img").forEach((img) => {
      if (!img.complete) img.addEventListener("load", resetScrollStart, { once: true });
    });

    // One card ≈ 336px paper + ~32px gap.
    const step = 368;
    const scrollBy = (dir) => {
      scroller.scrollBy({ left: dir * step, behavior: "smooth" });
    };
    const bindArrow = (el, dir) => {
      if (!el) return;
      el.style.cursor = "pointer";
      el.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        scrollBy(dir);
      });
      el.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          scrollBy(dir);
        }
      });
    };
    prevButtons.forEach((el) => bindArrow(el, -1));
    nextButtons.forEach((el) => bindArrow(el, 1));
    document.addEventListener("keydown", (event) => {
      const tag = (event.target && event.target.tagName) || "";
      if (tag === "INPUT" || tag === "TEXTAREA" || event.target?.isContentEditable) {
        return;
      }
      if (event.key === "ArrowLeft") scrollBy(-1);
      if (event.key === "ArrowRight") scrollBy(1);
    });

    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    let moved = 0;
    let suppressClick = false;
    let activePointerId = null;
    scroller.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      // Do not capture yet — capturing on the scroller steals clicks from <a> overlays.
      dragging = true;
      moved = 0;
      suppressClick = false;
      activePointerId = event.pointerId;
      startX = event.clientX;
      startScroll = scroller.scrollLeft;
    });
    scroller.addEventListener("pointermove", (event) => {
      if (!dragging || event.pointerId !== activePointerId) return;
      const dx = event.clientX - startX;
      moved = Math.max(moved, Math.abs(dx));
      if (moved > 8) {
        if (
          typeof scroller.hasPointerCapture !== "function" ||
          !scroller.hasPointerCapture(event.pointerId)
        ) {
          try {
            scroller.setPointerCapture(event.pointerId);
          } catch (_) {
            /* ignore */
          }
        }
        scroller.scrollLeft = startScroll - dx;
      }
    });
    const endDrag = (event) => {
      if (event && activePointerId != null && event.pointerId !== activePointerId) {
        return;
      }
      suppressClick = moved > 8;
      dragging = false;
      moved = 0;
      activePointerId = null;
    };
    scroller.addEventListener("pointerup", endDrag);
    scroller.addEventListener("pointercancel", endDrag);

    const hrefFor = (el) => {
      let n = el;
      while (n && n !== scroller) {
        if (n.tagName === "A" && n.getAttribute("href")) {
          return n.getAttribute("href");
        }
        const name = n.getAttribute && n.getAttribute("data-name");
        if (name && linkMap[name]) return linkMap[name];
        n = n.parentElement;
      }
      return null;
    };

    scroller.querySelectorAll("[data-name]").forEach((el) => {
      if (hrefFor(el)) el.style.cursor = "pointer";
    });

    scroller.addEventListener("click", (event) => {
      const link =
        event.target.closest && event.target.closest("a.carousel-card-link");
      if (suppressClick) {
        event.preventDefault();
        event.stopPropagation();
        suppressClick = false;
        return;
      }
      // Always navigate programmatically — pointer capture / overlays can
      // cancel the native default even when the click event still fires.
      if (link) {
        event.preventDefault();
        window.location.assign(link.getAttribute("href"));
        return;
      }
      const href = hrefFor(event.target);
      if (href) window.location.assign(href);
    });
  }
})();
