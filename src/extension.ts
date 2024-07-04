import * as vscode from 'vscode';
import { checkSpelling, SpellingCodeActionProvider, getSuggestions, addWordToDictionary, loadAddedWords, loadDictionary } from './spellchecker';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const dictionary = loadDictionary();
	loadAddedWords(context, dictionary);
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
				checkSpelling(editor, spellCheckerDiagnostics, dictionary);
			}
		}
	}));

	let disposable = vscode.commands.registerCommand('extension.checkSpelling', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			checkSpelling(editor, spellCheckerDiagnostics, dictionary);
		}
	})

	context.subscriptions.push(disposable);

	context.subscriptions.push(vscode.commands.registerCommand('extension.correctSpelling', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const word = editor.document.getText(editor.selection);
			const suggestions = getSuggestions(word, dictionary);

			vscode.window.showQuickPick(suggestions, {
				placeHolder: 'Choose the correct spelling',
			}).then(selection => {
				if (selection) {
					editor.edit(editBuilder => {
						editBuilder.replace(editor.selection, selection);
					});
				}
			});
		}
	}));

	// const addedWords = context.globalState.get('addedWords', []);

	context.subscriptions.push(vscode.commands.registerCommand('extension.addWordToDictionary', (word) => {
		addWordToDictionary(word, context, dictionary);
	}));
}

export function deactivate() { }
