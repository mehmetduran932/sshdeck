import js from "@eslint/js";
import tsPlugin from "typescript-eslint";

export default [
  js.configs.recommended,
  ...tsPlugin.configs.recommended,
  {
    files: ["src/**/*.ts", "tests/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }
      ]
    }
  },
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"]
  }
];
