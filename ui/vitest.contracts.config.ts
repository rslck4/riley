import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/ui/contracts.rpc-methods.node.test.ts", "src/ui/navigation.test.ts"],
  },
});
