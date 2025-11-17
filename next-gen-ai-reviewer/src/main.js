const fs = require("node:fs");
const { fetchPullRequest, fetchPullFiles, postIssueComment } = require("./github");
const { loadGuidance, filterFilesByPatterns } = require("./guidanceLoader");
const { buildPrompt, normalizeTask } = require("./promptBuilder");
const { runChatGPT } = require("./providers/chatgpt");
const { runClaude } = require("./providers/claude");
const { runSelfHosted } = require("./providers/selfHosted");
const { runMock } = require("./providers/mock");
const packageJson = require("../package.json");

function getInput(name, defaultValue = "") {
  const sanitized = name.replace(/[^a-z0-9]/gi, "_").toUpperCase();
  const dashed = name.replace(/\s+/g, "_").toUpperCase();
  const candidates = [
    `INPUT_${sanitized}`,
    `INPUT_${dashed}`,
    `INPUT_${name.toUpperCase()}`
  ];

  for (const key of candidates) {
    const rawValue = process.env[key];
    if (rawValue !== undefined && rawValue !== null && rawValue !== "") {
      return rawValue.trim();
    }
  }

  return defaultValue;
}

function readJsonFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath, "utf8");
    return JSON.parse(buffer);
  } catch (error) {
    return null;
  }
}

function autoDetectPrNumber() {
  const directInput = getInput("pr-number") || process.env.PR_NUMBER || process.env.PR;
  if (directInput) {
    return directInput;
  }

  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (eventPath && fs.existsSync(eventPath)) {
    const payload = readJsonFile(eventPath);
    const fromPayload = payload?.pull_request?.number
      || payload?.issue?.number
      || payload?.workflow_run?.pull_requests?.[0]?.number;
    if (fromPayload) {
      return fromPayload;
    }
  }

  const ref = process.env.GITHUB_REF || process.env.GITHUB_REF_NAME || "";
  const match = ref.match(/refs\/pull\/(\d+)\//);
  if (match) {
    return match[1];
  }

  return null;
}

function formatComment({ completion, repo, prNumber }) {
  const footer = `_Automated by next-gen-ai-reviewer v${packageJson.version} (${completion.model}, ${completion.provider}) for ${repo}#${prNumber}_`;
  return `${completion.content}\n\n${footer}`;
}

async function tryProviders({ providers, prompt, task, models, selfHostedConfig, maxTokens, mockContext = {} }) {
  const failures = [];

  for (const provider of providers) {
    if (provider === "chatgpt") {
      const apiKey = process.env.CHATGPT_API_KEY || process.env.OPENAI_API_KEY;
      if (!apiKey) {
        failures.push("ChatGPT: missing CHATGPT_API_KEY or OPENAI_API_KEY");
        continue;
      }

      try {
        return await runChatGPT({ apiKey, model: models.chatgpt, prompt, task, maxTokens });
      } catch (error) {
        failures.push(`ChatGPT: ${error.message}`);
      }
    } else if (provider === "claude") {
      const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        failures.push("Claude: missing CLAUDE_API_KEY or ANTHROPIC_API_KEY");
        continue;
      }

      try {
        return await runClaude({ apiKey, model: models.claude, prompt, task, maxTokens });
      } catch (error) {
        failures.push(`Claude: ${error.message}`);
      }
    } else if (provider === "self-hosted" || provider === "selfhosted" || provider === "local") {
      const endpoint = selfHostedConfig?.endpoint || process.env.SELF_HOSTED_ENDPOINT || process.env.OPENWEBUI_API_URL;
      const apiKey = selfHostedConfig?.token || process.env.SELF_HOSTED_API_KEY || process.env.OPENWEBUI_API_KEY;
      const headerName = selfHostedConfig?.tokenHeader || process.env.SELF_HOSTED_TOKEN_HEADER;

      if (!endpoint) {
        failures.push("Self-hosted: missing self-hosted-endpoint input or SELF_HOSTED_ENDPOINT env");
        continue;
      }

      try {
        return await runSelfHosted({
          endpoint,
          apiKey,
          model: selfHostedConfig?.model,
          prompt,
          task,
          headerName,
          maxTokens
        });
      } catch (error) {
        failures.push(`Self-hosted: ${error.message}`);
      }
    } else if (provider === "mock" || provider === "demo") {
      try {
        return await runMock({
          task,
          prompt,
          prMetadata: mockContext.prMetadata,
          files: mockContext.files
        });
      } catch (error) {
        failures.push(`Mock: ${error.message}`);
      }
    }
  }

  const detail = failures.length ? failures.join(" | ") : "No providers were attempted.";
  throw new Error(`All AI providers failed. Details: ${detail}`);
}

