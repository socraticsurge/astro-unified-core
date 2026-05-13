<<<<<<< HEAD

module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
};
=======
const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    ...tsJestTransformCfg,
  },
};
>>>>>>> development
