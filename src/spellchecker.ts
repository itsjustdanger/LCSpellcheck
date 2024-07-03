import * as fs from 'fs';
import * as vscode from 'vscode';
import { Trie } from 'ternary-search-trie';
import path from 'path';

const dictionary = new Trie();
const cache = new Map<string, boolean | string[]>();

function loadDictionary() {
    const filePath = path.join(__dirname, '', 'dictionary.txt');
    console.log(filePath);
    // fs.readFile(filePath, 'utf8', (err, data) => {
    //     if (err) {
    //         console.error(err);
    //         return;
    //     }
    //     const words = data.split('\n');

    //     for (const word of words) {
    //         dictionary.set(word.toLowerCase(), true);
    //     }
    // });
    const words = fs.readFileSync(filePath, 'utf8').split('\n');

    for (const word of words) {
        const cleanedWord = word.toLowerCase();
        // console.log(cleanedWord);
        if (cleanedWord.length > 1) {
            dictionary.set(cleanedWord, true);
        }
    }
}

function checkSpelling(editor: vscode.TextEditor, diagnostics: vscode.DiagnosticCollection) {
    const text = editor.document.getText();
    const misspelledWords = spellCheckDocument(text);
    const diagArray: vscode.Diagnostic[] = [];

    // Clear previous diagnostics
    diagnostics.clear();

    // Generate diagnostics for each misspelled word
    misspelledWords.forEach(wordInfo => {
        const range = new vscode.Range(
            editor.document.positionAt(wordInfo.index),
            editor.document.positionAt(wordInfo.index + wordInfo.word.length)
        );

        const diagnostic = new vscode.Diagnostic(
            range,
            `Misspelled word: ${wordInfo.word}`,
            vscode.DiagnosticSeverity.Error // You can choose the severity level
        );
        diagArray.push(diagnostic);
    });

    // Set the diagnostics for this document
    diagnostics.set(editor.document.uri, diagArray);
}




function spellCheckDocument(text: string): { word: string, index: number }[] {
    const words = text.match(/\b\w+\b/g) || [];
    const misspelledWords = [];
    let index = 0;

    if (words) {
        for (const word of words) {
            index = text.indexOf(word, index);

            if (!isWordCorrect(word)) {
                misspelledWords.push({ word, index });
                index += word.length;
            }
        }
    }

    return misspelledWords;
}


function isWordCorrect(word: string): boolean {
    if (cache.has(word)) {
        return cache.get(word) as boolean;
    }

    console.log(dictionary.get(word.toLowerCase()));
    const isCorrect = !!dictionary.get(word.toLowerCase());
    cache.set(word, isCorrect);

    return isCorrect
}


function getSuggestions(misspelledWord: string): string[] {
    return dictionary.keysWithPrefix(misspelledWord.substring(0, 2))
        .filter((word: string) => isCloseMatch(misspelledWord, word))
        .slice(0, 5);
}

function isCloseMatch(word1: string, word2: string): boolean {

    return true
}

loadDictionary();

export { spellCheckDocument, loadDictionary, checkSpelling };