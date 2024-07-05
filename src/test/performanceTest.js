const fs = require('fs');
const path = require('path');
const { Trie } = require('ternary-search-trie');


function loadDictionary() {
    const dictionary = new Trie();
    const filePath = path.join(__dirname, '', '../dictionary.txt');
    const words = fs.readFileSync(filePath, 'utf8').split('\n');

    for (const word of words) {
        const cleanedWord = word.toLowerCase();

        if (cleanedWord.length >= 1) {
            dictionary.set(cleanedWord, true);
        }
    }

    return dictionary
}

const dictionary = loadDictionary();
const filePath = path.join(__dirname, '', './test.md')
const text = fs.readFileSync(filePath, 'utf8');
const cache = new Map();

function spellCheckDocument(text, dictionary, cacheEnabled = true) {
    const urlRegex = /\b(https?:\/\/|www\.)\S+\b/gi;
    const cleanText = text.replace(urlRegex, '');
    const codeRegex = /(?:```[\s\S]*?```)|(?:`[\s\S]*?`)/g;
    const sansCodeText = cleanText.replace(codeRegex, '');
    const words = sansCodeText.match(/(?<![\w\*\_\-])([a-zA-Z]+)(?![\w\*\_\-])/g) || [];
    const misspelledWords = [];
    let index = 0;

    if (words) {
        for (const word of words) {
            index = text.indexOf(word, index);

            if (!isWordCorrect(word, dictionary, cacheEnabled)) {
                console.log('Misspelled word: ' + word)
                console.log(`Dict has ${word} | ${dictionary.get(word)}`)
                console.log(`Dict has ${word.toLowerCase()} | ${dictionary.get(word.toLowerCase())}`)
                misspelledWords.push({ word, index });
                index += word.length;
            }
        }
    }

    return misspelledWords;
}


function isWordCorrect(word, dictionary, cacheEnabled = true) {
    const wordLower = word.toLowerCase();

    if (cacheEnabled && cache.has(wordLower)) {
        return !!cache.get(wordLower);
    }

    const isCorrect = !!dictionary.get(wordLower);

    if (cacheEnabled) {
        cache.set(wordLower, isCorrect);
    }

    return isCorrect
}

// time how long it takes to spell check the document
const noCacheDeltas = [];
const withCacheDeltas = []
const trials = 100;

for (let i = 0; i < trials; i++) {
    const start = Date.now();
    spellCheckDocument(text, dictionary, true);
    const end = Date.now();

    noCacheDeltas.push(end - start);

    const start2 = Date.now();
    spellCheckDocument(text, dictionary, false);
    const end2 = Date.now();

    withCacheDeltas.push(end - start);
}

const noCacheAverage = noCacheDeltas.reduce((acc, curr) => acc + curr, 0) / trials;
const withCacheAverage = withCacheDeltas.reduce((acc, curr) => acc + curr, 0) / trials;

console.log('No cache average: ' + noCacheAverage);
console.log('With cache average: ' + withCacheAverage);



