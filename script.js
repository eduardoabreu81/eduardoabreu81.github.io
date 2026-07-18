document.getElementById("year").textContent = new Date().getFullYear();

const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerQuery = window.matchMedia("(pointer: fine)");
let prefersReducedMotion = reduceMotionQuery.matches;
let hasFinePointer = finePointerQuery.matches;

reduceMotionQuery.addEventListener("change", (e) => {
  prefersReducedMotion = e.matches;
});
finePointerQuery.addEventListener("change", (e) => {
  hasFinePointer = e.matches;
});

/* ---------- Filters with sliding pill indicator ---------- */

const buttons = document.querySelectorAll(".filter-btn");
const sections = document.querySelectorAll(".project-section");
const filterIndicator = document.querySelector(".filter-indicator");

function moveIndicatorTo(btn) {
  if (!filterIndicator || !btn) return;
  const nav = btn.parentElement;
  const navRect = nav.getBoundingClientRect();
  const btnRect = btn.getBoundingClientRect();
  filterIndicator.style.width = `${btnRect.width}px`;
  filterIndicator.style.transform = `translateX(${btnRect.left - navRect.left}px)`;
}

buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    buttons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    moveIndicatorTo(btn);

    const filter = btn.dataset.filter;

    sections.forEach((section) => {
      section.classList.toggle("hidden", filter !== "all" && section.dataset.section !== filter);
    });
  });
});

window.addEventListener("load", () => {
  const active = document.querySelector(".filter-btn.active");
  moveIndicatorTo(active);
});
window.addEventListener("resize", () => {
  const active = document.querySelector(".filter-btn.active");
  moveIndicatorTo(active);
});

/* ---------- Star count-up ---------- */

function animateCount(el) {
  const target = parseInt(el.dataset.count, 10) || 0;
  if (target === 0) return;

  if (prefersReducedMotion) {
    el.textContent = target;
    return;
  }

  const duration = 800;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(eased * target);
    if (progress < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

/* ---------- Staggered scroll reveal ---------- */

const cards = document.querySelectorAll(".card");

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const card = entry.target;
      card.classList.add("in-view");
      const starsEl = card.querySelector(".stars");
      if (starsEl) animateCount(starsEl);
      observer.unobserve(card);
    });
  },
  { threshold: 0.15 }
);

cards.forEach((card, index) => {
  card.style.animationDelay = prefersReducedMotion ? "0ms" : `${(index % 6) * 60}ms`;
  observer.observe(card);
});

/* ---------- Card tilt + cursor-aware glow ---------- */

cards.forEach((card) => {
  let rafId = null;

  card.addEventListener("pointermove", (e) => {
    if (prefersReducedMotion || !hasFinePointer) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const px = x / rect.width;
    const py = y / rect.height;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const rotateY = (px - 0.5) * 8;
      const rotateX = (0.5 - py) * 8;
      card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
      card.style.setProperty("--mx", `${px * 100}%`);
      card.style.setProperty("--my", `${py * 100}%`);
    });
  });

  card.addEventListener("pointerleave", () => {
    if (rafId) cancelAnimationFrame(rafId);
    card.style.transform = "";
  });
});

/* ---------- Magnetic buttons ---------- */

const magneticEls = document.querySelectorAll(".magnetic");

magneticEls.forEach((el) => {
  let rafId = null;

  el.addEventListener("pointermove", (e) => {
    if (prefersReducedMotion || !hasFinePointer) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      el.style.transform = `translate(${x * 0.25}px, ${y * 0.3}px)`;
    });
  });

  el.addEventListener("pointerleave", () => {
    if (rafId) cancelAnimationFrame(rafId);
    el.style.transform = "";
  });
});

/* ---------- Hero parallax (mouse + scroll) ---------- */

const hero = document.querySelector(".hero");
const heroContent = document.querySelector(".hero-content");
const meshOrbs = document.querySelectorAll(".mesh-orb");

if (hero && !prefersReducedMotion) {
  hero.addEventListener("pointermove", (e) => {
    if (!hasFinePointer) return;
    const rect = hero.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;

    if (heroContent) {
      heroContent.style.transform = `translate(${px * 10}px, ${py * 8}px)`;
    }
    meshOrbs.forEach((orb, i) => {
      const depth = (i + 1) * 14;
      orb.style.transform = `translate(${px * depth}px, ${py * depth}px)`;
    });
  });

  hero.addEventListener("pointerleave", () => {
    if (heroContent) heroContent.style.transform = "";
    meshOrbs.forEach((orb) => {
      orb.style.transform = "";
    });
  });

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;
      const heroHeight = hero.offsetHeight || 1;
      const progress = Math.min(y / heroHeight, 1);
      if (heroContent) {
        heroContent.style.opacity = String(1 - progress * 0.8);
      }
      ticking = false;
    });
  });
}

/* ---------- Ambient particle field ---------- */

const canvas = document.getElementById("particle-field");

if (canvas) {
  const ctx = canvas.getContext("2d");
  let particles = [];
  let width = 0;
  let height = 0;
  let animationId = null;

  function resizeCanvas() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width;
    height = rect.height;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function createParticles() {
    const count = Math.round((width * height) / 16000);
    particles = Array.from({ length: Math.min(count, 70) }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.4,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      alpha: Math.random() * 0.5 + 0.2,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = width;
      if (p.x > width) p.x = 0;
      if (p.y < 0) p.y = height;
      if (p.y > height) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(127, 168, 255, ${p.alpha})`;
      ctx.fill();
    });
    animationId = requestAnimationFrame(draw);
  }

  function drawStatic() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(127, 168, 255, ${p.alpha})`;
      ctx.fill();
    });
  }

  function init() {
    resizeCanvas();
    createParticles();
    if (animationId) cancelAnimationFrame(animationId);
    if (prefersReducedMotion) {
      drawStatic();
    } else {
      draw();
    }
  }

  init();
  window.addEventListener("resize", init);
}
