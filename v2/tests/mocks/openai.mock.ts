/**
 * Mock for OpenAI SDK
 */

export default class OpenAI {
  chat = {
    completions: {
      create: jest.fn(),
    },
  };

  constructor(_config?: any) {
    // Mock constructor
  }
}
