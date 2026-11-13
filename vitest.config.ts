import path from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": path.resolve("src/test/empty.ts"),
    },
  },
  plugins: [react()],
  test: {
    environment: "node",
    pool: "threads",
    fileParallelism: false,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
