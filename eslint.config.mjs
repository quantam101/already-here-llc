import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

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
  ...coreWebVitals,
  ...typescript,
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
