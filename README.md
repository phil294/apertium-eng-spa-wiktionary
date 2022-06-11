# Apertium + Wiktionary

Node script (`run.node.js`) to integrate a lot of Wiktionary eng-spa vocabulary automatically into a local Apertium instance, an offline rule-based translation tool that works pretty good but is missing a lot of common Spanish words.

This is also applicable to other language pairs of course

Wiktionary en-es has 112,500 entries, Apertium has 37,660 (at the time of writing).

## Steps

Install development setup for Apertium

Get the Wiktionary dump from https://en.wiktionary.org/wiki/User%3aMatthias_Buchmeier and save it as `dict.ding`

Then:

```bash
git clone https://github.com/phil294/apertium-eng-spa-wiktionary
cd apertium-eng-spa-wiktionary
git clone --depth=1 https://github.com/apertium/apertium-eng-spa
cd apertium-eng-spa
cp apertium-eng-spa.eng.metadix 'apertium-eng-spa.eng copy.metadix'
cp apertium-eng-spa.spa.dix 'apertium-eng-spa.spa copy.dix'
cp apertium-eng-spa.eng-spa.dix 'apertium-eng-spa.eng-spa copy.dix'
cd ..
yarn add fast-xml-parser
# the point of this repository
node run.node.js
cd apertium-eng-spa
./autogen.sh
make
# should now also understand many simple verbs and subjs and adjs from the wiki dump, albeit with possible grammar errors
echo '...spanish text' | apertium -d . spa-eng
```