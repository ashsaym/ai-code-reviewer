const { updatePullRequest } = require("./github");

/**
 * Generate and update PR description based on changes
 */
async function generatePRDescription({ token, owner, repo, prNumber, completion }) {
  try {
    console.log("Updating PR description with AI-generated content...");

    // Update the PR description
    await updatePullRequest({
      token,
      owner,
      repo,
      prNumber,
      body: completion.content
    });

    console.log("PR description successfully updated.");
    return true;
  } catch (error) {
    console.error("Failed to update PR description:", error.message);
    return false;
  }
}

/**
 * Run multiple tasks and return completions for combining
 */
async function runCombinedTasks({ tryProviders, buildPrompt, buildInlineReviewPrompt, prMetadata, files, maxDiffChars, additionalContext, guidance, providerPreference, models, selfHostedConfig, maxTokens, maxCompletionTokensMode }) {
  const tasks = ["summary", "review", "suggestions"];
  const completions = {};

  console.log("Running combined tasks: summary, review, suggestions...");

  for (const task of tasks) {
    try {
      console.log(`Generating ${task}...`);

      // Use inline review for review task, regular for others
      const useInlineReview = task === "review";
      const prompt = useInlineReview
        ? buildInlineReviewPrompt({ task, prMetadata, files, maxDiffChars, additionalContext, guidance })
        : buildPrompt({ task, prMetadata, files, maxDiffChars, additionalContext, guidance });

      const completion = await tryProviders({
        providers: providerPreference,
        prompt,
        task,
        models,
        selfHostedConfig,
        maxTokens,
        maxCompletionTokensMode,
        mockContext: { prMetadata, files }
      });

      completions[task] = completion;
      console.log(`✓ ${task} completed`);
    } catch (error) {
      console.warn(`Failed to generate ${task}: ${error.message}`);
      completions[task] = null;
    }
  }

  return completions;
}

/**
 * Combine multiple task completions into a single comment body
 */
function combineTasks({ completions, repo, prNumber, packageVersion, reviewerName = "next-gen-ai-reviewer" }) {
  const sections = [];

  // Add summary
  if (completions.summary) {
    sections.push(completions.summary.content);
    sections.push("");
    sections.push("---");
    sections.push("");
  }

  // Add review
  if (completions.review) {
    sections.push(completions.review.content);
    sections.push("");
    sections.push("---");
    sections.push("");
  }

  // Add suggestions
  if (completions.suggestions) {
    sections.push(completions.suggestions.content);
    sections.push("");
    sections.push("---");
    sections.push("");
  }

  // Footer with metadata
  const providers = [];
  if (completions.summary) {
    providers.push(`summary: ${completions.summary.provider} (${completions.summary.model})`);
  }
  if (completions.review) {
    providers.push(`review: ${completions.review.provider} (${completions.review.model})`);
  }
  if (completions.suggestions) {
    providers.push(`suggestions: ${completions.suggestions.provider} (${completions.suggestions.model})`);
  }

  const footer = `_Automated by ${reviewerName} v${packageVersion} for ${repo}#${prNumber}${providers.length > 0 ? ` | ${providers.join(", ")}` : ""}_`;
  sections.push(footer);

  return sections.join("\n");
}

module.exports = {
  generatePRDescription,
  runCombinedTasks,
  combineTasks
};
