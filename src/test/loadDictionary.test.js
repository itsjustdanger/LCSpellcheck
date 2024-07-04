// test/loadDictionary.test.js
const assert = require('chai').assert;
const { loadDictionary } = require('../extension');

describe('loadDictionary', function () {
    it('should load dictionary', function () {
        const context = { globalState: { get: () => undefined } }; // Mock context
        const dictionary = loadDictionary(context);
        assert.isTrue(dictionary.has('example'));
    });
});

