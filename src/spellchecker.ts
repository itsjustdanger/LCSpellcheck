import * as fs from 'fs';
import * as vscode from 'vscode';
import { Trie } from 'ternary-search-trie';
import path, { join } from 'path';

function loadDictionary(): Trie<boolean | null> {
    const dictionary: Trie<boolean | null> = new Trie();
    const filePath = path.join(__dirname, '', 'dictionary.txt');
    const words = fs.readFileSync(filePath, 'utf8').split('\n');

    for (const word of words) {
        const cleanedWord = word.toLowerCase();

        if (cleanedWord.length >= 1) {
            dictionary.set(cleanedWord, true);
        }
    }

    return dictionary
}

function checkSpelling(editor: vscode.TextEditor, diagnostics: vscode.DiagnosticCollection, dictionary: Trie<boolean | null>, ignoreList: Trie<boolean | null>) {

    const text = editor.document.getText();
    const misspelledWords = spellCheckDocument(text, dictionary);
    const diagArray: vscode.Diagnostic[] = [];

    diagnostics.clear();
    console.log(`Misspelled words: ${misspelledWords.length}`);
    misspelledWords.map(wordInfo => console.log(wordInfo.word));
    misspelledWords.forEach(wordInfo => {
        if (ignoreList.get(wordInfo.word)) {
            return;
        }
        const range = new vscode.Range(
            editor.document.positionAt(wordInfo.index),
            editor.document.positionAt(wordInfo.index + wordInfo.word.length)
        );

        const diagnostic = new vscode.Diagnostic(
            range,
            `Misspelled word: ${wordInfo.word}`,
            vscode.DiagnosticSeverity.Error
        );
        diagArray.push(diagnostic);
    });

    diagnostics.set(editor.document.uri, diagArray);

    return misspelledWords;
}


function spellCheckDocument(text: string, dictionary: Trie<boolean | null>): { word: string, index: number }[] {
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

            if (!isWordCorrect(word, dictionary)) {
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


function isWordCorrect(word: string, dictionary: Trie<boolean | null>): boolean {
    const wordLower = word.toLowerCase();

    const isCorrect = !!dictionary.get(wordLower);

    return isCorrect
}


function getSuggestions(misspelledWord: string, dictionary: Trie<boolean | null>): string[] {
    if (isWordCorrect(misspelledWord, dictionary)) {
        return [];
    }

    const MAX_DISTANCE = 2;
    const suggestions: string[] = [];

    dictionary.keysWithPrefix(misspelledWord[0]).forEach((word: string) => {
        const distance = levenshteinDistance(misspelledWord, word);

        if (distance <= MAX_DISTANCE) {
            suggestions.push(word);
        }
    });

    return suggestions.sort((a, b) => levenshteinDistance(misspelledWord, a) - levenshteinDistance(misspelledWord, b)).slice(0, 5);
}

function levenshteinDistance(s: string, t: string) {
    const d = [];

    const m = s.length;
    const n = t.length;

    for (let i = 0; i <= m; i++) {
        d[i] = [i];
    }
    for (let j = 0; j <= n; j++) {
        d[0][j] = j;
    }
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = s[i - 1] === t[j - 1] ? 0 : 1;
            d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
        }
    }
    return d[m][n];
}

function addWordToDictionary(word: string, context: vscode.ExtensionContext, dictionary: Trie<boolean | null>) {
    const addedWords: string[] = context.globalState.get('addedWords', []);

    if (!addedWords.includes(word)) {
        addedWords.push(word);
        context.globalState.update('addedWords', addedWords);
        dictionary.set(word.toLowerCase(), true);
    }
}

function loadAddedWords(context: vscode.ExtensionContext, dictionary: Trie<boolean | null>) {
    const addedWords: string[] = context.globalState.get('addedWords', []);
    addedWords.forEach((word: string) => {
        dictionary.set(word.toLowerCase(), true);
    });
}

function addWordToIgnoreList(word: string, context: vscode.ExtensionContext, ignoredWords: Trie<boolean | null>) {
    const ignoreList: string[] = context.globalState.get('ignoreList', []);

    if (!ignoreList.includes(word)) {
        ignoreList.push(word);
        context.globalState.update('ignoreList', ignoreList);
        ignoredWords.set(word, true);
    }
}

function loadIgnoredWords(context: vscode.ExtensionContext): Trie<boolean | null> {
    const ignoreWords: Trie<boolean | null> = new Trie()
    const ignoredWords = context.globalState.get('ignoreList', []);

    ignoredWords.forEach((word: string) => {
        ignoreWords.set(word, true);
    });

    return ignoreWords
}

class SpellingCodeActionProvider implements vscode.CodeActionProvider {
    constructor(private dictionary: Trie<boolean | null>) { }

    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeAction[]> {
        const misspelledWord = document.getText(range);
        const suggestions = getSuggestions(misspelledWord, this.dictionary);
        const fixes = [];

        for (const suggestion of suggestions) {
            const fix = new vscode.CodeAction(`Change to '${suggestion}'`, vscode.CodeActionKind.QuickFix);
            fix.edit = new vscode.WorkspaceEdit();
            fix.edit.replace(document.uri, range, suggestion);

            fixes.push(fix);
        }

        const addition = new vscode.CodeAction(`Add '${misspelledWord}' to dictionary`, vscode.CodeActionKind.QuickFix);
        addition.command = {
            command: 'extension.addWordToDictionary',
            title: 'Add word to dictionary',
            arguments: [misspelledWord]
        };

        fixes.push(addition);

        const ignore = new vscode.CodeAction(`Ignore '${misspelledWord}'`, vscode.CodeActionKind.QuickFix);
        ignore.command = {
            command: 'extension.addWordToIgnoreList',
            title: 'Ignore word',
            arguments: [misspelledWord]
        };

        fixes.push(ignore);

        return fixes;
    }
}

export { isWordCorrect, spellCheckDocument, loadDictionary, loadAddedWords, checkSpelling, SpellingCodeActionProvider, getSuggestions, addWordToDictionary, addWordToIgnoreList, loadIgnoredWords };