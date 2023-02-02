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
	let eng_words_saved = new Set(eng[1].dictionary[3].section.map(e => e[":@"]?.["@_lm"]))

	let dict = (await promisify(fs.readFile)('./dict.ding', 'utf-8')).split('\n')
	let unknown_words = new Set((await promisify(fs.readFile)('./dict-spa-words-unknown.txt', 'utf-8')).split('\n'))
	let last_word_spa = ''
	let translated = 0
	// todo allow multiple words, both ways
	for(let line of dict) {
		if(line.startsWith('#'))
			continue
		let s = line.split(' :: ')
		let [ word_spa, info ] = s[0].split(' ').filter(t=>!t.includes('[')).map(t=>t.trim())
		if(!info?.includes('{'))
			continue
		let word_eng = s[1].split(/[,;] /)[0].trim().replace(/^(to )?([^(]+?)(\.? \(.+)?$/, '$2')
		if(!word_eng.match(/^[a-zA-Z]+$/))
			continue
		if(word_spa === last_word_spa)
			continue
		last_word_spa = word_spa

		if(!unknown_words.has(word_spa))
			continue

		function add_translation(spa_stem, eng_par, spa_par, eng_s, spa_s) {
			// console.log('########################################', word_eng, word_spa)
			translated++
			// we know the spa word doesn't exist yet
			// <e lm="word_spa"><i>spa_stem</i><par n="spa_par"/></e>	
			spa[1].dictionary[3].section.push({
				e: [
					{ i: [ { "#text": spa_stem } ] },
					{ par: [], ":@": { "@_n": spa_par } },
				],
				":@": { "@_lm": word_spa },
			})
			let eng_existed = true
			// the eng one does often already exist
			if(!eng_words_saved.has(word_eng)) {
				eng_existed = false
				// <e lm="word_eng"><i>word_eng</i><par n="eng_par"/></e>
				eng[1].dictionary[3].section.push({
					e: [
						{ i: [ { "#text": word_eng } ] },
						{ par: [], ":@": { "@_n": eng_par } },
					],
					":@": { "@_lm": word_eng },
				})
				eng_words_saved.add(word_eng)
			}
			// always necessary to add
			// <e r="RL"><p><l>word_eng<s n="eng_s"/></l><r>word_spa<s n="spa_s"/><s n="spa_s"/></r></p></e>
			eng_spa[1].dictionary[3].section.push({
				e: [
					{ p: [
						{ l: [
							{ "#text": word_eng },
							...eng_s.map(n => 
								({ s: [], ":@": { "@_n": n } })),
						] },
						{ r: [
							{ "#text": word_spa },
							...(spa_s || eng_s).map(n => 
								({ s: [], ":@": { "@_n": n } })),
						] },
					] },
				],
				// RL to not overwrite an existing eng meaning as our word is very likely less correct/common
				":@": eng_existed ? { "@_r": "RL" } : {},
			})
		}

		let translated_before = translated
		switch (info) {
			case '{v}':
			case '{vi}':
			case '{vt}':
			case '{vtr}':
				if(word_spa.endsWith('ar'))
					// eng accept_vblex is a standard verb with -s, -ed, -ing. Will be ugly for irregular verbs etc.
					// spa abandonar_vblex an `ar` conjugation, but there are many more, e.g. aleg/ar__vblex
					// Similar logic for all other matches below
					add_translation(word_spa.slice(0, -2), "accept__vblex", "abandon/ar__vblex", ["vblex"])
				else if(word_spa.endsWith('ir'))
					add_translation(word_spa.slice(0, -2), "accept__vblex", "abat/ir__vblex", ["vblex"])
				else if(word_spa.endsWith('er'))
					add_translation(word_spa.slice(0, -2), "accept__vblex", "vend/er__vblex", ["vblex"])
				else if(word_spa.endsWith('se'))
					1
				break
			case '{f}':
			case '{m}':
			case '{mf}':
				if(word_spa.endsWith('a'))
					add_translation(word_spa, "house__n", "abeja__n", ["n"], ["n", "f"])
				else if(word_spa.endsWith('o'))
					add_translation(word_spa, "house__n", "abismo__n", ["n"], ["n", "m"])
				else if(word_spa.endsWith('nte'))
					add_translation(word_spa, "house__n", "accionista__n", ["n"], ["n", "mf"])
				else if(word_spa.endsWith('ión'))
					add_translation(word_spa.slice(0, -2), "house__n", "acci/ón__n", ["n"], ["n", "f"])
				else if(word_spa.endsWith('or'))
					add_translation(word_spa, "house__n", "señor__n", ["n"], ["n", "m"])
				break
			case '{adj}':
				if(word_spa.endsWith('o'))
					add_translation(word_spa.slice(0, -1), "expensive__adj", "absolut/o__adj", ["adj"])
				else if(word_spa.endsWith('e'))
					add_translation(word_spa, "expensive__adj", "abundante__adj", ["adj"])
				else if(word_spa.endsWith('al'))
					add_translation(word_spa, "expensive__adj", "abdominal__adj", ["adj"])
				else if(word_spa.endsWith('or'))
					add_translation(word_spa, "expensive__adj", "abrumador__adj", ["adj"])
				break
			case '{adv}':
				add_translation(word_spa, "maybe__adv", "ahora__adv", ["adv"])
				break
			case '{prop}':
				break
		}
		if(translated_before === translated)
			// Horrific fallback
			add_translation(word_spa, "house__n", "abismo__n", ["n"], ["n", "m"])
	}
	
	console.log(`${translated} translations added out of ${dict.length} total. Expected from unknown-words.txt: ${unknown_words.size}`)

	await promisify(fs.writeFile)('apertium-eng-spa/apertium-eng-spa.eng.metadix', builder.build(eng), 'utf-8')
	await promisify(fs.writeFile)('apertium-eng-spa/apertium-eng-spa.spa.dix', builder.build(spa), 'utf-8')
	await promisify(fs.writeFile)('apertium-eng-spa/apertium-eng-spa.eng-spa.dix', builder.build(eng_spa), 'utf-8')
})()