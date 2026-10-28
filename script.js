"use strict";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
document.getElementById("year").textContent = new Date().getFullYear();

/* ── counters ──────────────────────────────────────────────
   The totals are already correct in the markup; the animation
   only walks up to them, so the page reads the same without JS. */
function settle(element) {
 const target = Number(element.dataset.count);
 if (!Number.isFinite(target) || reduceMotion) return;
 const started = performance.now();
 const step = (now) => {
  const progress = Math.min((now - started) / 1000, 1);
  element.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 4))));
  if (progress < 1) requestAnimationFrame(step);
 };
 requestAnimationFrame(step);
}
document.querySelectorAll(".counts dd[data-count]").forEach(settle);

/* ── featured banner ──────────────────────────────────────
   One project per area opens the rotation, so the range of the
   work reads before its depth. Hovering or focusing it pauses. */
const banner = document.getElementById("banner");
const slideSource = document.getElementById("slides");
let slides = [];
try { slides = JSON.parse(slideSource.textContent); } catch { slides = []; }

if (banner && slides.length > 1) {
 const eyebrow = document.getElementById("banner-eyebrow");
 const title = document.getElementById("banner-title");
 const description = document.getElementById("banner-desc");
 const link = document.getElementById("banner-link");
 const queueItems = [...document.querySelectorAll("#banner-queue li")];
 const track = document.getElementById("banner-track");
 const controls = document.getElementById("banner-ctl");
 const progress = track.querySelector("i");
 const toggleButton = controls.querySelector("[data-toggle]");
 const holdFor = 5400;
 let current = 0;
 let playing = !reduceMotion;
 let since = performance.now();

 track.hidden = false;
 controls.hidden = false;
 toggleButton.textContent = playing ? "Pause" : "Play";

 function maskedTitle(name) {
  const words = name.split(" ");
  const rows = words.length <= 3
   ? [name]
   : [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")];
  return rows.map((row) => {
   const mask = document.createElement("span");
   mask.className = "mask";
   const inner = document.createElement("i");
   inner.textContent = row;
   mask.append(inner);
   return mask;
  });
 }

 function show(index) {
  current = (index + slides.length) % slides.length;
  const slide = slides[current];
  banner.dataset.tint = slide.tint;

  eyebrow.replaceChildren();
  const area = document.createElement("span");
  area.className = "banner-cat";
  area.textContent = slide.label;
  eyebrow.append(area);
  if (slide.isNew) {
   const flag = document.createElement("span");
   flag.className = "flag";
   flag.textContent = "New";
   eyebrow.append(flag);
  }
  if (slide.status) {
   const status = document.createElement("span");
   status.className = "banner-status";
   status.textContent = slide.status;
   eyebrow.append(status);
  }
  const stars = document.createElement("span");
  stars.className = "banner-stars";
  stars.textContent = `${slide.stars} ${slide.stars === 1 ? "star" : "stars"}`;
  eyebrow.append(stars);

  title.classList.remove("is-entering");
  title.replaceChildren(...maskedTitle(slide.name));
  void title.offsetWidth;
  title.classList.add("is-entering");

  description.textContent = slide.desc;
  link.href = slide.url;
  queueItems.forEach((item, position) => item.classList.toggle("on", position === current));
  since = performance.now();
 }

 document.getElementById("banner-queue").addEventListener("click", (event) => {
  const item = event.target.closest(".queue-item");
  if (!item || event.metaKey || event.ctrlKey || event.shiftKey) return;
  event.preventDefault();
  show(Number(item.dataset.index));
 });
 controls.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.hasAttribute("data-toggle")) {
   playing = !playing;
   button.textContent = playing ? "Pause" : "Play";
   since = performance.now();
   return;
  }
  show(current + Number(button.dataset.step));
 });
 banner.addEventListener("pointerenter", () => { playing = false; toggleButton.textContent = "Play"; });

 const tick = (now) => {
  if (playing) {
   const progressed = Math.min((now - since) / holdFor, 1);
   progress.style.width = `${progressed * 100}%`;
   if (progressed >= 1) show(current + 1);
  }
  requestAnimationFrame(tick);
 };
 requestAnimationFrame(tick);
}

/* ── project index ─────────────────────────────────────── */
const entries = [...document.querySelectorAll(".entry")];
const indexList = document.getElementById("index");
const chips = [...document.querySelectorAll(".chip")];
const searchField = document.getElementById("search-field");
const searchInput = document.getElementById("project-search");
const searchClear = document.getElementById("search-clear");
const resultCount = document.getElementById("results-count");
const emptyState = document.getElementById("empty-state");
const weightOf = { w6: 0, w4: 1, "": 2 };
let area = "all";

