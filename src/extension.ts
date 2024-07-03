import * as vscode from 'vscode';
import { spellCheckDocument, loadDictionary, checkSpelling } from './spellchecker';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log("Spellchecker now active!");

	const spellCheckerDiagnostics = vscode.languages.createDiagnosticCollection('spellchecker');
	context.subscriptions.push(spellCheckerDiagnostics);

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document) => {
		if (document.languageId === 'markdown' || document.languageId === 'plaintext') {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document === document) {
				checkSpelling(editor, spellCheckerDiagnostics);
			}
		}
	}));

	let disposable = vscode.commands.registerCommand('extension.checkSpelling', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			// const text = editor.document.getText();
			// const misspelledWords = spellCheckDocument(text);

			checkSpelling(editor, spellCheckerDiagnostics);

			// vscode.window.showInformationMessage(`Misspelled words: ${misspelledWords.join(', ')}`);
		}
	})

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
