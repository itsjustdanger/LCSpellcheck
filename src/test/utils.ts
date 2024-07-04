import { Trie } from 'ternary-search-trie';

function generateTestDict(): Trie<boolean | null> {
    const dictionary: Trie<boolean | null> = new Trie();
    dictionary.set('this', true);
    dictionary.set('is', true);
    dictionary.set('an', true);
    dictionary.set('example', true);
    dictionary.set('text', true);
    dictionary.set('with', true);
    dictionary.set('some', true);
    dictionary.set('correct', true);
    dictionary.set('words', true);

    return dictionary;
}

export { generateTestDict };