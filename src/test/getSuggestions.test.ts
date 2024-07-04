// const chai = require('chai')
// const expect = chai.expect;
// // import { it, describe } from 'node:test';
// import { assert } from 'chai';
const assert = require('assert');
const { describe, it } = require('mocha');
const { getSuggestions } = require('../spellchecker');
const { generateTestDict } = require('./utils');

// import { getSuggestions } from '../spellchecker';
// import { generateTestDict } from './utils';

// const assert = require('chai').assert;
// const { it, describe } = require('node:test');
// const { getSuggestions } = require('../extension');

describe('getSuggestions', function () {
    it('should return suggestions for misspelled words', function () {
        const dictionary = generateTestDict();
        dictionary.set('this', true);

        const suggestions = getSuggestions('exmple', dictionary);
        assert.equal(suggestions.includes('example'), true);
    });

    it('should return empty array for correct words', function () {
        const dictionary = generateTestDict();
        const suggestions = getSuggestions('example', dictionary);
        assert.equal(suggestions.length, 0);
    });

    it('should return empty array for empty words', function () {
        const dictionary = generateTestDict();
        const suggestions = getSuggestions(' ', dictionary);
        assert.equal(suggestions.length, 0);
    });
});
