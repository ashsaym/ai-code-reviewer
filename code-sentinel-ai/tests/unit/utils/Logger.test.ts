/**
 * Logger Unit Tests
 */

import { Logger } from '../../../src/utils/Logger';
import * as core from '@actions/core';

jest.mock('@actions/core');

describe('Logger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setContext', () => {
    it('should set the logging context', () => {
      Logger.setContext('TestContext');
      Logger.info('test message');
      expect(core.info).toHaveBeenCalledWith('[TestContext] test message');
    });
  });

  describe('info', () => {
    it('should log info messages', () => {
      Logger.setContext('TestContext');
      Logger.info('test info');
      expect(core.info).toHaveBeenCalledWith('[TestContext] test info');
    });
  });

  describe('warning', () => {
    it('should log warning messages', () => {
      Logger.setContext('TestContext');
      Logger.warning('test warning');
      expect(core.warning).toHaveBeenCalledWith('[TestContext] test warning');
    });
  });

  describe('error', () => {
    it('should log error messages', () => {
      Logger.setContext('TestContext');
      Logger.error('test error');
      expect(core.error).toHaveBeenCalledWith('[TestContext] test error');
    });
  });

  describe('debug', () => {
    it('should log debug messages', () => {
      Logger.setContext('TestContext');
      Logger.debug('test debug');
      expect(core.debug).toHaveBeenCalledWith('[TestContext] test debug');
    });
  });
});
