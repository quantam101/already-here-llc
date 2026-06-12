import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

const nodeGlobals = {
  Buffer: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  clearInterval: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  fetch: "readonly",
  global: "readonly",
  process: "readonly",
  setInterval: "readonly",
  setTimeout: "readonly"
};

const eslintConfig = [
  {
    ignores: [
      "already-here-llc-v1.1/**",
      "apply-patches.js",
      "next-env.d.ts",
      ".next/**",
      "node_modules/**",
      "profitengine/**",
      "ops/**",
      "runtime/**",
      "web/**",
      "posts/**",
      "docs/**",
      "public/**",
      "content/**"
    ]
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: [
      "scripts/**/*.{js,mjs,cjs}",
      "tests/**/*.{js,mjs,cjs}",
      "next.config.mjs",
      "postcss.config.js",
      "eslint.config.mjs"
    ],
    languageOptions: {
      globals: nodeGlobals
    }
  }
];

export default eslintConfig;
