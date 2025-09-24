
const language = 'csharp.net' // Change this to test different languages

window.require = { paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } }
window.MonacoEnvironment = {
	getWorkerUrl: () =>
		`data:text/javascript;charset=utf-8,${encodeURIComponent(`
      self.MonacoEnvironment = { baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/' }
      importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/base/worker/workerMain.js')
    `)}`
}

const loader = document.createElement('script')
loader.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js'
loader.onload = () => {
	// Load C# language extension after loader
	const csharpExt = document.createElement('script')
	csharpExt.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/basic-languages/csharp/csharp.js'
	csharpExt.onload = () => initMonaco()
	document.head.appendChild(csharpExt)
}
document.head.appendChild(loader)

// UI value -> Monaco language id (syntax highlighting)
const LANGUAGE_MAP = {
	javascript: 'javascript',
	python: 'python',
	'c++': 'cpp',
	'csharp.net': 'csharp',
	php: 'php'
}

// UI value -> Piston runtime id (execution)
const PISTON_LANG = {
	javascript: 'javascript',
	python: 'python',
	'c++': 'cpp',
	'csharp.net': 'csharp.net',
	php: 'php',
	html: 'html',
	css: 'css'
}

// Choose a filename Piston expects for each runtime
const filenameFor = lang => {
	switch (lang) {
		case 'python': return 'main.py'
		case 'javascript': return 'index.js'
		case 'cpp': return 'main.cpp'
		case 'csharp.net': return 'Program.cs'
		case 'php': return 'index.php'
		default: return 'main.txt'
	}
}

// Run code via Piston, show compile + run output
const runCode = async ({ language, code, version }) => {
	const pistonLang = PISTON_LANG[language] || language
	const filename = filenameFor(pistonLang)
	const content = code

	const payload = {
		language: pistonLang,
		version: version || '*',
		files: [{ name: filename, content }]
	}

	try {
		const urlEx = 'https://emkc.org/api/v2/piston/execute'
		const urlInt = '/piston/execute'
		const res = await fetch(urlEx, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		})
		const data = await res.json()

		console.log('Piston response:', data)

		const compileOut = `${data.compile?.stdout || ''}${data.compile?.stderr || ''}`.trim()
		const runOut = `${data.run?.stdout || ''}${data.run?.stderr || ''}`.trim()

		// If we see only scaffold noise but no run output, still show the logs so you know what's happening
		const combined = [compileOut, runOut].filter(Boolean).join('\n')
		document.getElementById('output').textContent = combined || '(no output)'
	} catch (err) {
		document.getElementById('output').textContent = 'Error: ' + err
	}
}

// Match #output colors to the actual Monaco theme at runtime
const syncOutputColors = editor => {
	const root = document.documentElement
	const node = editor.getDomNode()
	const bgEl = node.querySelector('.monaco-editor-background') || node
	const fgEl = node.querySelector('.view-lines') || node

	const bg = getComputedStyle(bgEl).backgroundColor
	const fg = getComputedStyle(fgEl).color

	root.style.setProperty('--monaco-bg', bg)
	root.style.setProperty('--monaco-fg', fg)
}

// Initialize Monaco and wire UI
const initMonaco = () => {
	require(['vs/editor/editor.main'], () => {
		const runBtn = document.getElementById('run')
		const resetBtn = document.getElementById('reset')
		const editorEl = document.getElementById('editor')

		console.log('Selected language:', language)

		const defaultPhp = `<?php\n// Default PHP code\necho 'Hello, world!';\n?>`
		const defaultCSharp = `using System;\n\nclass Program {\n    static void Main() {\n        // Default C# code\n        Console.WriteLine("Hello, world!");\n    }\n}\n`

		// Load user code from localStorage if available
		let initialCode = localStorage.getItem('editor.code')
		if (!initialCode) {
			initialCode = language === 'php' ? defaultPhp : language === 'csharp.net' ? defaultCSharp : '\n\n\n'
		}

		const editor = monaco.editor.create(editorEl, {
			value: initialCode,
			language: LANGUAGE_MAP[language],
			theme: 'vs-dark',
			automaticLayout: true,
			minimap: { enabled: false },
			wordWrap: 'on',
			scrollBeyondLastLine: false,
			fontSize: 20
		})

		requestAnimationFrame(() => {
			editor.layout()
			syncOutputColors(editor)
			// Enable panel transitions after initial layout
			document.querySelectorAll('.editor-panel, .output-panel').forEach(panel => {
				panel.style.transition = 'height 0.1s'
			})
		})

		editorEl.addEventListener('mousedown', () => editor.focus())

		// Auto-save code to localStorage when Run is clicked
		const handleRun = () => {
			localStorage.setItem('editor.code', editor.getValue())
			runCode({ language, code: editor.getValue() })
			// set ouptput to "Running..." immediately for better UX
			document.getElementById('output').textContent = 'Getting ready...'
		}

		runBtn.addEventListener('click', handleRun)

		// Reset button logic
		resetBtn.addEventListener('click', () => {
			if (confirm('Are you sure you want to reset the code? You will lose all progress.')) {
				editor.setValue(defaultPhp)
				localStorage.setItem('editor.code', defaultPhp)
				document.getElementById('output').textContent = ''
			}
		})

		// Splitter logic moved to splitter.js
		if (window.initSplitter) {
			window.initSplitter(editor)
		}

		editor.focus()
	}, err => {
		console.error('Monaco AMD load error:', err)
		const out = document.getElementById('output')
		if (out) out.textContent = 'Failed to load editor. Check network/CSP. Details in console.'
	})
}
