/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  resolver: require.resolve("./jest-support/resolver.cjs"),
  moduleNameMapper: {
    "^@scios/data-fabric$": "<rootDir>/../data-fabric/src/index.ts",
    "^@scios/feature-store$": "<rootDir>/../feature-store/src/index.ts",
    "^@scios/governance-engine$": "<rootDir>/../governance-engine/src/index.ts",
    "^@scios/observability$": "<rootDir>/../observability/src/index.ts",
    "^zod$": require.resolve("zod"),
  },
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        diagnostics: false,
        tsconfig: {
          module: "CommonJS",
          moduleResolution: "Node",
          esModuleInterop: true,
          strict: true,
        },
      },
    ],
  },
};