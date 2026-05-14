const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    "^marked$": "<rootDir>/node_modules/marked/lib/marked.umd.js"
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "<rootDir>/lib/content/markdown.test.ts"
  ]
};