function normalize(text) {
 return text.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
/* Index the real content only: the screen-reader hints would match everything. */
const searchable = new Map(entries.map((entry) => {
 const parts = [
  entry.querySelector(".entry-link")?.firstChild?.textContent ?? "",
  entry.querySelector(".entry-dek")?.textContent ?? "",
  entry.querySelector(".entry-cat")?.textContent ?? "",
  [...entry.querySelectorAll(".entry-panel p")].map((p) => p.textContent).join(" "),
  entry.dataset.repo
 ];
 return [entry, normalize(parts.join(" "))];
}));

/* Editorial weight first, adoption only as a tie-breaker. */
function sortEntries() {
 const ordered = [...entries].sort((a, b) => {
  const byWeight = weightOf[a.dataset.size] - weightOf[b.dataset.size];
  if (byWeight) return byWeight;
  const byStars = Number(b.querySelector(".stars").dataset.count) - Number(a.querySelector(".stars").dataset.count);
  if (byStars) return byStars;
  return a.querySelector(".entry-link").textContent.localeCompare(
   b.querySelector(".entry-link").textContent, "en", { sensitivity: "base" });
 });
 indexList.append(...ordered);
}

function applyFilters() {
 const terms = normalize(searchInput.value).split(" ").filter(Boolean);
 let shown = 0;
 entries.forEach((entry) => {
  const areaMatches = area === "all" || entry.dataset.category === area;
  const textMatches = terms.every((term) => searchable.get(entry).includes(term));
  const visible = areaMatches && textMatches;
  entry.classList.toggle("is-hidden", !visible);
  if (visible) shown++;
 });
 chips.forEach((chip) => {
  const active = chip.dataset.filter === area;
  chip.classList.toggle("is-on", active);
  chip.setAttribute("aria-pressed", String(active));
 });
 resultCount.textContent = `${shown} ${shown === 1 ? "project" : "projects"}`;
 emptyState.hidden = shown > 0;
 searchClear.hidden = searchInput.value.length === 0;
}

chips.forEach((chip) => chip.addEventListener("click", () => {
 area = chip.dataset.filter;
 applyFilters();
}));
searchInput.addEventListener("input", applyFilters);
searchClear.addEventListener("click", () => {
 searchInput.value = "";
 applyFilters();
 searchInput.focus();
});
document.getElementById("reset-filters").addEventListener("click", () => {
 area = "all";
 searchInput.value = "";
 applyFilters();
 searchInput.focus();
});

/* The expandable notes need JS, so the control only appears with it. */
indexList.addEventListener("click", (event) => {
 const button = event.target.closest(".entry-more");
 if (!button) return;
 const panel = document.getElementById(button.getAttribute("aria-controls"));
 if (!panel) return;
 const open = button.getAttribute("aria-expanded") === "true";
 button.setAttribute("aria-expanded", String(!open));
 panel.hidden = open;
});

searchField.hidden = false;
sortEntries();
applyFilters();

/* ── live figures ──────────────────────────────────────────
   One public request refreshes the counts; the selection and the
   editorial weight stay as written. Static numbers survive offline. */
function readCache(key) {
 try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
}
function writeCache(key, value) {
 try { sessionStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
}

function applyRepositoryStats(repositories) {
 if (!Array.isArray(repositories)) return;
 const counts = new Map(repositories
  .filter((repo) => typeof repo.name === "string" && Number.isInteger(repo.stargazers_count) && repo.stargazers_count >= 0)
  .map((repo) => [repo.name, repo.stargazers_count]));
 document.querySelectorAll(".entry .stars[data-repo]").forEach((element) => {
  const name = element.dataset.repo.split("/")[1];
  if (!counts.has(name)) return;
  const count = counts.get(name);
  element.dataset.count = String(count);
  element.querySelector(".star-value").textContent = String(count);
  element.setAttribute("aria-label", `${count} GitHub ${count === 1 ? "star" : "stars"}`);
  const queued = document.querySelector(`.queue-item[href$="/${name}"] .star-value`);
  if (queued) queued.textContent = String(count);
  const slide = slides.find((item) => item.repo === name);
  if (slide) slide.stars = count;
 });
 const total = [...document.querySelectorAll(".entry .stars[data-repo]")]
  .reduce((sum, element) => sum + Number(element.dataset.count), 0);
 const totalElement = document.getElementById("total-stars");
 totalElement.dataset.count = String(total);
 totalElement.textContent = String(total);
 sortEntries();
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

/* ── request queue ─────────────────────────────────────────
   The repository issues remain the source of truth. */
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
 link.append(request.title, createIcon(arrowPath), createTag(" (opens in a new tab)", "sr-only"));
 const meta = document.createElement("p");
 meta.className = "request-meta";
 const votes = document.createElement("span");
 votes.className = "request-votes";
 votes.setAttribute("aria-label", `${request.votes} ${request.votes === 1 ? "vote" : "votes"}`);
 votes.append(createIcon(votePath), String(request.votes));
 meta.append(votes);
 if (request.comments > 0) meta.append(createTag(`${request.comments} ${request.comments === 1 ? "comment" : "comments"}`, "request-comments"));
 request.labels.slice(0, 2).forEach((label) => meta.append(createTag(label, "request-label")));
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
