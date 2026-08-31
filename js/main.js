// Hero slideshow.
// The CSS owns the crossfade (.slide has a transition on opacity);
// this file only decides which slide currently has .is-active.

const hero = document.querySelector('.hero');
const slides = hero ? hero.querySelectorAll('.slide') : [];

const INTERVAL = 3500; // ms between slides

// Start from whichever slide the HTML marked active, falling back to the first.
let current = Math.max(0, [...slides].findIndex(s => s.classList.contains('is-active')));
let timer = null;

function show(index) {
    slides[current].classList.remove('is-active');
    current = index;
    slides[current].classList.add('is-active');
}

function next() {
    // Modulo wraps back to 0 once we run off the end.
    show((current + 1) % slides.length);
}

function start() {
    stop(); // never stack two timers
    timer = setInterval(next, INTERVAL);
}

function stop() {
    clearInterval(timer);
}

// Nothing to rotate through with one slide (or none).
if (slides.length > 1) {
    slides[current].classList.add('is-active');

    // Honour the same OS setting the CSS checks.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (!reduceMotion.matches) {
        start();

        // Pause while the visitor is looking at a particular slide.
        hero.addEventListener('mouseenter', stop);
        hero.addEventListener('mouseleave', start);

        // And while the tab is in the background.
        document.addEventListener('visibilitychange', () => {
            document.hidden ? stop() : start();
        });
    }
}
