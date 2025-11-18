/**
 * Formats AI review output into GitHub-style inline review comments
 */

/**
 * Parse JSON response from AI provider with robust error handling
 * @param {string} content - Raw content from AI provider
 * @returns {object} Parsed review data with reviews array and optional summary
 */
function parseReviewJSON(content) {
  if (!content || typeof content !== "string") {
    throw new Error("Invalid content: expected non-empty string");
  }

  try {
    let cleaned = content.trim();

    // Remove various markdown code fence formats
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/gm, "");
    cleaned = cleaned.replace(/\n?```\s*$/gm, "");

    // Try to extract JSON from text that may have surrounding content
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    }

    const parsed = JSON.parse(cleaned);

    // Validate structure
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Parsed content is not an object");
    }

    if (!parsed.reviews || !Array.isArray(parsed.reviews)) {
      throw new Error("Invalid review format: missing 'reviews' array");
    }

    // Validate each review entry
    for (let i = 0; i < parsed.reviews.length; i++) {
      const review = parsed.reviews[i];
      if (!review.path || typeof review.path !== "string") {
        console.warn(`Review entry ${i} missing valid 'path' field, skipping`);
      }
      if (!review.line || typeof review.line !== "number") {
        console.warn(`Review entry ${i} missing valid 'line' field, skipping`);
      }
      if (!review.comment || typeof review.comment !== "string") {
        console.warn(`Review entry ${i} missing valid 'comment' field, skipping`);
      }
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse review JSON:", error.message);
    console.error("Content received (first 500 chars):", content.substring(0, 500));
    console.error("Content received (last 200 chars):", content.substring(Math.max(0, content.length - 200)));
    throw new Error(`Failed to parse AI review response: ${error.message}`);
  }
}

function formatReviewComment({ comment, suggestion, severity }) {
  const parts = [];

  // Add severity badge
  const severityEmoji = {
    high: "🔴",
    medium: "🟡",
    low: "🟢"
  };

  const emoji = severityEmoji[severity?.toLowerCase()] || "ℹ️";
  parts.push(`${emoji} **${severity?.toUpperCase() || "INFO"}**\n`);

  // Add comment
  parts.push(comment);

  // Add suggestion if provided
  if (suggestion && suggestion.trim()) {
    parts.push("\n\n**Suggested change:**");
    parts.push("```suggestion");
    parts.push(suggestion.trim());
    parts.push("```");
  }

  return parts.join("\n");
}

function formatReviewComments(reviewData) {
  const { reviews, summary } = reviewData;

  const comments = reviews.map(review => {
    if (!review.path || !review.line || !review.comment) {
      console.warn("Skipping invalid review entry:", review);
      return null;
    }

    return {
      path: review.path,
      line: review.line,
      body: formatReviewComment({
        comment: review.comment,
        suggestion: review.suggestion,
        severity: review.severity
      })
    };
  }).filter(Boolean);

  return {
    comments,
    summary: summary || `Found ${comments.length} issue${comments.length !== 1 ? "s" : ""} during code review.`
  };
}

function extractLineFromDiff(patch, targetLine) {
  if (!patch) {
return null;
}

  const lines = patch.split("\n");
  let currentLine = 0;

  for (const line of lines) {
    if (line.startsWith("@@")) {
      // Parse hunk header: @@ -old_start,old_count +new_start,new_count @@
      // Handle both formats: @@ -1,2 +3,4 @@ and @@ -1 +3 @@
      const match = line.match(/@@\s*-(\d+)(?:,(\d+))?\s*\+(\d+)(?:,(\d+))?\s*@@/);
      if (match) {
        currentLine = parseInt(match[3], 10) - 1;
      }
      continue;
    }

    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentLine++;
      if (currentLine === targetLine) {
        return line.substring(1); // Remove the + prefix
      }
    } else if (!line.startsWith("-") && !line.startsWith("\\")) {
      currentLine++;
    }
  }

  return null;
}

/**
 * Compute the position in a patch for a given line number in the new file.
 * Position is 1-indexed from the start of the diff, counting all lines including hunk headers.
 * @param {string} patch - The unified diff patch
 * @param {number} targetLine - The line number in the new file (1-indexed)
 * @returns {number|null} - The position in the diff, or null if not found
 */
function computePositionFromPatch(patch, targetLine) {
  if (!patch || !targetLine) {
return null;
}

  const lines = patch.split("\n");
  let position = 0;
  let currentNewLine = 0;
  let inHunk = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    position++;

    if (line.startsWith("@@")) {
      // Parse hunk header to get starting line number
      // Format: @@ -old_start,old_count +new_start,new_count @@
      const match = line.match(/@@\s*-(\d+)(?:,(\d+))?\s*\+(\d+)(?:,(\d+))?\s*@@/);
      if (match) {
        currentNewLine = parseInt(match[3], 10) - 1;
        inHunk = true;
      }
      continue;
    }

    if (!inHunk) {
continue;
}

    // Skip file headers
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("\\")) {
      continue;
    }

    // Count lines in the new file
    if (line.startsWith("+")) {
      currentNewLine++;
      if (currentNewLine === targetLine) {
        return position;
      }
    } else if (!line.startsWith("-")) {
      // Context line (no prefix or space prefix)
      currentNewLine++;
      if (currentNewLine === targetLine) {
        return position;
      }
    }
  }

  return null;
}

function validateReviewComments(comments, files) {
  const fileMap = new Map(files.map(f => [f.filename, f]));
  const validComments = [];

  for (const comment of comments) {
    const file = fileMap.get(comment.path);

    if (!file) {
      console.warn(`Skipping comment for non-existent file: ${comment.path}`);
      continue;
    }

    if (!file.patch) {
      console.warn(`Skipping comment for file without patch: ${comment.path}`);
      continue;
    }

    // Validate line number exists in the diff
    const lineContent = extractLineFromDiff(file.patch, comment.line);
    if (!lineContent) {
      console.warn(`Line ${comment.line} not found in diff for ${comment.path}`);
      continue;
    }

    validComments.push(comment);
  }

  return validComments;
}

module.exports = {
  parseReviewJSON,
  formatReviewComment,
  formatReviewComments,
  validateReviewComments,
  extractLineFromDiff,
  computePositionFromPatch
};
