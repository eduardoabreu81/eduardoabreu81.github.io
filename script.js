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
