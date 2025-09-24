
const language = 'php'

window.require = { paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs' } }
window.MonacoEnvironment = {
	getWorkerUrl: () =>
		`data:text/javascript;charset=utf-8,${encodeURIComponent(`
	  self.MonacoEnvironment = { baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/' }
	  importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/base/worker/workerMain.js')
	`)}`
}

const loaderScript = document.createElement('script')
loaderScript.src = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs/loader.js'
loaderScript.onload = () => {
	initMonaco()
}
document.head.appendChild(loaderScript)


// Run code via Piston, show compile + run output
const runCode = async ({ language, code, version }) => {
	const filename = 'index.php'
	const content = code

	const payload = {
		language: 'php',
		version: version || '*',
		files: [{ name: filename, content }]
	}

	try {
		const urlEx = 'https://emkc.org/api/v2/piston/execute'
		const urlInt = '/piston/execute'
		const res = await fetch(urlInt, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		})
		const data = await res.json()

		console.log('Piston response:', data)

		const compileOut = `${data.compile?.stdout || ''}${data.compile?.stderr || ''}`.trim()
		const runOut = `${data.run?.stdout || ''}${data.run?.stderr || ''}`.trim()

		// Output selection logic
		const outputTypeSelect = document.getElementById('output-type')
		let outputType = outputTypeSelect?.value || 'instructions'
		let outputText = ''
		if (outputType === 'build') {
			outputText = compileOut || '(no build output)'
		} else if (outputType === 'program') {
			outputText = runOut || '(no program output)'
		} else {
			outputText = window.INSTRUCTIONS_TEXT || 'No instructions provided.'
		}
		document.querySelector('#output').textContent = outputText
	} catch (err) {
		document.querySelector('#output').textContent = 'Error: ' + err
	}
}

// Initialize Monaco and wire UI
const initMonaco = () => {
	require(['vs/editor/editor.main'], () => {
		const runButton = document.querySelector('#run')
		const resetButton = document.querySelector('#reset')
		const submitButton = document.querySelector('#submit')
		const editorDiv = document.querySelector('#editor')

		// Keyboard shortcuts: Ctrl+S to save, Ctrl+R to run
		document.addEventListener('keydown', e => {
			if (e.ctrlKey && e.key.toLowerCase() === 's') {
				e.preventDefault();
				localStorage.setItem('editor.code', editor.getValue());
			}
			if (e.ctrlKey && e.key.toLowerCase() === 'r') {
				e.preventDefault();
				runButton.click();
			}
		});

		// Run button loading animation logic (show/hide spinner/play icon)
		const setRunButtonLoading = isLoading => {
			const runButtonElement = document.getElementById('run')
			if (!runButtonElement) return
			const playIconSpan = runButtonElement.querySelector('.play-icon')
			const spinnerSpan = runButtonElement.querySelector('.spinner')
			if (isLoading) {
				runButtonElement.disabled = true
				runButtonElement.classList.add('loading')
				if (playIconSpan) playIconSpan.style.display = 'none'
				if (spinnerSpan) spinnerSpan.style.display = 'inline-block'
			} else {
				runButtonElement.disabled = false
				runButtonElement.classList.remove('loading')
				if (spinnerSpan) spinnerSpan.style.display = 'none'
				if (playIconSpan) playIconSpan.style.display = 'inline-block'
			}
		}
		const defaultPhp = `<?php\n// Default PHP code\necho 'Hello, world!';\n?>`

		// Load user code from localStorage if available
		let initialCode = localStorage.getItem('editor.code')
		if (!initialCode) {
			initialCode = language === 'php' ? defaultPhp : '\n\n\n'
		}

		const editor = monaco.editor.create(editorDiv, {
			value: initialCode,
			language: 'php',
			theme: 'vs-dark',
			automaticLayout: true,
			minimap: { enabled: false },
			wordWrap: 'on',
			scrollBeyondLastLine: false,
			fontSize: 16
		})

		requestAnimationFrame(() => editor.layout())

		editorDiv.addEventListener('mousedown', () => editor.focus())

		// Instructions text (customize as needed)
		const instructionsDiv = document.getElementById('instructions')

		const outputTypeSelect = document.getElementById('output-type')
		let lastRunData = null
		const runCodeWithStore = async (args) => {
			const filename = 'index.php'
			const content = args.code
			const payload = {
				language: 'php',
				version: args.version || '*',
				files: [{ name: filename, content }]
			}
			try {
				//const urlInt = '/piston/execute'
				const urlEx = 'https://emkc.org/api/v2/piston/execute'
				const response = await fetch(urlEx, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(payload)
				})
				const data = await response.json()
				lastRunData = data
				const compileOutput = `${data.compile?.stdout || ''}${data.compile?.stderr || ''}`.trim()
				const runOutput = `${data.run?.stdout || ''}${data.run?.stderr || ''}`.trim()
				let outputType = outputTypeSelect?.value || 'instructions'
				let outputText = ''
				if (outputType === 'build') {
					outputText = compileOutput || '(no build output)'
				} else if (outputType === 'program') {
					outputText = runOutput || '(no program output)'
				}
				// Show output, hide instructions
				const outputDiv = document.getElementById('output')
				if (outputDiv) outputDiv.style.display = 'block'
				if (instructionsDiv) instructionsDiv.style.display = 'none'
				if (outputDiv) outputDiv.textContent = outputText
			} catch (err) {
				const outputDiv = document.getElementById('output')
				if (outputDiv) outputDiv.style.display = 'block'
				if (instructionsDiv) instructionsDiv.style.display = 'none'
				if (outputDiv) outputDiv.textContent = 'Error: ' + err
			}
		}
		// Override handleRun to use runCodeWithStore and switch output to program
		const handleRunWithStore = async () => {
			localStorage.setItem('editor.code', editor.getValue());
			if (outputTypeSelect) outputTypeSelect.value = 'program';
			const outputDiv = document.getElementById('output');
			if (outputDiv) {
				outputDiv.style.display = 'block';
				outputDiv.textContent = '';
			}
			if (instructionsDiv) instructionsDiv.style.display = 'none';
			setRunButtonLoading(true);
			try {
				await runCodeWithStore({ language, code: editor.getValue() });
			} finally {
				setRunButtonLoading(false);
			}
		}
		runButton.addEventListener('click', handleRunWithStore)
		// Initial instructions display
		const outputDiv = document.getElementById('output')
		if (outputDiv) outputDiv.style.display = 'none'
		if (instructionsDiv) instructionsDiv.style.display = 'block'
		if (outputTypeSelect) {
			outputTypeSelect.addEventListener('change', () => {
				if (outputTypeSelect.value === 'instructions') {
					if (outputDiv) outputDiv.style.display = 'none'
					if (instructionsDiv) instructionsDiv.style.display = 'block'
				} else {
					if (outputDiv) outputDiv.style.display = 'block'
					if (instructionsDiv) instructionsDiv.style.display = 'none'
					let outputText = ''
					if (outputTypeSelect.value === 'build') {
						if (lastRunData) {
							const compileOutput = `${lastRunData.compile?.stdout || ''}${lastRunData.compile?.stderr || ''}`.trim()
							outputText = compileOutput || '(no build output)'
						} else {
							outputText = '(no build output)'
						}
					} else if (outputTypeSelect.value === 'program') {
						if (lastRunData) {
							const runOutput = `${lastRunData.run?.stdout || ''}${lastRunData.run?.stderr || ''}`.trim()
							outputText = runOutput || '(no program output)'
						} else {
							outputText = '(no program output)'
						}
					}
					if (outputDiv) outputDiv.textContent = outputText
				}
			})
		}

		// Reset button logic
		resetButton.addEventListener('click', () => {
			if (confirm('Are you sure you want to reset the code? You will lose all progress.')) {
				editor.setValue(defaultPhp)
				localStorage.setItem('editor.code', defaultPhp)
				document.getElementById('output').textContent = ''
			}
		})

		// Submit button logic
		submitButton.addEventListener('click', () => {
			if (confirm('Are you sure you want to submit your code for evaluation?')) {
				const code = editor.getValue()
				localStorage.setItem('editor.code', code)
				// Submit the code for evaluation
				submitCode(code)
			}
		})

		editor.focus()
	}, error => {
		console.error('Monaco AMD load error:', error)
		const outputDiv = document.getElementById('output')
		if (outputDiv) outputDiv.textContent = 'Failed to load editor. Check network/CSP. Details in console.'
	})
}
