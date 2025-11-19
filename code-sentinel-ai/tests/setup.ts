/**
 * Jest setup file
 * Runs before all tests
 */

// Mock fs.promises for @actions/core compatibility
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    existsSync: jest.fn(),
    promises: {
      access: jest.fn(),
      writeFile: jest.fn(),
      readFile: jest.fn(),
      mkdir: jest.fn(),
      rm: jest.fn(),
      stat: jest.fn(),
      readdir: jest.fn(),
      unlink: jest.fn(),
    },
  };
});
