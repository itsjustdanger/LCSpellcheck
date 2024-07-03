import * as fs from 'fs';
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


function spellCheckDocument(text: string): string[] {
    const words = text.match(/\b\w+\b/g) || [];
    const misspelledWords = [];

    if (words) {
        for (const word of words) {
            if (!isWordCorrect(word)) {
                misspelledWords.push(word);
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

export { spellCheckDocument, loadDictionary };