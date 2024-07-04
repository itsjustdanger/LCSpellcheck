const assert = require('assert');
const { describe, it } = require('mocha');
const { spellCheckDocument } = require('../spellchecker');
const { generateTestDict } = require('./utils');

interface WordInfo {
    word: string;
    start: number;
    end: number;

}
// test/checkSpelling.test.js
describe('spellCheckDocument', function () {
    it('should identify misspelled words', function () {
        const mockEditor = {
            document: {
                getText: () => "This is an exmple text with som misspelled wrds.",
                positionAt: (index: number) => { return { line: 0, character: index } },
            }

        };
        const mockDiagnostics = { clear: () => { }, set: () => { } };
        const dictionary = generateTestDict();

        const misspelled = spellCheckDocument(mockEditor.document.getText(), dictionary);

        assert.equal(misspelled.map((w: WordInfo) => w.word).includes('exmple'), true);
        assert.equal(misspelled.map((w: WordInfo) => w.word).includes('som'), true);
        assert.equal(misspelled.map((w: WordInfo) => w.word).includes('wrds'), true);
    });

    it('should not identify correct words', function () {
        const mockEditor = {
            document: { getText: () => "This is an example text with some correct words." }
        };
        const mockDiagnostics = { clear: () => { }, set: () => { } };
        const dictionary = generateTestDict();

        const misspelled = spellCheckDocument(mockEditor.document.getText(), dictionary);

        assert.equal(misspelled.length, 0);
    });

    it('should ignore urls', function () {
        const mockEditor = {
            document: { getText: () => "This is an example text with some correct words: https://www.example.com" }
        };
        const mockDiagnostics = { clear: () => { }, set: () => { } };
        const dictionary = generateTestDict();

        const misspelled = spellCheckDocument(mockEditor.document.getText(), dictionary);

        assert.equal(misspelled.length, 0);
    });

    it('should ignore words with numbers', function () {
        const mockEditor = {
            document: { getText: () => "This is an example text with some correct words: example123" }
        };
        const mockDiagnostics = { clear: () => { }, set: () => { } };
        const dictionary = generateTestDict();

        const misspelled = spellCheckDocument(mockEditor.document.getText(), dictionary);

        assert.equal(misspelled.length, 0);
    });

    it('should ignore code blocks', function () {
        const mockEditor = {
            document: {
                getText: () => "This is an example text with some correct words: `exmple` ```python def test(): pass```",
                positionAt: (index: number) => { return { line: 0, character: index } }
            },
        };
        const mockDiagnostics = { clear: () => { }, set: () => { } };
        const dictionary = generateTestDict();

        const misspelled = spellCheckDocument(mockEditor.document.getText(), dictionary);

        assert.equal(misspelled.length, 0);
    });
});