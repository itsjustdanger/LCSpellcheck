const assert = require('assert');
const { describe, it } = require('mocha');
const { loadDictionary } = require('../spellchecker');

describe('loadDictionary', function () {
    it('should load dictionary', function () {
        const context = { globalState: { get: () => undefined } }; // Mock context
        const dictionary = loadDictionary(context);
        assert.equal(dictionary.get('example'), true);
    });
});

