/**
 * DiffParser Tests
 */

import { DiffParser } from '../../../src/github/DiffParser';

describe('DiffParser', () => {
  describe('parsePatch', () => {
    it('should parse simple added lines', () => {
      const patch = `@@ -1,3 +1,5 @@
 line 1
+new line 2
+new line 3
 line 4
 line 5`;

      const result = DiffParser.parsePatch('test.ts', patch);

      expect(result.filename).toBe('test.ts');
      expect(result.hunks).toHaveLength(1);
      expect(result.hunks[0].lines.length).toBeGreaterThan(0);
    });

    it('should parse deleted lines', () => {
      const patch = `@@ -1,5 +1,3 @@
 line 1
-deleted line 2
-deleted line 3
 line 4
 line 5`;

      const result = DiffParser.parsePatch('test.ts', patch);

      expect(result.hunks[0].lines.some(l => l.type === 'delete')).toBe(true);
    });

    it('should parse context lines', () => {
      const patch = `@@ -1,5 +1,5 @@
 context line 1
-old line 2
+new line 2
 context line 3
 context line 4`;

      const result = DiffParser.parsePatch('test.ts', patch);

      const lines = result.hunks[0].lines;
      expect(lines.some(l => l.type === 'context')).toBe(true);
      expect(lines.some(l => l.type === 'add')).toBe(true);
      expect(lines.some(l => l.type === 'delete')).toBe(true);
    });

    it('should parse multiple hunks', () => {
      const patch = `@@ -1,3 +1,4 @@
 line 1
+new line 2
 line 3
@@ -10,3 +11,4 @@
 line 10
+new line 11
 line 12`;

      const result = DiffParser.parsePatch('test.ts', patch);

      expect(result.hunks).toHaveLength(2);
    });

    it('should track line numbers correctly', () => {
      const patch = `@@ -5,3 +5,4 @@
 line 5
+new line 6
 line 7
 line 8`;

      const result = DiffParser.parsePatch('test.ts', patch);

      const addedLine = result.hunks[0].lines.find(l => l.type === 'add');
      expect(addedLine?.newLineNumber).toBe(6);
    });

    it('should handle empty patch', () => {
      const result = DiffParser.parsePatch('test.ts', '');

      expect(result.hunks).toHaveLength(0);
    });

    it('should handle patch with no changes', () => {
      const patch = `@@ -1,3 +1,3 @@
 line 1
 line 2
 line 3`;

      const result = DiffParser.parsePatch('test.ts', patch);

      expect(result.hunks[0].lines.every(l => l.type === 'context')).toBe(true);
    });

    it('should handle binary files', () => {
      const patch = 'Binary files differ';

      const result = DiffParser.parsePatch('image.png', patch);

      expect(result.hunks).toHaveLength(0);
    });
  });

  describe('parse', () => {
    it('should parse simple diff', () => {
      const diff = `diff --git a/test.ts b/test.ts
index 1234567..abcdefg 100644
--- a/test.ts
+++ b/test.ts
@@ -1,3 +1,4 @@
+new line
 existing line 1
 existing line 2
 existing line 3`;

      const result = DiffParser.parse(diff);

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe('test.ts');
    });

    it('should parse multiple files', () => {
      const diff = `diff --git a/src/file1.ts b/src/file1.ts
index 1234567..abcdefg 100644
--- a/src/file1.ts
+++ b/src/file1.ts
@@ -1,1 +1,2 @@
 line 1
+line 2
diff --git a/src/file2.ts b/src/file2.ts
index 7654321..gfedcba 100644
--- a/src/file2.ts
+++ b/src/file2.ts
@@ -1,1 +1,2 @@
 line 1
+line 2`;

      const result = DiffParser.parse(diff);

      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe('src/file1.ts');
      expect(result[1].filename).toBe('src/file2.ts');
    });

    it('should handle new files', () => {
      const diff = `diff --git a/src/new.ts b/src/new.ts
new file mode 100644
index 0000000..abcdefg
--- /dev/null
+++ b/src/new.ts
@@ -0,0 +1,3 @@
+line 1
+line 2
+line 3`;

      const result = DiffParser.parse(diff);

      expect(result[0].filename).toBe('src/new.ts');
    });

    it('should handle deleted files', () => {
      const diff = `diff --git a/src/old.ts b/src/old.ts
deleted file mode 100644
index abcdefg..0000000
--- a/src/old.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-line 1
-line 2
-line 3`;

      const result = DiffParser.parse(diff);

      expect(result[0].filename).toBe('src/old.ts');
    });

    it('should handle renamed files', () => {
      const diff = `diff --git a/src/old.ts b/src/new.ts
similarity index 100%
rename from src/old.ts
rename to src/new.ts`;

      const result = DiffParser.parse(diff);

      expect(result[0].filename).toBe('src/new.ts');
    });
  });

  describe('edge cases', () => {
    it('should handle very large diffs', () => {
      const lines = Array.from({ length: 10000 }, (_, i) => `+line ${i}`).join('\n');
      const patch = `@@ -0,0 +1,10000 @@\n${lines}`;

      const result = DiffParser.parsePatch('large.ts', patch);

      expect(result.hunks[0].lines.length).toBeGreaterThan(0);
    });

    it('should handle special characters in content', () => {
      const patch = `@@ -1,1 +1,2 @@
 line 1
+line with "quotes" and 'apostrophes'
+line with <html> & special chars`;

      const result = DiffParser.parsePatch('test.ts', patch);

      expect(result.hunks[0].lines.length).toBeGreaterThan(0);
    });

    it('should handle unicode characters', () => {
      const patch = `@@ -1,1 +1,2 @@
 line 1
+line with emoji 🎉 and unicode ❤️`;

      const result = DiffParser.parsePatch('test.ts', patch);

      expect(result.hunks[0].lines.length).toBeGreaterThan(0);
    });

    it('should handle malformed hunks gracefully', () => {
      const patch = `@@ invalid hunk header @@
+some line`;

      const result = DiffParser.parsePatch('test.ts', patch);

      // Should not throw, may have empty or partial results
      expect(result).toBeDefined();
    });
  });
});
