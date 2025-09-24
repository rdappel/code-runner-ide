
const root = document.documentElement
const main = document.querySelector('main')

const setWidth = px => {
    root.style.setProperty('--panel-w', `${px}px`)
}

const onPointerMove = e => {
	const x = e.clientX ?? (e.touches && e.touches[0].clientX)
	const { right } = main.getBoundingClientRect()
	setWidth(right - x)
}

const onPointerUp = e => {
	document.removeEventListener('pointermove', onPointerMove)
	document.removeEventListener('pointerup', onPointerUp)
}

const handle = document.querySelector('.resize-handle')
handle.addEventListener('pointerdown', e => {
	document.addEventListener('pointermove', onPointerMove)
	document.addEventListener('pointerup', onPointerUp)
})