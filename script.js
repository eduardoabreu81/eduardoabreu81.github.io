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
/* The public queue mirrors open requests; the repository issues remain the source of truth. */
const requestList = document.getElementById("request-list");
const requestCountLabel = document.getElementById("request-count");
const requestNote = document.getElementById("request-note");
const queueLimit = 6;
const arrowPath = "M6 18 18 6M6 6h12v12";
const votePath = "M7 10.6V20H4.6A1.6 1.6 0 0 1 3 18.4v-6.2a1.6 1.6 0 0 1 1.6-1.6ZM7 10.6l3.9-7.2a2 2 0 0 1 2.8 2.5l-1.2 4h5a2.2 2.2 0 0 1 2.2 2.7l-1.1 5.5A2.6 2.6 0 0 1 16 20H7";
function createIcon(pathData) {
 const namespace = "http://www.w3.org/2000/svg";
 const svg = document.createElementNS(namespace, "svg");
 svg.setAttribute("class", "icon");
 svg.setAttribute("viewBox", "0 0 24 24");
 svg.setAttribute("fill", "none");
 svg.setAttribute("stroke", "currentColor");
 svg.setAttribute("stroke-width", "1.6");
 svg.setAttribute("aria-hidden", "true");
 const path = document.createElementNS(namespace, "path");
 path.setAttribute("d", pathData);
 svg.append(path);
 return svg;
}
function createTag(text, className) {
 const tag = document.createElement("span");
 tag.className = className;
 tag.textContent = text;
 return tag;
}
function createRequestRow(request) {
 const item = document.createElement("li");
 item.className = "request-item";
 const link = document.createElement("a");
 link.className = "request-title";
 link.href = request.url;
 link.target = "_blank";
 link.rel = "noopener noreferrer";
 link.append(request.title, createIcon(arrowPath), createTag("opens in a new tab", "sr-only"));
 const meta = document.createElement("p");
 meta.className = "request-meta";
 const votes = document.createElement("span");
 votes.className = "request-votes";
 votes.setAttribute("aria-label", `${request.votes} ${request.votes === 1 ? "vote" : "votes"}`);
 votes.append(createIcon(votePath), String(request.votes));
 meta.append(votes);
 if (request.comments > 0) meta.append(createTag(`${request.comments} ${request.comments === 1 ? "comment" : "comments"}`, "request-comments"));
 request.labels.slice(0, 2).forEach((label) => meta.append(createTag(label, "project-status")));
 const opened = document.createElement("time");
 opened.dateTime = request.created;
 opened.textContent = new Date(request.created).toLocaleDateString("en", { year: "numeric", month: "short", day: "numeric" });
 meta.append(opened);
 item.append(link, meta);
 return item;
}
function renderRequestQueue(requests) {
 const ordered = [...requests].sort((a, b) => (b.votes - a.votes) || (b.comments - a.comments) || b.created.localeCompare(a.created));
 const shown = ordered.slice(0, queueLimit);
 requestList.replaceChildren(...shown.map(createRequestRow));
 requestList.hidden = shown.length === 0;
 requestCountLabel.textContent = ordered.length > 0 ? `${ordered.length} open` : "";
 requestCountLabel.hidden = ordered.length === 0;
 if (ordered.length === 0) requestNote.textContent = "No open requests yet — yours would be the first.";
 else if (ordered.length > shown.length) requestNote.textContent = `Showing the ${shown.length} most supported. A thumbs up on GitHub counts as a vote.`;
 else requestNote.textContent = "A thumbs up on GitHub counts as a vote.";
}
function readRequest(issue) {
 const labels = Array.isArray(issue.labels) ? issue.labels : [];
 return {
  title: String(issue.title ?? "").trim(),
  url: String(issue.html_url ?? ""),
  votes: Number(issue.reactions?.["+1"]) || 0,
  comments: Number(issue.comments) || 0,
  created: String(issue.created_at ?? ""),
  labels: labels.map((label) => (typeof label === "string" ? label : String(label?.name ?? ""))).filter((name) => name && name !== "request")
 };
}
async function refreshRequestQueue() {
 const key = "open-requests:eduardoabreu81.github.io";
 const cached = readCache(key);
 if (Array.isArray(cached)) { renderRequestQueue(cached); return; }
 try {
  const response = await fetch("https://api.github.com/repos/eduardoabreu81/eduardoabreu81.github.io/issues?state=open&labels=request&per_page=30", { headers: { Accept: "application/vnd.github+json" } });
  if (!response.ok) return;
  const issues = await response.json();
  if (!Array.isArray(issues)) return;
  const requests = issues.filter((issue) => issue && !issue.pull_request).map(readRequest).filter((request) => request.title && request.url.startsWith("https://github.com/") && request.created);
  writeCache(key, requests);
  renderRequestQueue(requests);
 } catch { /* Keep the static note when offline or rate-limited. */ }
}
refreshRequestQueue();
