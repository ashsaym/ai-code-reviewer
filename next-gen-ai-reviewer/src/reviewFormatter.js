/**
 * Formats AI review output into GitHub-style inline review comments
 */

function parseReviewJSON(content) {
  try {
    // Remove markdown code fences if present
    let cleaned = content.trim();
    if (cleaned.startsWith("```json")) {
      cleaned = cleaned.replace(/^```json\s*\n/, "").replace(/\n```\s*$/, "");
    } else if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```\s*\n/, "").replace(/\n```\s*$/, "");
    }
    
    const parsed = JSON.parse(cleaned);
    
    // Validate structure
    if (!parsed.reviews || !Array.isArray(parsed.reviews)) {
      throw new Error("Invalid review format: missing 'reviews' array");
    }
    
    return parsed;
  } catch (error) {
    console.error("Failed to parse review JSON:", error.message);
    console.error("Content received:", content.substring(0, 500));
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
  if (!patch) return null;
  
  const lines = patch.split("\n");
  let currentLine = 0;
  
  for (const line of lines) {
    if (line.startsWith("@@")) {
      // Parse hunk header: @@ -old_start,old_count +new_start,new_count @@
      const match = line.match(/@@\s*-\d+,?\d*\s*\+(\d+),?\d*\s*@@/);
      if (match) {
        currentLine = parseInt(match[1], 10) - 1;
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
  extractLineFromDiff
};
