// @ts-check
import js from "@eslint/js";

export default [
  {
    ignores: ["dist/**", "node_modules/**", "*.config.*", "build/"],
  },
  js.configs.recommended,
  {
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-undef": "off",
      "prefer-const": "warn",
    },
  },
];
