import * as fs from 'fs';
import * as vscode from 'vscode';
import { Trie } from 'ternary-search-trie';
import path from 'path';

const dictionary = new Trie();
const cache = new Map<string, boolean | string[]>();

function loadDictionary() {
    const filePath = path.join(__dirname, '', 'dictionary.txt');
    const words = fs.readFileSync(filePath, 'utf8').split('\n');

    for (const word of words) {
        const cleanedWord = word.toLowerCase();
        // console.log(cleanedWord);
        if (cleanedWord.length >= 1) {
            dictionary.set(cleanedWord, true);
        }
    }
}

function checkSpelling(editor: vscode.TextEditor, diagnostics: vscode.DiagnosticCollection) {
    const text = editor.document.getText();
    const misspelledWords = spellCheckDocument(text);
    const diagArray: vscode.Diagnostic[] = [];

    diagnostics.clear();

    misspelledWords.forEach(wordInfo => {
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
}


function spellCheckDocument(text: string): { word: string, index: number }[] {
    const urlRegex = /\b(https?:\/\/|www\.)\S+\b/gi;
    const cleanText = text.replace(urlRegex, '');
    const words = cleanText.match(/(?<![\w\*\_\-])([a-zA-Z]+)(?![\w\*\_\-])/g) || [];
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

    const isCorrect = !!dictionary.get(word.toLowerCase());
    cache.set(word, isCorrect);

    return isCorrect
}


function getSuggestions(misspelledWord: string): string[] {
    const MAX_DISTANCE = 2;
    const suggestions: string[] = [];

    dictionary.keysWithPrefix(misspelledWord[0]).forEach((word: string) => {
        const distance = levenshteinDistance(misspelledWord, word);

        if (distance <= MAX_DISTANCE) {
            suggestions.push(word);
        }
    });

    return suggestions.sort((a, b) => levenshteinDistance(misspelledWord, a) - levenshteinDistance(misspelledWord, b));
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

class SpellingCodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeAction[]> {
        const misspelledWord = document.getText(range);
        const suggestions = getSuggestions(misspelledWord); // This needs to be implemented to fetch suggestions based on the misspelled word

        return suggestions.map(suggestion => this.createFix(document, range, suggestion));
    }

    private createFix(document: vscode.TextDocument, range: vscode.Range, suggestion: string): vscode.CodeAction {
        const fix = new vscode.CodeAction(`Change to '${suggestion}'`, vscode.CodeActionKind.QuickFix);
        fix.edit = new vscode.WorkspaceEdit();
        fix.edit.replace(document.uri, range, suggestion);
        return fix;
    }
}

loadDictionary();

export { spellCheckDocument, loadDictionary, checkSpelling, SpellingCodeActionProvider, getSuggestions };