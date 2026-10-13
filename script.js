"use strict";
document.getElementById("year").textContent = new Date().getFullYear();
const searchInput = document.getElementById("repo-search");
const filterButtons = [...document.querySelectorAll(".filter-btn")];
const repositoryItems = [...document.querySelectorAll(".repo-item")];
const resultStatus = document.getElementById("results-count");
const emptyState = document.getElementById("empty-state");
const clearSearchButton = document.getElementById("clear-search");
let selectedCategory = "all";
function normalizeSearch(text) {
 return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
const searchIndex = new Map(repositoryItems.map((item) => [item, normalizeSearch(item.textContent)]));
function sortRepositoryItems() {
 const orderedItems = [...repositoryItems];
 if (selectedCategory === "all") {
  orderedItems.sort((a, b) => {
   const categoryPriority = Number(b.dataset.category === "sd") - Number(a.dataset.category === "sd");
   const starDifference = Number(b.querySelector(".stars").dataset.count) - Number(a.querySelector(".stars").dataset.count);
   return categoryPriority || starDifference;
  });
 } else if (selectedCategory === "sd") {
  orderedItems.sort((a, b) => a.querySelector(".repo-link").firstChild.textContent.trim().localeCompare(
   b.querySelector(".repo-link").firstChild.textContent.trim(), "en", { sensitivity: "base" }
  ));
 }
 document.getElementById("repo-list").append(...orderedItems);
}
function updateResults() {
 const terms = normalizeSearch(searchInput.value).split(" ").filter(Boolean);
 let visibleCount = 0;
 repositoryItems.forEach((item) => {
  const categoryMatches = selectedCategory === "all" || item.dataset.category === selectedCategory;
  const textMatches = terms.every((term) => searchIndex.get(item).includes(term));
  item.hidden = !(categoryMatches && textMatches);
  if (!item.hidden) visibleCount++;
 });
 filterButtons.forEach((button) => {
  const active = button.dataset.filter === selectedCategory;
  button.classList.toggle("active", active);
  button.setAttribute("aria-pressed", String(active));
 });
 resultStatus.textContent = `${visibleCount} ${visibleCount === 1 ? "repository" : "repositories"}`;
 emptyState.hidden = visibleCount > 0;
 clearSearchButton.hidden = searchInput.value.length === 0;
 sortRepositoryItems();
}
filterButtons.forEach((button) => button.addEventListener("click", () => {
 selectedCategory = button.dataset.filter;
 updateResults();
}));
searchInput.addEventListener("input", updateResults);
clearSearchButton.addEventListener("click", () => {
 searchInput.value = "";
 updateResults();
 searchInput.focus();
});
document.getElementById("reset-filters").addEventListener("click", () => {
 selectedCategory = "all";
 searchInput.value = "";
 updateResults();
 searchInput.focus();
});
updateResults();
document.getElementById("catalog-tools").hidden = false;
/* One public request refreshes stats; the project selection remains editorial. */
function readCache(key) {
 try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
}
function writeCache(key, value) {
 try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
}
function applyRepositoryStats(repositories) {
 if (!Array.isArray(repositories)) return;
 const counts = new Map(repositories.filter((repo) => typeof repo.name === "string" && Number.isInteger(repo.stargazers_count) && repo.stargazers_count >= 0).map((repo) => [repo.name, repo.stargazers_count]));
 document.querySelectorAll(".stars[data-repo]").forEach((element) => {
  const name = element.dataset.repo.split("/")[1];
  if (!counts.has(name)) return;
  const count = counts.get(name);
  element.dataset.count = String(count);
  element.querySelector(".star-value").textContent = String(count);
  element.setAttribute("aria-label", `${count} GitHub stars`);
 });
 sortRepositoryItems();
}
async function refreshRepositoryStats() {
 const key = "public-repositories:eduardoabreu81";
 const cached = readCache(key);
 if (Array.isArray(cached)) { applyRepositoryStats(cached); return; }
 try {
  const response = await fetch("https://api.github.com/users/eduardoabreu81/repos?per_page=100&type=owner", { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) return;
  const repositories = await response.json();
  if (!Array.isArray(repositories)) return;
  const stats = repositories.map(({ name, stargazers_count }) => ({ name, stargazers_count }));
  writeCache(key, stats);
  applyRepositoryStats(stats);
 } catch { /* Keep the real static counts when offline or rate-limited. */ }
}
async function refreshNpmVersion(element) {
 const pkg = element.dataset.npmPackage;
 const key = `npm-version:${pkg}`;
 const cached = readCache(key);
 if (typeof cached === "string" && cached.length > 0) { element.textContent = `v${cached}`; return; }
 try {
  const response = await fetch(`https://registry.npmjs.org/${encodeURIComponent(pkg)}/latest`, { headers: { Accept: "application/json" } });
  if (!response.ok) return;
  const data = await response.json();
  if (typeof data.version !== "string") return;
  element.textContent = `v${data.version}`;
  writeCache(key, data.version);
 } catch { /* Keep the static package version when unavailable. */ }
}
refreshRepositoryStats();
document.querySelectorAll(".npm-version[data-npm-package]").forEach(refreshNpmVersion);
