/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  moduleNameMapper: {
    "^@b/(.*)$": "<rootDir>/backend/src/$1",
    "^@db/(.*)$": "<rootDir>/backend/models/$1",
  },
};
