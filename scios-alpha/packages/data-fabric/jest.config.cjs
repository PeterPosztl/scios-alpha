/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  resolver: require.resolve("./jest-support/resolver.js"),
  moduleNameMapper: {
    "^zod$": require.resolve("zod"),
  },
  transform: {
    "^.+\\.tsx?$": [
      require.resolve("ts-jest"),
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
