#!/usr/bin/env node
"use strict";

/**
 * orchestrator:discover
 * Input:  scripts/keywords.json
 * Output: diagnostics-export/orchestrator/discovery.json
 *
 * GitHub repository search (native fetch, Node >=20).
 * No token ⇒ lower rate limit; never fabricate results.
 */
const fs = require("node:fs");
const path = require("node:path");
const { ROOT, writeJson } = require("./orchestrator/lib.cjs");

const keywordsPath = path.join(ROOT, "scripts", "keywords.json");
if (!fs.existsSync(keywordsPath)) {
  console.error(
    JSON.stringify({ step: "discover", ok: false, error: "scripts/keywords.json missing" })
  );
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(keywordsPath, "utf8"));
const keywords = config.keywords ?? [];
const language = config.language ?? "TypeScript";
const perPage = config.perPage ?? 10;
const token = process.env.GITHUB_TOKEN;

async function search(q) {
  const query = `${q} language:${language}`;
  const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=${perPage}`;
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(
      json.message || `GitHub API ${res.status}: ${JSON.stringify(json).slice(0, 200)}`
    );
  }
  return json.items ?? [];
}

(async () => {
  const results = [];
  const seen = new Set();

  for (const keyword of keywords) {
    const items = await search(keyword);
    for (const it of items) {
      if (seen.has(it.full_name)) continue;
      seen.add(it.full_name);
      results.push({
        keyword,
        name: it.full_name,
        url: it.html_url,
        license: it.license ? it.license.spdx_id : null,
        description: it.description,
        stars: it.stargazers_count,
        updated_at: it.updated_at,
      });
    }
  }

  const out = {
    at: new Date().toISOString(),
    label: "ALPHA_NON_PRODUCTION",
    source: "github-search",
    keywordsPath: "scripts/keywords.json",
    keywords,
    language,
    perPage,
    tokenPresent: !!token,
    results,
    note: token
      ? "Authenticated GitHub search"
      : "Unauthenticated — set GITHUB_TOKEN for higher rate limits",
  };

  const file = writeJson("discovery.json", out);
  console.log(
    JSON.stringify(
      { step: "discover", ok: true, file, results: results.length, tokenPresent: !!token },
      null,
      2
    )
  );
})().catch((err) => {
  console.error(JSON.stringify({ step: "discover", ok: false, error: err.message }));
  process.exit(1);
});
