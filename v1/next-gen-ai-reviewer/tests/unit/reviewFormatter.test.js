const {
  parseReviewJSON,
  formatReviewComment,
  formatReviewComments,
  validateReviewComments,
  extractLineFromDiff,
  computePositionFromPatch
} = require("../../src/reviewFormatter");

describe("reviewFormatter", () => {
  describe("parseReviewJSON", () => {
    it("should parse valid JSON with reviews array", () => {
      const content = JSON.stringify({
        reviews: [
          { path: "file.js", line: 10, comment: "Issue here", severity: "high" }
        ],
        summary: "Test summary"
      });

      const result = parseReviewJSON(content);
      expect(result.reviews).toHaveLength(1);
      expect(result.summary).toBe("Test summary");
    });

    it("should parse JSON wrapped in markdown code fences", () => {
      const content = '```json\n{"reviews": [], "summary": "test"}\n```';
      const result = parseReviewJSON(content);
      expect(result.reviews).toBeDefined();
      expect(Array.isArray(result.reviews)).toBe(true);
    });

    it("should parse JSON with extra text around it", () => {
      const content = 'Here is the review:\n{"reviews": [], "summary": "test"}\nDone.';
      const result = parseReviewJSON(content);
      expect(result.reviews).toBeDefined();
    });

    it("should throw error for missing reviews array", () => {
      const content = '{"summary": "No reviews"}';
      expect(() => parseReviewJSON(content)).toThrow("missing 'reviews' array");
    });

    it("should throw error for invalid JSON", () => {
      const content = "{invalid json}";
      expect(() => parseReviewJSON(content)).toThrow();
    });

    it("should throw error for empty content", () => {
      expect(() => parseReviewJSON("")).toThrow("expected non-empty string");
    });
  });

  describe("formatReviewComment", () => {
    it("should format comment with severity badge", () => {
      const result = formatReviewComment({
        comment: "This is an issue",
        severity: "high"
      });

      expect(result).toContain("🔴");
      expect(result).toContain("**HIGH**");
      expect(result).toContain("This is an issue");
    });

    it("should include suggestion block when provided", () => {
      const result = formatReviewComment({
        comment: "Fix this",
        suggestion: "const fixed = true;",
        severity: "medium"
      });

      expect(result).toContain("```suggestion");
      expect(result).toContain("const fixed = true;");
    });

    it("should handle missing severity with info emoji", () => {
      const result = formatReviewComment({
        comment: "Note this"
      });

      expect(result).toContain("ℹ️");
    });
  });

  describe("formatReviewComments", () => {
    it("should format multiple review comments", () => {
      const reviewData = {
        reviews: [
          { path: "a.js", line: 1, comment: "Issue 1", severity: "high" },
          { path: "b.js", line: 2, comment: "Issue 2", severity: "low" }
        ],
        summary: "Found issues"
      };

      const result = formatReviewComments(reviewData);
      expect(result.comments).toHaveLength(2);
      expect(result.summary).toBe("Found issues");
    });

    it("should skip invalid entries", () => {
      const reviewData = {
        reviews: [
          { path: "a.js", line: 1, comment: "Valid" },
          { path: "b.js", comment: "Missing line" },
          { line: 2, comment: "Missing path" }
        ]
      };

      const result = formatReviewComments(reviewData);
      expect(result.comments).toHaveLength(1);
    });

    it("should generate default summary when missing", () => {
      const reviewData = {
        reviews: [
          { path: "a.js", line: 1, comment: "Issue" }
        ]
      };

      const result = formatReviewComments(reviewData);
      expect(result.summary).toContain("Found 1 issue");
    });
  });

  describe("extractLineFromDiff", () => {
    const sampleDiff = `@@ -1,3 +1,4 @@
 context line 1
-removed line
+added line 1
+added line 2
 context line 2`;

    it("should extract added line by line number", () => {
      const result = extractLineFromDiff(sampleDiff, 2);
      expect(result).toBe("added line 1");
    });

    it("should handle diff with single line hunk header", () => {
      const diff = `@@ -1 +1 @@
+added line`;
      const result = extractLineFromDiff(diff, 1);
      expect(result).toBe("added line");
    });

    it("should return null for line not in diff", () => {
      const result = extractLineFromDiff(sampleDiff, 999);
      expect(result).toBeNull();
    });

    it("should return null for empty patch", () => {
      const result = extractLineFromDiff("", 1);
      expect(result).toBeNull();
    });
  });

  describe("computePositionFromPatch", () => {
    const samplePatch = `@@ -1,3 +1,4 @@
 context line 1
-removed line
+added line 1
+added line 2
 context line 2`;

    it("should compute position for added line", () => {
      const position = computePositionFromPatch(samplePatch, 2);
      expect(position).toBeGreaterThan(0);
    });

    it("should return null for invalid inputs", () => {
      expect(computePositionFromPatch(null, 1)).toBeNull();
      expect(computePositionFromPatch(samplePatch, null)).toBeNull();
      expect(computePositionFromPatch("", 1)).toBeNull();
    });

    it("should handle patch with multiple hunks", () => {
      const multiHunkPatch = `@@ -1,2 +1,2 @@
 line 1
+added 1
@@ -10,2 +11,3 @@
 line 10
+added 2
+added 3`;

      const position = computePositionFromPatch(multiHunkPatch, 12);
      expect(position).toBeGreaterThan(0);
    });

    it("should return null for line not in patch", () => {
      const position = computePositionFromPatch(samplePatch, 999);
      expect(position).toBeNull();
    });
  });

  describe("validateReviewComments", () => {
    const mockFiles = [
      {
        filename: "test.js",
        patch: `@@ -1,2 +1,3 @@
 line 1
+added line
 line 2`
      },
      {
        filename: "no-patch.js",
        patch: null
      }
    ];

    it("should validate comments against file list", () => {
      const comments = [
        { path: "test.js", line: 2, body: "Comment" }
      ];

      const valid = validateReviewComments(comments, mockFiles);
      expect(valid).toHaveLength(1);
    });

    it("should skip comments for non-existent files", () => {
      const comments = [
        { path: "nonexistent.js", line: 1, body: "Comment" }
      ];

      const valid = validateReviewComments(comments, mockFiles);
      expect(valid).toHaveLength(0);
    });

    it("should skip comments for files without patches", () => {
      const comments = [
        { path: "no-patch.js", line: 1, body: "Comment" }
      ];

      const valid = validateReviewComments(comments, mockFiles);
      expect(valid).toHaveLength(0);
    });

    it("should skip comments with invalid line numbers", () => {
      const comments = [
        { path: "test.js", line: 999, body: "Comment" }
      ];

      const valid = validateReviewComments(comments, mockFiles);
      expect(valid).toHaveLength(0);
    });
  });

  describe("parseReviewJSON edge cases", () => {
    it("should handle non-object parsed content", () => {
      expect(() => parseReviewJSON('"just a string"')).toThrow("Parsed content is not an object");
    });

    it("should handle missing reviews array", () => {
      expect(() => parseReviewJSON('{"summary": "test"}')).toThrow("missing 'reviews' array");
    });

    it("should warn about invalid review entries", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const result = parseReviewJSON(JSON.stringify({
        summary: "Test",
        reviews: [
          { path: 123, line: "not a number", comment: null },
          { path: "file.js", line: 10, comment: "Valid comment" }
        ]
      }));

      expect(result).toBeDefined();
      expect(result.reviews).toHaveLength(2);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("computePositionFromPatch edge cases", () => {
    it("should handle null or undefined patch", () => {
      const result = computePositionFromPatch(null, 5);
      expect(result).toBeNull();
    });

    it("should handle null or undefined target line", () => {
      const result = computePositionFromPatch("@@ -1,3 +1,3 @@\n-old\n+new", null);
      expect(result).toBeNull();
    });

    it("should handle patch without matching line", () => {
      const patch = "@@ -1,3 +1,3 @@\n line1\n+line2\n line3";
      const result = computePositionFromPatch(patch, 999);
      expect(result).toBeNull();
    });
  });
});
