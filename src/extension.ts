import * as vscode from 'vscode';
import { checkSpelling, SpellingCodeActionProvider, getSuggestions, addWordToDictionary, loadAddedWords, loadDictionary, addWordToIgnoreList, loadIgnoredWords } from './spellchecker';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const dictionary = loadDictionary();
	loadAddedWords(context, dictionary);
	const ignoreList = loadIgnoredWords(context);
	console.log("Spellchecker now active!");

	const provider = new SpellingCodeActionProvider(dictionary);
	const selector = { scheme: 'file', language: 'markdown' };
	context.subscriptions.push(vscode.languages.registerCodeActionsProvider(selector, provider, {
		providedCodeActionKinds: SpellingCodeActionProvider.providedCodeActionKinds
	}));

	const spellCheckerDiagnostics = vscode.languages.createDiagnosticCollection('spellchecker');
	context.subscriptions.push(spellCheckerDiagnostics);

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document) => {
		if (document.languageId === 'markdown' || document.languageId === 'plaintext') {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document === document) {
				checkSpelling(editor, spellCheckerDiagnostics, dictionary, ignoreList);
			}
		}
	}));

	context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
		if (event.document.languageId === 'markdown' || event.document.languageId === 'plaintext') {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document === event.document) {
				checkSpelling(editor, spellCheckerDiagnostics, dictionary, ignoreList);
			}
		}
	}));

	context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((document) => {
		if (document.languageId === 'markdown' || document.languageId === 'plaintext') {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document === document) {
				checkSpelling(editor, spellCheckerDiagnostics, dictionary, ignoreList);
			}
		}
	}));


	context.subscriptions.push(vscode.commands.registerCommand('extension.checkSpelling', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			console.log(`Dictionary contains AAPL: ${dictionary.get('AAPL')}.`)
			checkSpelling(editor, spellCheckerDiagnostics, dictionary, ignoreList);
		}
	}));


	context.subscriptions.push(vscode.commands.registerCommand('extension.addWordToDictionary', (word) => {
		console.log("Adding word to dictionary: " + word);
		addWordToDictionary(word, context, dictionary);
		console.log(`Dictionary now contains ${word}: ${dictionary.get(word)}.`);
		vscode.commands.executeCommand('extension.checkSpelling');
	}));

	context.subscriptions.push(vscode.commands.registerCommand('extension.addWordToIgnoreList', (word) => {
		console.log("Adding word to ignore list: " + word);
		addWordToIgnoreList(word, context, ignoreList);
		vscode.commands.executeCommand('extension.checkSpelling');
	}));
}

export function deactivate() { }
