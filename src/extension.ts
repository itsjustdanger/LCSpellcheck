import * as vscode from 'vscode';
import { spellCheckDocument, loadDictionary } from './spellchecker';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log("Spellchecker now active!");
	let disposable = vscode.commands.registerCommand('extension.checkSpelling', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const text = editor.document.getText();
			const misspelledWords = spellCheckDocument(text);


			vscode.window.showInformationMessage(`Misspelled words: ${misspelledWords.join(', ')}`);
		}
	})
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() { }