async function run() {
  const githubToken = process.env.GITHUB_TOKEN;
  if (!githubToken) {
    throw new Error("GITHUB_TOKEN is required to fetch pull requests and post comments.");
  }

  const rawPrNumber = autoDetectPrNumber();
  if (!rawPrNumber) {
    throw new Error("Unable to determine pull request number. Provide pr-number input or set PR_NUMBER.");
  }

  const prNumber = Number(rawPrNumber);
  if (Number.isNaN(prNumber)) {
    throw new Error("pr-number must be a valid integer.");
  }

  const repository = getInput("repository") || process.env.GITHUB_REPOSITORY;
  if (!repository) {
    throw new Error("repository input is required when GITHUB_REPOSITORY is not set.");
  }

  const [owner, repo] = repository.split("/");
  if (!owner || !repo) {
    throw new Error("repository must be formatted as owner/repo.");
  }

  const task = normalizeTask(getInput("task") || "review");
  const maxFiles = Number(getInput("max-files") || process.env.MAX_FILES || "40");
  const maxDiffChars = Number(getInput("max-diff-chars") || process.env.MAX_DIFF_CHARS || "12000");
  const additionalContext = getInput("additional-context") || process.env.ADDITIONAL_CONTEXT || "";
  const maxTokens = Number(getInput("max-output-tokens") || process.env.MAX_OUTPUT_TOKENS || "1200");
  const providerPreference = (getInput("ai-provider") || process.env.AI_PROVIDER || "chatgpt,claude,self-hosted")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const models = {
    chatgpt: getInput("chatgpt-model") || process.env.CHATGPT_MODEL || "gpt-4o-mini",
    claude: getInput("claude-model") || process.env.CLAUDE_MODEL || "claude-3-5-sonnet-20241022"
  };

  const selfHostedConfig = {
    endpoint: getInput("self-hosted-endpoint") || process.env.SELF_HOSTED_ENDPOINT || process.env.OPENWEBUI_API_URL || "",
    model: getInput("self-hosted-model") || process.env.SELF_HOSTED_MODEL || process.env.OPENWEBUI_MODEL || "local-model",
    token: getInput("self-hosted-token") || process.env.SELF_HOSTED_TOKEN || process.env.SELF_HOSTED_API_KEY || process.env.OPENWEBUI_API_KEY || "",
    tokenHeader: getInput("self-hosted-token-header") || process.env.SELF_HOSTED_TOKEN_HEADER || "Authorization"
  };

  console.log(`Fetching PR #${prNumber} from ${repository}...`);
  const prMetadata = await fetchPullRequest({ token: githubToken, owner, repo, prNumber });

  console.log("Loading repository guidance (.github)...");
  const guidance = await loadGuidance({ token: githubToken, owner, repo });

  console.log(`Fetching up to ${maxFiles} changed files...`);
  const files = await fetchPullFiles({ token: githubToken, owner, repo, prNumber, max: maxFiles });

  const { filtered, ignored } = filterFilesByPatterns(files, guidance.ignorePatterns);
  guidance.ignoredFiles = ignored.map((file) => file.filename);

  console.log(`Building ${task} prompt with ${filtered.length} files (ignored ${ignored.length})...`);
  const prompt = buildPrompt({
    task,
    prMetadata,
    files: filtered,
    maxDiffChars,
    additionalContext,
    guidance
  });

  console.log(`Requesting completion via providers: ${providerPreference.join(", ")}`);
  const completion = await tryProviders({
    providers: providerPreference,
    prompt,
    task,
    models,
    selfHostedConfig,
    maxTokens,
    mockContext: { prMetadata, files: filtered }
  });

  console.log("Posting AI response as a PR comment...");
  const body = formatComment({ completion, repo: repository, prNumber });
  await postIssueComment({ token: githubToken, owner, repo, issueNumber: prNumber, body });

  console.log("Done. AI review successfully posted.");
}

run().catch((error) => {
  console.error(`::error::${error.message}`);
  process.exit(1);
});
