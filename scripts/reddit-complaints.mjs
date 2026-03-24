import fs from "node:fs";
import path from "node:path";

const KEYWORDS = [
  "i wish there was",
  "i wish",
  "wish there was",
  "i hate when",
  "hate when",
  "too complex",
  "too complicated",
  "too hard",
  "pain point",
  "someone please build",
  "please build",
];

const OUTPUT_FILE = "complaints_ideas.csv";
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 5;

const HN_KEYWORDS = ["ask hn", "show hn", "saas", "startup", "adhd", "tool"];
const HN_MAX_STORIES = 500;
const GH_MAX_ISSUES_PER_REPO = 120;
const GH_REPOS = [
  "microsoft/vscode",
  "sindresorhus/awesome",
  "supabase/supabase",
  "vercel/next.js",
  "mattermost/mattermost",
  "home-assistant/core",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function csvEscape(s) {
  const str = String(s ?? "").replace(/\r?\n/g, " ");
  if (str.includes(",") || str.includes("\"")) {
    return `"${str.replace(/"/g, "\"\"")}"`;
  }
  return str;
}

function matchKeyword(text) {
  const t = String(text || "").toLowerCase();
  for (const keyword of KEYWORDS) {
    if (t.includes(keyword)) return keyword;
  }
  return null;
}

function createdWithin1Year(isoString) {
  const ts = Date.parse(isoString);
  if (Number.isNaN(ts)) return false;
  return Date.now() - ts <= ONE_YEAR_MS;
}

async function fetchJsonWithRetry(url, options = {}, retries = MAX_RETRIES) {
  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);

      if (response.status === 429 || (response.status >= 500 && response.status <= 599)) {
        if (attempt >= retries) {
          const text = await response.text().catch(() => "");
          throw new Error(`HTTP ${response.status} after retries: ${text}`);
        }
        const retryAfter = Number(response.headers.get("retry-after") || 0);
        const backoff = retryAfter > 0 ? retryAfter * 1000 : 500 * Math.pow(2, attempt);
        await sleep(backoff + Math.floor(Math.random() * 300));
        attempt += 1;
        continue;
      }

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      return response.json();
    } catch (err) {
      clearTimeout(timer);
      if (attempt >= retries) throw err;
      const backoff = 500 * Math.pow(2, attempt);
      await sleep(backoff + Math.floor(Math.random() * 300));
      attempt += 1;
    }
  }
}

async function collectFromHackerNews(rows, seen) {
  const ids = await fetchJsonWithRetry("https://hacker-news.firebaseio.com/v0/newstories.json");
  const sampleIds = ids.slice(0, HN_MAX_STORIES);
  let scanned = 0;
  let collected = 0;

  for (const id of sampleIds) {
    scanned += 1;
    const item = await fetchJsonWithRetry(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
    if (!item || item.type !== "story") continue;
    if (!item.time || (Date.now() / 1000 - item.time) > 365 * 24 * 60 * 60) continue;

    const title = item.title || "";
    const text = item.text || "";
    const composite = `${title}\n${text}`;
    const kw = matchKeyword(composite);
    if (!kw) continue;

    const titleLc = title.toLowerCase();
    const textLc = text.toLowerCase();
    const isRelevantContext = HN_KEYWORDS.some((k) => titleLc.includes(k) || textLc.includes(k));
    if (!isRelevantContext) continue;

    const rowId = `hn_${item.id}`;
    if (seen.has(rowId)) continue;
    seen.add(rowId);

    rows.push({
      source: "hackernews",
      community: "Hacker News",
      source_type: "post",
      matched_keyword: kw,
      complaint_text: composite.trim(),
      upvotes: item.score || 0,
      url: item.url || `https://news.ycombinator.com/item?id=${item.id}`,
      created_at: new Date(item.time * 1000).toISOString(),
    });
    collected += 1;
  }

  console.log(`[HackerNews] scanned=${scanned}, collected=${collected}`);
}

function getGithubHeaders() {
  const token = process.env.GITHUB_TOKEN || "";
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "mps-complaints-scraper/1.0",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function collectFromGithubIssues(rows, seen) {
  const headers = getGithubHeaders();
  let scanned = 0;
  let collected = 0;

  for (const repo of GH_REPOS) {
    try {
      let page = 1;
      let repoCount = 0;
      while (repoCount < GH_MAX_ISSUES_PER_REPO) {
        const perPage = Math.min(100, GH_MAX_ISSUES_PER_REPO - repoCount);
        const url = `https://api.github.com/repos/${repo}/issues?state=all&sort=created&direction=desc&per_page=${perPage}&page=${page}`;
        const issues = await fetchJsonWithRetry(url, { headers });
        if (!Array.isArray(issues) || issues.length === 0) break;

        for (const issue of issues) {
          scanned += 1;
          repoCount += 1;

          if (issue.pull_request) continue;
          if (!createdWithin1Year(issue.created_at)) continue;

          const body = issue.body || "";
          const title = issue.title || "";
          const kw = matchKeyword(`${title}\n${body}`);
          if (!kw) continue;

          const rowId = `gh_${repo}_${issue.number}`;
          if (seen.has(rowId)) continue;
          seen.add(rowId);

          rows.push({
            source: "github",
            community: repo,
            source_type: "issue",
            matched_keyword: kw,
            complaint_text: `${title}\n${body}`.trim(),
            upvotes: issue.reactions?.["+1"] || issue.comments || 0,
            url: issue.html_url || "",
            created_at: issue.created_at || "",
          });
          collected += 1;
        }

        const oldestInPage = issues[issues.length - 1];
        if (!oldestInPage?.created_at || !createdWithin1Year(oldestInPage.created_at)) {
          break;
        }

        page += 1;
        await sleep(250);
      }
    } catch (err) {
      console.warn(`[GitHubIssues] skip repo ${repo}: ${err.message || err}`);
    }
  }

  console.log(`[GitHubIssues] scanned=${scanned}, collected=${collected}`);
}

async function run() {
  const rows = [];
  const seen = new Set();

  console.log("开始采集 Hacker News...");
  await collectFromHackerNews(rows, seen);

  console.log("开始采集 GitHub Issues...");
  await collectFromGithubIssues(rows, seen);

  const headers = [
    "source",
    "community",
    "source_type",
    "matched_keyword",
    "complaint_text",
    "upvotes",
    "url",
    "created_at",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }

  const outPath = path.resolve(process.cwd(), OUTPUT_FILE);
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`\n采集完成，共 ${rows.length} 条。`);
  console.log(`CSV 已保存到: ${outPath}\n`);
}

run().catch((err) => {
  console.error("\n运行失败:", err.message || err);
  process.exitCode = 1;
});
