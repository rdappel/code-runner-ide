// splitter.js
// Handles vertical resizing between editor and output panels
window.initSplitter = function(editor) {
    const splitter = document.getElementById('splitter')
    const editorPanel = document.querySelector('.editor-panel')
    const outputPanel = document.querySelector('.output-panel')
    let isDragging = false
    let startY = 0
    let startEditorHeight = 0
    let startOutputHeight = 0

    // Restore splitter position from localStorage
    const savedEditorHeight = localStorage.getItem('splitter.editorHeight')
    const savedOutputHeight = localStorage.getItem('splitter.outputHeight')
    if (savedEditorHeight && savedOutputHeight) {
        editorPanel.style.height = savedEditorHeight + 'px'
        outputPanel.style.height = savedOutputHeight + 'px'
    }

    // Use pointer events and requestAnimationFrame for smoother drag
    let dragFrame = null
    let lastEvent = null

    const onPointerMove = e => {
        lastEvent = e
        if (!dragFrame) {
            dragFrame = requestAnimationFrame(() => {
                if (!isDragging || !lastEvent) return
                const dy = lastEvent.clientY - startY
                let newEditorHeight = Math.max(50, startEditorHeight + dy)
                let newOutputHeight = Math.max(50, startOutputHeight - dy)
                const containerHeight = editorPanel.parentElement.offsetHeight
                if (newEditorHeight + newOutputHeight + splitter.offsetHeight > containerHeight) {
                    newEditorHeight = containerHeight - newOutputHeight - splitter.offsetHeight
                }
                editorPanel.style.height = newEditorHeight + 'px'
                outputPanel.style.height = newOutputHeight + 'px'
                if (editor && editor.layout) editor.layout()
                dragFrame = null
            })
        }
    }

    const onPointerUp = () => {
        if (isDragging) {
            isDragging = false
            document.body.style.cursor = ''
            document.removeEventListener('pointermove', onPointerMove)
            document.removeEventListener('pointerup', onPointerUp)
            dragFrame && cancelAnimationFrame(dragFrame)
            dragFrame = null
            lastEvent = null
            // Save panel heights to localStorage
            localStorage.setItem('splitter.editorHeight', editorPanel.offsetHeight)
            localStorage.setItem('splitter.outputHeight', outputPanel.offsetHeight)
        }
    }

    splitter.addEventListener('pointerdown', e => {
        isDragging = true
        startY = e.clientY
        startEditorHeight = editorPanel.offsetHeight
        startOutputHeight = outputPanel.offsetHeight
        document.body.style.cursor = 'row-resize'
        document.addEventListener('pointermove', onPointerMove)
        document.addEventListener('pointerup', onPointerUp)
    })
}
