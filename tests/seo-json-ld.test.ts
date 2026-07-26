import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { JsonLd } from "@/lib/seo";

describe("JSON-LD rendering", () => {
    it("keeps user-controlled schema values inside the JSON script element", () => {
        const html = renderToStaticMarkup(createElement(JsonLd, {
            schema: {
                name: "</script><script>alert('stored-xss')</script>",
            },
        }));

        expect(html).not.toContain("</script><script>");
        expect(html).toContain("\\u003c/script\\u003e\\u003cscript\\u003e");
    });
});
