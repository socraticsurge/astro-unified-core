import { describe, it, expect } from "vitest";
import { renderMarkdown, pickDisplayBody } from "./markdown";

describe("markdown utility tests", () => {
  describe("renderMarkdown", () => {
    it("renders basic markdown to HTML", () => {
      const result = renderMarkdown("**bold** text\n\nnew paragraph");
      expect(result.trim()).toBe("<p><strong>bold</strong> text</p>\n<p>new paragraph</p>");
    });

    it("respects GFM options (tables)", () => {
      const result = renderMarkdown("| A | B |\n|---|---|\n| 1 | 2 |");
      expect(result).toContain("<table>");
      expect(result).toContain("<th>A</th>");
      expect(result).toContain("<td>1</td>");
    });
  });

  describe("pickDisplayBody", () => {
    it("returns plain text when there is no '## Rendering' section", () => {
      const input = "This is a simple text.";
      expect(pickDisplayBody(input)).toBe("This is a simple text.");
    });

    it("cleans HTML comments", () => {
      const input = "Hello<!-- hidden comment --> World";
      expect(pickDisplayBody(input)).toBe("Hello World");
    });

    it("strips structural subheaders '## Source verse' and '## Rendering'", () => {
      const input = "## Source verse\nOriginal verse content.\n## Rendering\nRendered version.";
      expect(pickDisplayBody(input)).toBe("Rendered version.");
    });

    it("returns the source verse if rendering section is empty after cleaning", () => {
      const input = "## Source verse\nOriginal verse content.\n## Rendering\n<!-- just a comment -->\n";
      expect(pickDisplayBody(input)).toBe("Original verse content.");
    });

    it("removes Maitreya attribution from text", () => {
      const input = "Here is some context. Adapted from the Maitreya database and some other stuff.\nNext line.";
      // The implementation uses: .replace(/\.\s*Adapted from the Maitreya database[^\n]*/g, ".")
      // so the line break should remain!
      expect(pickDisplayBody(input)).toBe("Here is some context.\nNext line.");
    });

    it("removes CREDITS.md tails", () => {
      const input = "A nice verse; see content/CREDITS.md.";
      expect(pickDisplayBody(input)).toBe("A nice verse");
    });

    it("handles complex combinations of cleaning rules", () => {
      const input = `## Source verse
Ancient text here. Adapted from the Maitreya database.
<!-- metadata -->
## Rendering
Modern interpretation.
<!-- notes -->
; see content/CREDITS.md`;
      expect(pickDisplayBody(input)).toBe("Modern interpretation.");
    });
  });
});
