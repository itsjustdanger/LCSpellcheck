Title: Spellchecker Part 1
Date: 2024-07-03
Category: Projects
Status: draft

Pretty much as soon I started writing this blog I began getting annoyed with writing in a text editor (vscode, for now). Don't get me wrong, I like writing in a text editor (I use vim - sort of). But while I'm a fast typer, I'm not a super accurate one. So, spellchecking is a requirement. There are tons of spellcheckers out there for vscode, but NIH syndrome is a great excuse for personal projects to learn something new. I don't know how to write a vscode extension and I don't know how to write a spellchecker. So it's worth doing both.

## The plan

If you're following along with this blog, you'll notice that I like to start every project with a plan. I use plans not only to keep myself on track and organized, but also to conduct a mini retro at the end of each project. What did I get right? What did I get wrong? I teach this technique to all my new engineers and I think it's an overall great strategy for learning. Maybe I'll write an article about that some day. Anyway, the plan:

1. Write a vscode extension that loads the document text.
2. Pass the text into a function that pulls out each word.
3. Get a dictionary.
4. Load the dictionary into memory.
5. Compare each word in the document to the dictionary and return missing words as "misspelled"
6. Highlight the misspelled words in the document.
7. Implement suggestions.

Let's jump in.

## Basic extension and text loading

To start, I'm not going to work from scratch. Some research lead me to a [the official vscode tutorial](https://code.visualstudio.com/api/get-started/your-first-extension). I'm going to follow that tutorial and modify it to load the text of the document into a variable. 

to start, we need to install yeoman and the vscode extension generator.

```bash
npm install --global yo generator-code
```

Then we can generate the extension.

```bash
yo code
```

Easy. With this basic extension I'll add the basic framework.

```typescript
import * as vscode from 'vscode';
import { spellCheckDocument } from './spellchecker';

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.checkSpelling', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const text = editor.document.getText();
            spellCheckDocument(text).then((misspelledWords) => {
                console.log('Misspelled words:', misspelledWords);
            });
        }
    });

    context.subscriptions.push(disposable);
}
```

And the spellchecker function.

```typescript
async function spellCheckDocument(text: string): Promise<string[]> {
    return [];
}
```

This next part tripped me up. We need to modify the `package.json` file to include a command for the extension. This is what I added:

```json
"contributes": {
    "commands": [
      {
        "command": "extension.checkSpelling",
        "title": "Spell Check"
      },
    ]
}
```

This adds "Spell Check" to the command palette and activates the extension. Now we can run the extension by pressing F5 (or run) and it will open up a new vscode window. I opened up this very repo and ran Spell Check from the palette. The console printed out:

`Misspelled words: []`

Jackpot.

## Skipping steps

At this point, I realized that my plan had some steps backwards. It made more sense to get the dictionary first, _then_ pull words out to do the matching. So, I'm going to skip to step 3, get a dictionary, load them into memory, and then come back to step 2.

I searched for "spell check word list" and found "SCOWL", or Spell Checker Oriented Word Lists. It's a collection of word lists for spell checking. I went to [the repo](https://github.com/en-wl/wordlist), pulled it down, and made a full file of all the word lists. 

I want to keep things easy, so I'm just going to take _all_ of the lists and put them into a single file, with each word its own newline. This was pretty easily accomplished with some python:

```python
import os

dir = "final" # this is the name of SCOWL's final directory
files = os.listdir(dir)
files.sort()


with open("wordlist.txt", "w", encoding="utf-8") as f:
    for file in  files:
        with open(f"{dir}/{file}") as wordlist:
            for word in wordlist:
                f.write(word)
```

Or not. We failed because of some encoding issues. So I had to expand the script to handle that. I actually dealt with this before in a previous project so stole some code from that:

```python
def create_single_txt():
    dir = 'final'
    files = os.listdir(final_dir)
    files.sort()
    
    encodings = ['utf-8', 'iso-8859-1', 'windows-1252']
    
    with open('wordlist.txt', 'w', encoding='utf-8') as f: 
        for file in files:
            file_path = os.path.join(dir, file)
            file_content = read_file_with_encoding(file_path, encodings)
            if file_content:
                f.write(file_content)
            else:
                print(f"RIP: {file}")

def read_file_with_encoding(file_path, encodings):
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as file:
                return file.read()
        except UnicodeDecodeError:
            continue
    return None  
```

