import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        dedupe: ["react", "react-dom"],
        alias: {
            "@": path.resolve(__dirname, "src"),
            "server-only": path.resolve(__dirname, "tests/mocks/server-only.ts"),
        },
    },
    test: {
        environment: "node",
        include: ["tests/**/*.test.ts"],
        clearMocks: true,
        restoreMocks: true,
    },
});
