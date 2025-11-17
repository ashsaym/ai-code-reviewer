const API_BASE = process.env.GITHUB_API_URL || "https://api.github.com";

async function githubRequest(path, token, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "next-gen-ai-reviewer",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub request failed (${response.status} ${response.statusText}): ${message}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function fetchRepoFile({ token, owner, repo, path }) {
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const response = await fetch(`${API_BASE}/repos/${owner}/${repo}/contents/${encodedPath}`, {
    headers: {
      Accept: "application/vnd.github.raw+json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "next-gen-ai-reviewer"
    }
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GitHub file request failed (${response.status} ${response.statusText}): ${message}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/vnd.github.raw")) {
    return response.text();
  }

  const data = await response.json();

  if (data.encoding === "base64" && data.content) {
    return Buffer.from(data.content, "base64").toString("utf8");
  }

  if (data.download_url) {
    const raw = await fetch(data.download_url);
    return raw.text();
  }

  if (typeof data.content === "string") {
    return data.content;
  }

  return null;
}

async function fetchPullRequest({ token, owner, repo, prNumber }) {
  return githubRequest(`/repos/${owner}/${repo}/pulls/${prNumber}`, token);
}

async function fetchPullFiles({ token, owner, repo, prNumber, max = 40 }) {
  const perPage = 100;
  const files = [];
  let page = 1;

  while (files.length < max) {
    const data = await githubRequest(
      `/repos/${owner}/${repo}/pulls/${prNumber}/files?per_page=${perPage}&page=${page}`,
      token
    );

    files.push(...data);

    if (data.length < perPage) {
      break;
    }

    page += 1;
  }

  return files.slice(0, max);
}

async function postIssueComment({ token, owner, repo, issueNumber, body }) {
  return githubRequest(
    `/repos/${owner}/${repo}/issues/${issueNumber}/comments`,
    token,
    {
      method: "POST",
      body: { body }
    }
  );
}

module.exports = {
  fetchPullRequest,
  fetchPullFiles,
  postIssueComment,
  fetchRepoFile
};
