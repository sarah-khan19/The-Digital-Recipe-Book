(() => {
  const aboutLinks = document.querySelectorAll('[data-nav="about"]');
  aboutLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const about = document.getElementById("about");
      if (about) {
        event.preventDefault();
        about.scrollIntoView({ behavior: "smooth", block: "start" });
        history.replaceState(null, "", "#about");
      }
    });
  });

  if (location.hash === "#about") {
    const about = document.getElementById("about");
    if (about) {
      requestAnimationFrame(() => {
        about.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }

  const track = document.querySelector("[data-carousel-track]");
  if (!track) return;

  const prev = document.querySelector("[data-carousel-prev]");
  const next = document.querySelector("[data-carousel-next]");
  const card = track.querySelector(".carousel-card");
  const step = () => (card ? card.getBoundingClientRect().width + 20 : 300);

  const scrollByDir = (dir) => {
    track.scrollBy({ left: dir * step(), behavior: "smooth" });
  };

  prev?.addEventListener("click", () => scrollByDir(-1));
  next?.addEventListener("click", () => scrollByDir(1));

  track.setAttribute("tabindex", "0");
  track.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByDir(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByDir(1);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.target !== document.body && event.target !== track) return;
    if (event.key === "ArrowLeft") scrollByDir(-1);
    if (event.key === "ArrowRight") scrollByDir(1);
  });
})();
