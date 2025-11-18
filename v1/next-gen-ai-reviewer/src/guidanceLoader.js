const { fetchRepoFile } = require("./github");

const DEFAULT_GUIDANCE_PATHS = {
  instructions: ".github/review-instructions.md",
  rulesets: ".github/review-rulesets.md",
  ignore: ".github/review-ignorelist.txt",
  promptReview: ".github/prompts/review.md",
  promptSummary: ".github/prompts/summary.md",
  promptSuggestions: ".github/prompts/suggestions.md"
};

function sanitizeGuidance(text) {
  if (!text) {
    return "";
  }
  return text.replace(/\uFEFF/g, "").trim();
}

function parseIgnoreList(text) {
  if (!text) {
    return [];
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function globToRegExp(pattern) {
  if (!pattern) {
    return null;
  }

  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "@@DOUBLE_STAR@@")
    .replace(/\*/g, "[^/]*")
    .replace(/@@DOUBLE_STAR@@/g, ".*");

  return new RegExp(`^${escaped}$`);
}

function filterFilesByPatterns(files, patterns = []) {
  if (!patterns.length) {
    return {
      filtered: files,
      ignored: []
    };
  }

  const regexes = patterns
    .map(globToRegExp)
    .filter(Boolean);

  if (!regexes.length) {
    return {
      filtered: files,
      ignored: []
    };
  }

  const filtered = [];
  const ignored = [];

  for (const file of files) {
    const filename = file.filename || "";
    const shouldIgnore = regexes.some((regex) => regex.test(filename));
    if (shouldIgnore) {
      ignored.push(file);
    } else {
      filtered.push(file);
    }
  }

  return { filtered, ignored };
}

async function loadGuidance({ token, owner, repo }) {
  const [instructions, rulesets, ignore, promptReview, promptSummary, promptSuggestions] = await Promise.all([
    fetchRepoFile({ token, owner, repo, path: DEFAULT_GUIDANCE_PATHS.instructions }).catch(() => null),
    fetchRepoFile({ token, owner, repo, path: DEFAULT_GUIDANCE_PATHS.rulesets }).catch(() => null),
    fetchRepoFile({ token, owner, repo, path: DEFAULT_GUIDANCE_PATHS.ignore }).catch(() => null),
    fetchRepoFile({ token, owner, repo, path: DEFAULT_GUIDANCE_PATHS.promptReview }).catch(() => null),
    fetchRepoFile({ token, owner, repo, path: DEFAULT_GUIDANCE_PATHS.promptSummary }).catch(() => null),
    fetchRepoFile({ token, owner, repo, path: DEFAULT_GUIDANCE_PATHS.promptSuggestions }).catch(() => null)
  ]);

  return {
    instructions: sanitizeGuidance(instructions),
    rulesets: sanitizeGuidance(rulesets),
    ignorePatterns: parseIgnoreList(ignore),
    prompts: {
      review: sanitizeGuidance(promptReview),
      summary: sanitizeGuidance(promptSummary),
      suggestions: sanitizeGuidance(promptSuggestions)
    }
  };
}

module.exports = {
  loadGuidance,
  filterFilesByPatterns
};
