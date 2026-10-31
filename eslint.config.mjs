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
              group: outerLayerPatterns(["infrastructure", "presentation"]),
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
              group: outerLayerPatterns(["presentation"]),
              message: "Infrastructure must not depend on presentation.",
            },
          ],
        },
      ],
    },
  },
]);
