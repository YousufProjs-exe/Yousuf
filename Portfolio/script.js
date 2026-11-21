(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const page = document.body.dataset.page;
  const year = $("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
  const active = document.querySelector(`.index a[data-page="${page}"]`);
  if (active) active.setAttribute("aria-current", "page");

  // Scroll ruler is also the only always-visible progress indicator.
  let frame = 0;
  const updateScroll = () => {
    const max = document.documentElement.scrollHeight - innerHeight;
    const progress = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
    document.documentElement.style.setProperty(
      "--scroll",
      `${progress * 100}%`,
    );
    const pct = $("#pct");
    if (pct) pct.textContent = `${Math.round(progress * 100)}%`;
    const scene = $("[data-scene]");
    if (
      scene &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      innerWidth > 560
    ) {
      const rect = scene.getBoundingClientRect();
      const span = Math.max(1, rect.height - innerHeight);
      const p = Math.max(0, Math.min(1, -rect.top / span));
      const object = $(".scene-object", scene);
      const copy = $(".hero-copy", scene);
      if (object)
        object.style.transform = `translate3d(0, ${p * 76}px, 0) rotateY(${-15 + p * 15}deg) rotateX(${5 - p * 5}deg) rotateZ(${-1 + p}deg)`;
      if (copy) copy.style.opacity = String(1 - p * 0.18);
    }
    frame = 0;
  };
  addEventListener(
    "scroll",
    () => {
      if (!frame) frame = requestAnimationFrame(updateScroll);
    },
    { passive: true },
  );
  addEventListener("resize", updateScroll);
  updateScroll();

  // Reveal only the larger content groups; no staggered card choreography.
  if (
    "IntersectionObserver" in window &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );
    document
      .querySelectorAll("[data-reveal]")
      .forEach((el) => observer.observe(el));
  } else {
    document
      .querySelectorAll("[data-reveal]")
      .forEach((el) => el.classList.add("is-visible"));
  }

  // GitHub archive: all public repositories, searchable without client libraries.
  const list = $("#repos");
  if (!list) return;
  const status = $("#repo-status");
  const filter = $("#repo-filter");
  const fallback = $("#repo-fallback");
  let repositories = [];
  const formatDate = (value) => {
    if (!value) return "—";
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      year: "numeric",
    });
  };
  const render = () => {
    const term = (filter?.value || "").trim().toLowerCase();
    const visible = repositories.filter((repo) =>
      [repo.name, repo.description, repo.language]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
    list.replaceChildren();
    visible.forEach((repo) => {
      const row = document.createElement("li");
      const link = document.createElement("a");
      link.href = repo.html_url;
      link.textContent = repo.name;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const description = document.createElement("p");
      description.textContent = repo.description || "No description added.";
      const language = document.createElement("span");
      language.textContent = repo.language || "—";
      const updated = document.createElement("span");
      updated.textContent = formatDate(repo.pushed_at);
      row.append(link, description, language, updated);
      list.append(row);
    });
    status.textContent = `${visible.length} of ${repositories.length} public repositories`;
  };
  async function loadRepositories() {
    try {
      const response = await fetch(
        "https://api.github.com/users/YousufProjs-exe/repos?per_page=100&sort=pushed&direction=desc",
        { headers: { Accept: "application/vnd.github+json" } },
      );
      if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
      const data = await response.json();
      repositories = data.filter(
        (repo) => !repo.fork || repo.name.toLowerCase() === "sprig",
      );
      render();
      if (!repositories.length)
        status.textContent = "No public repositories were returned.";
    } catch (error) {
      status.textContent = "Could not load the repository list.";
      if (fallback) fallback.hidden = false;
    }
  }
  filter?.addEventListener("input", render);
  loadRepositories();
})();
