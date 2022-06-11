//@ts-check
const { promisify } = require('util')
const fs = require('fs')
const { XMLParser, XMLBuilder } = require("fast-xml-parser");

(async () => {
	const parser = new XMLParser({ allowBooleanAttributes: false, ignoreAttributes: false, parseAttributeValue: false, preserveOrder: true })
	const builder = new XMLBuilder({ format: false, ignoreAttributes: false, suppressBooleanAttributes: false, preserveOrder: true, suppressUnpairedNode: false, unpairedTags: ['sdef', 's', 'b', 'par', 'j', 'a'] });

	let eng = parser.parse(await promisify(fs.readFile)('apertium-eng-spa/apertium-eng-spa.eng copy.metadix'))
	let spa = parser.parse(await promisify(fs.readFile)('apertium-eng-spa/apertium-eng-spa.spa copy.dix'))
	let eng_spa = parser.parse(await promisify(fs.readFile)('apertium-eng-spa/apertium-eng-spa.eng-spa copy.dix'))

	function add_translation(eng_lemma, spa_lemma, spa_stem, eng_par, spa_par, eng_spa_par) {
		console.log('########################################', eng_lemma, spa_lemma)
		// <e lm="eng_lemma"><i>eng_lemma</i><par n="eng_par"/></e>
		eng[1].dictionary[3].section.push({
			e: [
				{ i: [ { "#text": eng_lemma } ] },
				{ par: [], ":@": { "@_n": eng_par } },
			],
			":@": { "@_lm": eng_lemma },
		})
		// <e lm="spa_lemma"><i>spa_stem</i><par n="spa_par"/></e>	
		spa[1].dictionary[3].section.push({
			e: [
				{ i: [ { "#text": spa_stem } ] },
				{ par: [], ":@": { "@_n": spa_par } },
			],
			":@": { "@_lm": spa_lemma },
		})
		// <e r="RL"><p><l>eng_lemma<s n="eng_spa_par"/></l><r>spa_lemma<s n="eng_spa_par"/></r></p></e>
		eng_spa[1].dictionary[3].section.push({
			e: [
				{ p: [
					{ l: [
						{ "#text": eng_lemma },
						{ s: [], ":@": { "@_n": eng_spa_par } },
					] },
					{ r: [
						{ "#text": spa_lemma },
						{ s: [], ":@": { "@_n": eng_spa_par } },
					] },
				] },
			],
			// We only checked for the existence of the Spanish word, but the English one may
			// already exist, so make sure we're not overwriting an English meaning here:
			":@": { "@_r": "RL" },
		})
	}

	function spa_exists_translation(spa_lemma) {
		return spa[1].dictionary[3].section.some(e =>
			e[":@"]?.["@_lm"] === spa_lemma)
	}

	let dict = await promisify(fs.readFile)('./dict.ding', 'utf-8')
	let last_word_spa = ''
	// todo allow multiple words, both ways
	for(let line of dict.split('\n')) {
		// console.log(line)
		if(line.startsWith('#'))
			continue
		let s = line.split(' :: ')
		let [ word_spa, info ] = s[0].split(' ').filter(t=>!t.includes('[')).map(t=>t.trim())
		if(!info?.includes('{'))
			continue
		let word_eng = s[1].split(/[,;] /)[0].trim().replace(/^(to )([^(]+?)(\. \(.+)?$/, '$2')
		if(!word_eng.match(/^[a-zA-Z]+$/))
			continue
		if(word_spa === last_word_spa)
			continue
		last_word_spa = word_spa

		if(spa_exists_translation(word_spa))
			continue
	
		switch (info) {
			case '{v}':
			case '{vi}':
			case '{vt}':
				if(word_spa.endsWith('ar')) {
					// eng accept_vblex is a standard verb with -s, -ed, -ing. Will be ugly for irregular verbs etc.
					// spa abandonar_vblex an `ar` conjugation, but there are many more, e.g. aleg/ar__vblex
					add_translation(word_eng, word_spa, word_spa.slice(0, -2), "accept__vblex", "abandon/ar__vblex", "vblex")
				}
				break
			// default:
			// 	throw line
		}
	}
	
	await promisify(fs.writeFile)('apertium-eng-spa/apertium-eng-spa.eng.metadix', builder.build(eng), 'utf-8')
	await promisify(fs.writeFile)('apertium-eng-spa/apertium-eng-spa.spa.dix', builder.build(spa), 'utf-8')
	await promisify(fs.writeFile)('apertium-eng-spa/apertium-eng-spa.eng-spa.dix', builder.build(eng_spa), 'utf-8')
})()