And voilà. Success. We have a single file with all the words. Now let's store them.

## The dictionary

Let's take a pause and think about what we're actually going to do here with this spell checker.

We load all the words in the dictionary.
We load all the words in the document.
We compare each word in the document to the dictionary.

Holy moly is this inefficient. This whole thing is basically a whiteboarding problem, so let's think of it like one.

We know the brute force solution, and while I'm a self-declared "brute force" programmer, let's try to level up and be slightly more efficient.

What is the duplicate work here? We keep on looking at the dictionary. My first thought is thow a cache at things. We can store the dictionary in a map, where each word is a key with a boolean value. This means we iterate through the dictionary once, and then we can check if a word is in the dictionary in O(1) time. Cool.

Let's think one step further. How will this be used?

Well, we're going to want to find similar words. We'll do this using some sort of word distance algorithm. We'll need to compare each word in the document to each word in the dictionary. But do we _actually_ need to compare each word in the dictionary? No, we don't. We can significantly reduce the search space by only comparing words that have similar prefixes. This is inherently a problem for [tries]() to solve!

What we'll do is build a trie of the dictionary. Then, when we're looking for suggestions we can traverse the trie up to a certain depth, calculate the distance of only those words, and return the closest ones. But let's think just a bit more. Do we actually want to do this? The answer is _maybe_. The reality is that if we have a misspelled word like "ardvark", if we are searching a depth of 2, we'll never mind "aardvark". Is only going one level deep enough? Maybe! We'll do it anyway because why not?

## The trie

I'm going to use the [ternary-search-trie package](https://www.npmjs.com/package/ternary-search-trie) to build the trie, because I don't feel like doing it myself right now. We'll then import it and build the trie from the dictionary:

```typescript
import * as fs from 'fs';
import { Trie } from 'ternary-search-trie';
import path from 'path';

const dictionary = new Trie();

function loadDictionary() {
    const filePath = path.join(__dirname, '', 'dictionary.txt');
    const words = fs.readFileSync(filePath, 'utf8').split('\n');

    for (const word of words) {
        const cleanedWord = word.toLowerCase();
        
        // We do this in case there's a rogue newline in the dictionary. 
        // I don't feel like manually searching for it and removing it.
        if (cleanedWord.length >= 1) {
            dictionary.set(cleanedWord, true);
        }
    }
```

Pretty straightforward here. We load the file, split it by newline, and add each word to the trie. Now let's find misspelled words. We'll modify our `spellCheckDocument` function to pull out all the words and check each word against the trie.

```typescript
function spellCheckDocument(text: string): string[] {
    const words = text.match(/(?<![\w\*\_\-])([a-zA-Z]+)(?![\w\*\_\-])/g) || [];
    const misspelledWords: string[] = [];

    if (words) {
        for (const word of words) {
            if (!dictionary.get(word.toLowerCase())) {
                misspelledWords.push(word);
            }
        }
    }
}
```

I barely have any idea what this regex is doing. It is grabbing all words, ignore punctuation, ignoring common markdown symbols, and ignoring numbers. My strategy for regex crafting is similar to my strategy for fighting games, bash buttons until it works. 

No we can run the extension and see if it works! It does! We have a list of misspelled words. This list is too long! It includes parts of urls. We'll need to filter those out.

```typescript
const urlRegex = /\b(https?:\/\/|www\.)\S+\b/gi;
const cleanText = text.replace(urlRegex, '');
const words = cleanText.match(/(?<![\w\*\_\-])([a-zA-Z]+)(?![\w\*\_\-])/g) || [];
const misspelledWords = [];
```

Boom.

But just before we adjourn for this post, let's add a bit of efficiency. We're going to cache our spellcheck results so we don't have to search the dictionary for the same word over and over. We'll add a map to the top of the file:

```typescript
const cache = new Map<string, boolean | string[]>();
```

Then we'll use this cache in our `spellCheckDocument` function. But we're actually going to pull this functionality into its own function for clarity:

```typescript
function isWordCorrect(word: string): boolean {
    if (cache.has(word)) {
        return cache.get(word) as boolean;
    }

    const isCorrect = !!dictionary.get(word.toLowerCase());
    cache.set(word, isCorrect);

    return isCorrect
}
```

