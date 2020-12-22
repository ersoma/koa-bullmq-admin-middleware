'use strict';

class ParameterError extends TypeError {
  constructor(message = '') {
    super(message);

    this.name = 'ParameterError';
    this.message = message;
  }
}

module.exports = ParameterError;
