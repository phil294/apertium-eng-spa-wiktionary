//@ts-check
const { promisify } = require('util')
const fs = require('fs');

(async () => {
	// (duplicate code taken from run.node.js)
	let dict = (await promisify(fs.readFile)('./dict.ding', 'utf-8')).split('\n')
	let last_word_spa = ''
	let lines = []
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

		lines.push(word_spa)
	}
	
	await promisify(fs.writeFile)('./dict-spa-words.txt', lines.join('\n'), 'utf-8')
})()