const assert = require('assert');
const { describe, it } = require('mocha');
const { isWordCorrect } = require('../spellchecker');
const { generateTestDict } = require('./utils');
// const { it, describe } = require('node:test');
// const { isWordCorrect } = require('../spellchecker');

describe('isWordCorrect', function () {
    it('should return true for correct words', function () {
        const dictionary = generateTestDict();
        assert.equal(isWordCorrect('is', dictionary), true);
        assert.equal(isWordCorrect('an', dictionary), true);
        assert.equal(isWordCorrect('example', dictionary), true);
    });

    it('should return false for incorrect words', function () {
        const dictionary = generateTestDict();
        assert.equal(isWordCorrect('exmple', dictionary), false);
        assert.equal(isWordCorrect('som', dictionary), false);
        assert.equal(isWordCorrect('wrds', dictionary), false);
    });

    it('should return false for empty words', function () {
        const dictionary = generateTestDict();
        assert.equal(isWordCorrect(' ', dictionary), false);
    });
});
