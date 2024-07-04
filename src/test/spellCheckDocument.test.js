import assert from 'chai';
import { it, describe } from 'node:test';
import { spellCheckDocument } from '../spellchecker';
// const assert = require('chai').assert;
// const { it, describe } = require('node:test');
// const { spellCheckDocument } = require('../extension');

describe('spellCheckDocument', function () {
    it('should identify misspelled words', function () {
        const mockEditor = {
            document: { getText: () => "This is an exmple text with som misspelled wrds." }
        };
        const mockDiagnostics = { clear: () => { }, set: () => { } };
        const dictionary = new Trie();
        dictionary.set('this', true);
        dictionary.set('is', true);
        dictionary.set('an', true);
        dictionary.set('example', true);
        dictionary.set('text', true);
        dictionary.set('with', true);
        dictionary.set('some', true);
        dictionary.set('misspelled', true);
        dictionary.set('words', true);

        const misspelled = spellCheckDocument(mockEditor, mockDiagnostics, dictionary);
        assert.include(misspelled.map(w => w.word), 'exmple');
        assert.include(misspelled.map(w => w.word), 'som');
        assert.include(misspelled.map(w => w.word), 'wrds');
    });

    it('should not identify correct words', function () {
        const mockEditor = {
            document: { getText: () => "This is an example text with some correct words." }
        };
        const mockDiagnostics = { clear: () => { }, set: () => { } };
        const dictionary = new Trie();
        dictionary.set('this', true);
        dictionary.set('is', true);
        dictionary.set('an', true);
        dictionary.set('example', true);
        dictionary.set('text', true);
        dictionary.set('with', true);
        dictionary.set('some', true);
        dictionary.set('correct', true);
        dictionary.set('words', true);

        const misspelled = spellCheckDocument(mockEditor, mockDiagnostics, dictionary);
        assert.isEmpty(misspelled);
    });

    it('should ignore urls', function () {
        const mockEditor = {
            document: { getText: () => "This is an example text with some correct words: https://www.example.com" }
        };
        const mockDiagnostics = { clear: () => { }, set: () => { } };
        const dictionary = new Trie();
        dictionary.set('this', true);
        dictionary.set('is', true);
        dictionary.set('an', true);
        dictionary.set('example', true);
        dictionary.set('text', true);
        dictionary.set('with', true);
        dictionary.set('some', true);
        dictionary.set('correct', true);
        dictionary.set('words', true);

        const misspelled = spellCheckDocument(mockEditor, mockDiagnostics, dictionary);
        assert.isEmpty(misspelled);
    });

    it('should ignore numbers', function () {
        const mockEditor = {
            document: { getText: () => "This is an example text with some numbers: 1234567890" }
        };
        const mockDiagnostics = { clear: () => { }, set: () => { } };
        const dictionary = new Trie();
        dictionary.set('this', true);
        dictionary.set('is', true);
        dictionary.set('an', true);
        dictionary.set('example', true);
        dictionary.set('text', true);
        dictionary.set('with', true);
        dictionary.set('some', true);
        dictionary.set('numbers', true);

        const misspelled = spellCheckDocument(mockEditor, mockDiagnostics, dictionary);
        assert.isEmpty(misspelled);
    });

    it('should ignore code blocks and snippets', function () {
        const mockEditor = {
            document: { getText: () => "This is an example text with some code: `const example = 'example';`" }
        };
        const mockDiagnostics = { clear: () => { }, set: () => { } };
        const dictionary = new Trie();
        dictionary.set('this', true);
        dictionary.set('is', true);
        dictionary.set('an', true);
        dictionary.set('example', true);
        dictionary.set('text', true);
        dictionary.set('with', true);
        dictionary.set('some', true);
        dictionary.set('code', true);

        const misspelled = spellCheckDocument(mockEditor, mockDiagnostics, dictionary);
        assert.isEmpty(misspelled);
    });
});