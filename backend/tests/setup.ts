/**
 * Jest Test Setup
 *
 * This file is run before each test file to set up the test environment.
 */

// Set test environment variables
process.env.NODE_ENV = "test";

// Extend Jest timeout for database operations
jest.setTimeout(20000);

// Suppress console.log during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "info").mockImplementation(() => {});
}

// Keep console.error and console.warn for debugging
// jest.spyOn(console, "error").mockImplementation(() => {});
// jest.spyOn(console, "warn").mockImplementation(() => {});

// Clean up after all tests
afterAll(async () => {
  // Allow time for any pending operations
  await new Promise((resolve) => setTimeout(resolve, 100));
});
