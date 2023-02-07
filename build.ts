import {expandGlobSync, emptyDirSync, ensureDirSync} from 'std/fs/mod.ts'
import {dirname, basename} from 'std/path/mod.ts'
import {existsSync} from 'std/fs/mod.ts'
import postcss from 'postcss'
import nested from 'postcss-nested'
import autoprefixer from 'autoprefixer'
import stripIndent from 'strip-indent'
import functions from 'daisyui/src/colors/functions'
import {replacePrefix, replaceSlash, writeIndex} from './utils.ts'

const processor = postcss([nested, autoprefixer])

const root = 'daisyui/src'
const stripRoot = (path: string) => path.replace(`${Deno.cwd()}/${root}/`, '')

// Utilities should go last
const dirs = ['base', 'components', 'utilities']
const [baseDir, ...styleDirs] = dirs

/* Root index */
if (existsSync('./index.css')) {
	Deno.removeSync('./index.css')
}

for (const dir of dirs) {
	emptyDirSync(dir)
	writeIndex('.', `${dir}/index.css`, dir !== dirs[0])
}

/* `base` */
for (const {path} of expandGlobSync(`${root}/${baseDir}/*.css`)) {
	const dest = stripRoot(path)
	const css = replaceSlash(replacePrefix(Deno.readTextFileSync(path)))

	console.log('Writing', dest)
	Deno.writeTextFileSync(dest, css)
	writeIndex(baseDir, basename(dest))
}

/* `components` & `utilities` */
for (const {path} of expandGlobSync(
	`${root}/{${styleDirs.join(',')}}/**/*.css`,
)) {
	const dest = stripRoot(path)
	const destDir = dirname(dest)
	ensureDirSync(destDir)

	const rawCss = replaceSlash(replacePrefix(Deno.readTextFileSync(path)))
	const {css} = processor.process(rawCss)

	console.log('Writing', dest)
	Deno.writeTextFileSync(dest, css)
	writeIndex(destDir, basename(dest))
}

/* `components` & `utilities` index */
const order = new Map([
	['global', 0],
	['unstyled', 1],
	['styled', 2],
])

for (const dir of styleDirs) {
	const ordered: string[] = []
	const unordered: string[] = []

	for (const {name} of Deno.readDirSync(dir)) {
		if (order.has(name)) {
			ordered[order.get(name)!] = name
		} else {
			unordered.push(name)
		}
	}

	for (const name of [...ordered.filter(Boolean), ...unordered])
		writeIndex(dir, `${name}/index.css`)
}
