import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.config({
    extends: [
      "next/core-web-vitals",
      "next/typescript",
    ],
  }),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // 允许使用 any 类型（在 TypeScript 文件中）
      "@typescript-eslint/no-explicit-any": "warn",
      // 允许使用 require（在某些情况下需要）
      "@typescript-eslint/no-require-imports": "warn",
      // 允许 @ts-nocheck
      "@typescript-eslint/ban-ts-comment": "warn",
      // 允许未转义的实体（在 JSX 中）
      "react/no-unescaped-entities": "warn",
      // 允许使用 <a> 标签（在某些情况下需要）
      "@next/next/no-html-link-for-pages": "warn",
      // 允许未使用的变量（警告而不是错误）
      "@typescript-eslint/no-unused-vars": "warn",
      // 允许使用 <img> 标签（警告而不是错误）
      "@next/next/no-img-element": "warn",
    },
  },
];

export default eslintConfig;
