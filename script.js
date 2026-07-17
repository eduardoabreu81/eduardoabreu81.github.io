document.getElementById("year").textContent = new Date().getFullYear();

const buttons = document.querySelectorAll(".filter-btn");
const sections = document.querySelectorAll(".project-section");

buttons.forEach((btn) => {
  btn.addEventListener("click", () => {
    buttons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const filter = btn.dataset.filter;

    sections.forEach((section) => {
      section.classList.toggle("hidden", filter !== "all" && section.dataset.section !== filter);
    });
  });
});

function animateCount(el) {
  const target = parseInt(el.dataset.count, 10) || 0;
  if (target === 0) return;

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
  card.style.animationDelay = `${(index % 6) * 60}ms`;
  observer.observe(card);
});
