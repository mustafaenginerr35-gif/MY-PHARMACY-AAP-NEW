if (typeof globalThis.DOMException === 'undefined') {
  class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name || 'DOMException';
    }
  }
  globalThis.DOMException = DOMException;
}

module.exports = globalThis.DOMException;