Then we'll add this to our `spellCheckDocument` function:

```typescript
function spellCheckDocument(text: string): { word: string, index: number }[] {
    const urlRegex = /\b(https?:\/\/|www\.)\S+\b/gi;
    const cleanText = text.replace(urlRegex, '');
    const words = cleanText.match(/(?<![\w\*\_\-])([a-zA-Z]+)(?![\w\*\_\-])/g) || [];
    const misspelledWords = [];

    if (words) {
        for (const word of words) {
            if (!isWordCorrect(word)) {
                misspelledWords.push({ word, index });
            }
        }
    }

    return misspelledWords;
}
```

Now when we run the extension, we only get misspelled words that aren't in urls, we ignore markdown, and we cache the results. Next up, we'll do highlighting and suggestions.

Title: Spellchecker Part 2
Date: 2024-07-03
Category: Projects
Status: draft

So, last time we got an extension working that identifies all the misspelled words in a file. Now we want to add highlighting and suggestions. Let's kick it.

## Highlighting

I want to add those little red squiggles underneath the misspelled words. These seem to be called "diagnostics" to vscode. Diagnostics are objects that are made up of a range (the start and end of the squiggle), a message (some context as to why the squiggle exists), and a severity level (this defines whether it's an error, warning, info, etc.). To do what we're trying to do, we add a diagnostic "collection" to the vscode context, and then create a new diagnostic and add it to the diagnostic array.

We're going to add a parent function, `checkSpelling` that will take the extra parameter and pass the editor and the text to our original `spellCheckDocument` function. We'll eventually need to modify that a bit, so this helps compartmentalize our changes.

```typescript
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
			checkSpelling(editor, spellCheckerDiagnostics);
		}
	})

	context.subscriptions.push(disposable);
```

Now lets create the new diagnostic and add it to the collection. We'll pass the diagnostic collection to the `spellCheckDocument` function, find the misspelled words (as we were doing before), get their position relative to the document, create a new diagnostic for each word, and add them to the collection.

```typescript
function checkSpelling(editor: vscode.TextEditor, diagnostics: vscode.DiagnosticCollection) {
    const text = editor.document.getText();
    const misspelledWords = spellCheckDocument(text); // Get the misspelled words
    const diagArray: vscode.Diagnostic[] = []; 

    diagnostics.clear(); // We do this so every it checks we start fresh

    misspelledWords.forEach(wordInfo => {
        const range = new vscode.Range(
            editor.document.positionAt(wordInfo.index),
            editor.document.positionAt(wordInfo.index + wordInfo.word.length)
        ); // Create a Range to put the squiggles in the right place

        const diagnostic = new vscode.Diagnostic( // Create the diagnostic
            range,
            `Misspelled word: ${wordInfo.word}`,
            vscode.DiagnosticSeverity.Error
        );

        diagArray.push(diagnostic); // Add the diagnostic to the array
    });

    diagnostics.set(editor.document.uri, diagArray); // Add the array to the collection
}
```

Notice that our "word" output from `spellCheckDocument` now has to be an objects that includes a "word" and an "index". This is so we can properly put the squiggles in the right place. We'll need to modify our `spellCheckDocument` function to return this new object.

```typescript
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
```

This is super inefficient, but we are literally just grabbing the `indexOf` from the text. We'll maybe optimize this later. We'll definitely have to if we're playing any larger files.

Once we do this, we have our glorious red squiggles. 

## Suggestions

This is the really fun part. Now we get to suggest words to replace the misspelled ones. To do this, we need to do a few things. We need to generate the suggestions, create a code action to replace the word, and then add the action to the diagnostic's context menu. For the latter, we're just going to use the "Quick Fix" code action, basically because this is all I could figure out how to do.

For suggestions, we're going to write our own suggestion algorithm. If you search for "spell check algorithm," you'll quickly come across Levenshtein distance. This is just a measure of the difference between two strings. [Per Wikipedia](https://en.wikipedia.org/wiki/Levenshtein_distance), 

> the Levenshtein distance between two words is the minimum number of single-character edits (insertions, deletions, or substitutions) required to change one word into the other. 

The smaller the distance, the more similar the words are. Here we're operating under the assumption that the intended word is only a few edits away from the misspelling. We define a threshold for how similar a word needs to be to qualify as a suggestion. We're going to use this to generate our suggestions. And we'll use a threshold of 2.

I'll use the python implementation in the Wikipedia and convert it to Typescript. Here's what our implementation looks like:

```typescript
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
```

Now that we have our distance algorithm, we will calculate the distance between our misspelled word and _every_ word in our dictionary. Wait, hold up. We won't do that. That's insane. We're going to use the magic of our trie here. We'll use the trie to pull all the keys that include the first two letters of our misspelled word and then calculate the distance between those words and our misspelled word. Using the trie should significantly reduce the number of words we need to look at.

Here's what that looks like:

```typescript
function getSuggestions(misspelledWord: string): string[] {
    const MAX_DISTANCE = 2;
    const suggestions: string[] = [];

    dictionary.keysWithPrefix(misspelledWord.slice(0, 2)).forEach((word: string) => {
        const distance = levenshteinDistance(misspelledWord, word);

        if (distance <= MAX_DISTANCE) {
            suggestions.push(word);
        }
    });

    return suggestions.sort((a, b) => levenshteinDistance(misspelledWord, a) - levenshteinDistance(misspelledWord, b));
}
```

We define a threshold of `MAX_DISTANCE`, iterate through the keys in our trie that begin with the first two letters of our misspelled word, calculate the difference between all of the keys and our misspelled word, and add all the words that are within the threshold to our suggestions. Boom.

# Replacing the word

Now we need to display the suggestions and create a code action that will replace the word. A lot of this is boiler plate, but the idea is we create a `CodeActionProvider` that gets the range of the misspelled word, gets the suggestions, and then creates a "Code Action" for each suggestion. 

```typescript
class SpellingCodeActionProvider implements vscode.CodeActionProvider {
    public static readonly providedCodeActionKinds = [
        vscode.CodeActionKind.QuickFix
    ];

    public provideCodeActions(document: vscode.TextDocument, range: vscode.Range, context: vscode.CodeActionContext, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeAction[]> {
        const misspelledWord = document.getText(range);
        const suggestions = getSuggestions(misspelledWord);
        const fixes = [];

        for (const suggestion of suggestions) {
            const fix = new vscode.CodeAction(`Change to '${suggestion}'`, vscode.CodeActionKind.QuickFix);
            fix.edit = new vscode.WorkspaceEdit();
            fix.edit.replace(document.uri, range, suggestion);

            fixes.push(fix);
        }

        return fixes;
    }
}
```

Next we add this provider in our `activate` function. I also added in a couple lines to make sure this only works on markdown files. Because that's all I need.

```typescript
export function activate(context: vscode.ExtensionContext) {
	console.log("Spellchecker now active!");
	const provider = new SpellingCodeActionProvider();
	const selector = { scheme: 'file', language: 'markdown' };

	context.subscriptions.push(vscode.languages.registerCodeActionsProvider(selector, provider, {
		providedCodeActionKinds: SpellingCodeActionProvider.providedCodeActionKinds
	}));

	const spellCheckerDiagnostics = vscode.languages.createDiagnosticCollection('spellchecker');
	context.subscriptions.push(spellCheckerDiagnostics);

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument((document) => {
		if (document.languageId === 'markdown') {
			const editor = vscode.window.activeTextEditor;
			if (editor && editor.document === document) {
				checkSpelling(editor, spellCheckerDiagnostics);
			}
		}
	}));

	let disposable = vscode.commands.registerCommand('extension.checkSpelling', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			checkSpelling(editor, spellCheckerDiagnostics);
	    })

	context.subscriptions.push(disposable);
}
```

There we have it. We now have a spellchecker that identifies misspelled words, highlights them, and provides suggestions. But we're not done yet. There are three more things I want to add:

1. Ignore words in code blocks
2. Enable users to add to the dictionary
3. Enable users to add to an ignore list

Once those are in, I _think_ I'll be satisfied. But we'll see.


Title: Spellchecker Part 3
Date: 2024-07-04
Category: Projects
status: draft

So, we basically finished what we set out to do. I'm literally writing this post with my spellchecker enabled. But after using it for a bit, there are some extra features I'd like to add:

1. Ignore text inside code snippets/blocks
2. Let the user add words to the dictionary

But first, let's do a brief retro, refactor, and outline a new plan.

# Retro

Here was our plan from part 1:

1. Write a vscode extension that loads the document text.
2. Pass the text into a function that pulls out each word.
3. Get a dictionary.
4. Load the dictionary into memory.
5. Compare each word in the document to the dictionary and return missing words as "misspelled"
6. Highlight the misspelled words in the document.
7. Implement suggestions.

The first thing we'll think about is, was this plan comprehensive? Did we have to do anything extra? Were any of these steps unnecessary?

Well, we pushed step 2 to come after 3 and 4. This just made sense given the flow of development. For me, personally, it made sense to step away from the codebase and grab a dictionary before continuing on with writing the extraction and comparison code. This is just a personal preference. 

In terms of extraction, we definitely missed a few things, one is we didn't account for urls, and another is we didn't account for code snippets and blocks. 

Beyond that, most of the other pieces will be taken care of in refactoring. As a part of this step we want to write tests, but the code itself isn't very testable, so we'll try and convert a lot of our functions to pure functions. Let's do that.

# Function refactoring

So, we're going to create the dictionary at the top level, within the activation function of the extension. We can then pass it down to everything else. This makes things easily mockable and removes the dictionary creation as a side effect of loading the file with all the spell checker functions (I put these in a different file for organizational purposes).

So let's do that first, that's easy. We'll modify our `loadDictionary` function to return the dictionary, and then we'll call it in the `activate` function:

```typescript
function loadDictionary(context: vscode.ExtensionContext): Trie<boolean | null> {
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
```

```typescript
export function activate(context: vscode.ExtensionContext) {
	const dictionary = loadDictionary(context);

    console.log("Spellchecker now active!");

    // ... everything else ...

}
```

Now, we'll pass it down to the `checkSpelling` function every time we reference it. Our `activate` function now looks like this: 

```typescript
export function activate(context: vscode.ExtensionContext) {
	const dictionary = loadDictionary(context);
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

	constext.subscriptions.push(vscode.commands.registerCommand('extension.checkSpelling', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			checkSpelling(editor, spellCheckerDiagnostics, dictionary);
		}
	}));
}
```

Okay, now let's walk down the line and pass the dictionary to each function that needs it. That will be:

 - `spellCheckDocument`
 - `isWordCorrect`
 - `getSuggestions`

 We also need to add the dictionary somehow within the `SpellingCodeActionProvider` class. This will be slightly different - we need to pass it through a constructor. So we'll briefly refactor this code to add this line:

    ```typescript
    constructor(private dictionary: Trie<boolean | null>) {}
    ```

That took me a bit to figure out.

We're pretty much set with refactoring. Now, before we continue we'll write some tests.

# Tests

I wrote a number of test. I'm not going to go over that here, but you should generally test your code.

# Plan

So, here's our new plan:

1. Write (find) a RegEx that will match code blocks and snippets.
2. Replace that text with '' (just like we did with urls)
3. Write a function that will add words to the dictionary

Okay, hold up. That last one is a doozy. We need to pick it apart a little. How are we going to do this?

Ultimately, our dictionary is a trie. So we want to load words into the trie. We don't necessarily want them permanently in there. I can't tell you why exactly but my gut tells me we want to distinguish between words that are in the default dictionary and words that are added by users. We're loading the trie into memory each time we boot up the plugin, so we can just add words in there after it's loaded. Okay.

So we load the trie, we add the added words. Those added words need to be stored there, and ideally between sessions. Some research lead me to `globalState` which is a way for us to store data between editor sessions. It works like so:

```typescript
context.globalState.update('addedWords', ['word1', 'word2']); // Set the words
context.globalState.get('addedWords'); // Get the words
```

So, we'll store added words in `globalState`, pull them out, and load them into the trie. So the top of our `activate` function will look something like this:

```typescript
export function activate(context: vscode.ExtensionContext) {
	const dictionary = loadDictionary();
	loadAddedWords(context, dictionary);

    // ... everything else ...
}
```

I like writing code like this because it lets me think of high level concepts and worry about implementation details later.

Later is now. Let's write `loadAddedWords`.

```typescript
function loadAddedWords(context: vscode.ExtensionContext, dictionary: Trie<boolean | null>) {
    const addedWords: string[] = context.globalState.get('addedWords', []);

    addedWords.forEach((word: string) => {
        dictionary.set(word, true);
    });
}
```

We simply get the words from `globalState`, iterate through the array, and add them to the dictionary. Easy.

Okay, now we need to add words to the dictionary. While we're at this low-ish level, we might as well just implement this. I know I literally just said I like to do the opposite, but I'm feeling it, so there.

So we'll take a word, add it to the `globalState`, and in _this_ case we want to immediately add it to the dictionary. This way the user doesn't need to restart the plugin to see the changes.

```typescript
function addWordToDictionary(word: string, context: vscode.ExtensionContext, dictionary: Trie<boolean | null>) {
    const addedWords: string[] = context.globalState.get('addedWords', []);

    if (!addedWords.includes(word)) {
        addedWords.push(word);
        context.globalState.update('addedWords', addedWords);
        dictionary.set(word, true);
    }
}
```

I just do a little extra checking to make sure it's not already in the list. 

Okay, now we need to actually enable the user to do this in the editor. For this, we're going to update our `SpellingCodeActionProvider`. In our `provideCodeActions` function, for a given word we iterate through our suggestions and add a `fix` to an array of `fixes` that the user will see in the "Quick Fix" menu. All we need to do here is add a new set of fixes that execute a `command` (remember the thing we added to the `package.json` file?) that adds a word to the dictionary.

```typescript
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

        return fixes;
    }
```

Here's our new `provideCodeActions` function. Now we need to add this command to our `package.json` file.

```json
"contributes": {
    "commands": [
      {
        "command": "extension.checkSpelling",
        "title": "Spell Check"
      },
      {
        "command": "extension.correctSpelling",
        "title": "Correct Spelling",
        "category": "Spelling"
      },
      {
        "command": "extension.addWordToDictionary",
        "title": "Add Word to Dictionary",
        "category": "Spelling"
      }
    ],
    // ... everything else ...
```

And now our last step is to register the command in our `activate` function:

```typescript
    context.subscriptions.push(vscode.commands.registerCommand('extension.addWordToDictionary', (word) => {
        addWordToDictionary(word, context, dictionary);
    }));
```

And we're done! We now have a spell checker that can:

1. Identify misspelled words based on a dictionary of words
2. Suggest corrections for misspelled words
3. Add user-defined words to the dictionary
4. Ignore urls and code snippets/blocks

# Brief retro

Our plan this time went pretty well. We stuck to what we needed to do and didn't run into any major roadblocks.

# Final thoughts

This was a pretty fun project. I'm mostly pleased that I have a simple spellchecker in my code editor now. I may add some features here and there as I use it. But for now, I can't complain.

If you're interested, you can check out the repo here. Feel free to contribute, I'll probably approve your PR.
This spellchecker is also available on the extensions marketplace thing. You can find it by searching for LCSpellcheck.

# Bonus

So we're not _quite_ done with this yet. We still have some bugs to work out. One interesting one is this: when you add a word to the dictionary, it doesn't update the diagnostics. We have to do three things here:
1. Add `vscode.commands.executeCommand('extension.checkSpelling');` to our add word subscription.
2. Add consistent casing to our word checking (we have an issue where we're missing some `toLowerCase()`
3. Fix cache updating/invalidation

Another thing we may want to add is an "ignore" option, where we don't want to indicate a misspelled word, but we don't want it to add to the autocorrect dictionary. This is much the same as adding a word, just with its own trie - at least that's my implementation.

The cache invalidation problem is pretty interesting. Before we get into the nitty gritty, let's actually do some performance analysis to see if a cache is necessary or it's just a novel way to eat up memory.

## Brief performance analysis

I'm basically going to do a quick comparison and look at baseline memory, memory with the cache, and memory without the cache. I'm using it on this very post as I write it. For each of these "tests" there will be two vscode windows open. Note that when testing the extension there _also_ be the debugger running in the background.

- Baseline memory without the extension: 2.12 GB
- Memory with the extension: 2.27 GB
- Memory with the extension and cache: 2.42 GB

So, the cache literally doubles the memory in use. But does it make things more performant?

I'm going to write a script that will run the spellchecker on this post 100 times and time it. I'll do this with and without the cache.

```typescript
