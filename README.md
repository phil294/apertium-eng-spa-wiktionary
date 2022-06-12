# Apertium + Wiktionary

Node script (`run.node.js`) to integrate a lot of Wiktionary eng-spa vocabulary automatically into a local Apertium instance, an offline rule-based translation tool that works pretty good but is missing a lot of common Spanish words.

This is also applicable to other language pairs of course

Apertium has 37,660 entries and Wiktionary en-es has 112,500 (at the time of writing), out of which this script adds 36,800 to Apertium, so it's an almost 100% increase.

Many words are skipped (multi words, multiple meanings) and the resulting entries are NOT grammar-safe. This module will add severe grammar errors to your instance regarding those previously missing words.

## Steps

Install development setup for Apertium

Get the Wiktionary dump from https://en.wiktionary.org/wiki/User%3aMatthias_Buchmeier and save it as `dict.ding`

Then do something along these lines:

```bash
git clone https://github.com/phil294/apertium-eng-spa-wiktionary
cd apertium-eng-spa-wiktionary
git clone --depth=1 https://github.com/apertium/apertium-eng-spa
yarn add fast-xml-parser
# get all relevant spanish words from dict.ding into file
node generate-spa-words.node.js
cd apertium-eng-spa
cp apertium-eng-spa.eng.metadix 'apertium-eng-spa.eng copy.metadix'
cp apertium-eng-spa.spa.dix 'apertium-eng-spa.spa copy.dix'
cp apertium-eng-spa.eng-spa.dix 'apertium-eng-spa.eng-spa copy.dix'
# normal setup for development
./autogen.sh
make
# determine words that aren't known to the instance yet. this assumes you haven't altered the existing dixes yet
cat ../dict-spa-words.txt | apertium -d . spa-eng | grep -- '*' | cut -c 2- > ../dict-spa-words-unknown.txt
cd ..
# this applies all new words to the dixes (takes base from the copies made above)
node run.node.js
cd apertium-eng-spa
# regenerate with new changes
make
# done

# test case:
# Should print "Artitects bleeded" which is wrong grammar but two new words
echo 'alarifes sangraban' | apertium -d . spa-eng
```