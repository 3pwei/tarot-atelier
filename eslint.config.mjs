import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const outerLayerPatterns = (layers) => [
  ...layers.flatMap((layer) => [
    `@/${layer}/**`,
    `../${layer}/**`,
    `../../${layer}/**`,
    `../../../${layer}/**`,
  ]),
];

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    ".next/**",
    "preview/**",
    "functions/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
  {
    files: ["src/domain/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: "Domain must remain framework-free." },
            { name: "next", message: "Domain must remain framework-free." },
            { name: "zustand", message: "Domain must remain framework-free." },
            { name: "gsap", message: "Domain must remain framework-free." },
            { name: "three", message: "Domain must remain framework-free." },
          ],
          patterns: [
            {
              group: [
                ...outerLayerPatterns([
                  "application",
                  "infrastructure",
                  "presentation",
                  "server",
                ]),
                "next/**",
                "@react-three/**",
              ],
              message:
                "Domain dependencies may only point to domain or shared pure utilities.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/application/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: outerLayerPatterns([
                "infrastructure",
                "presentation",
                "server",
              ]),
              message:
                "Application must not depend on infrastructure or presentation.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/infrastructure/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: outerLayerPatterns(["presentation", "server"]),
              message:
                "Infrastructure must not depend on presentation or server.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/presentation/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: outerLayerPatterns(["server"]),
              message:
                "Presentation runs in the browser and must not import server code.",
            },
          ],
        },
      ],
    },
  },
  {
    // The server entry point composes the inner layers for Cloudflare.
    files: ["src/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "react", message: "Server code renders no UI." }],
          patterns: [
            {
              group: outerLayerPatterns(["presentation"]),
              message: "Server code must not depend on presentation.",
            },
          ],
        },
      ],
    },
  },
]);
