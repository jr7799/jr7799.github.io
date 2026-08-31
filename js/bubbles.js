// Background bubbles.
//
// Every bubble is always drifting: it rises slowly, sways side to side,
// and wraps around to the bottom once it leaves the top of the screen.
// The pointer is something to be avoided rather than something that
// carries them: getting close accelerates a bubble away, drag bleeds that
// speed off, and it resumes drifting from wherever it escaped to. Nothing
// is tethered to the cursor, so nothing springs back when it leaves.

const field = document.querySelector('.bubbles');

// ---- Tuning ----------------------------------------------------------
const COUNT = 26;
const MIN_SIZE = 26;    // px
const MAX_SIZE = 130;   // px

const RISE_MIN = 6;     // px per second, smallest bubble
const RISE_MAX = 22;    // px per second, largest bubble
const WANDER = 7;       // px per second of sideways travel

const SWAY_MIN = 10;    // px, side-to-side wobble on top of the rise
const SWAY_MAX = 32;

const MOUSE_RADIUS = 170;   // how close the pointer must get to matter
const FLEE = 900;   // px/s² of push, at the very centre of that radius
const MAX_FLEE = 220;   // px/s — no bubble ever swims faster than this
const DRAG = 2.4;   // per second: how quickly the escape bleeds off
// ----------------------------------------------------------------------

const rand = (min, max) => min + Math.random() * (max - min);

const bubbles = [];

let vw = window.innerWidth;
let vh = window.innerHeight;

let pointerX = -9999;
let pointerY = -9999;

let last = 0;

function build() {
    for (let i = 0; i < COUNT; i++) {
        const el = document.createElement('span');
        el.className = 'bubble';

        const size = rand(MIN_SIZE, MAX_SIZE);
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;

        // 0 = smallest, 1 = largest. Drives opacity and rise speed.
        const depth = (size - MIN_SIZE) / (MAX_SIZE - MIN_SIZE);
        el.style.opacity = (0.18 + depth * 0.42).toFixed(2);

        field.appendChild(el);

        bubbles.push({
            el,
            size,
            // Start scattered across the whole viewport.
            x: rand(-size, vw),
            y: rand(-size, vh),
            // Bigger bubbles are more buoyant, so they rise faster.
            rise: RISE_MIN + depth * (RISE_MAX - RISE_MIN),
            wander: rand(-WANDER, WANDER),
            // Sway: amplitude, speed and phase all differ per bubble.
            sway: rand(SWAY_MIN, SWAY_MAX),
            swaySpeed: rand(0.05, 0.14),
            swayPhase: rand(0, Math.PI * 2),
            // Escape velocity, in px/s. Zero unless it's fleeing.
            vx: 0,
            vy: 0,
        });
    }
}

// Keep bubbles proportionally placed when the window changes size.
function onResize() {
    const nw = window.innerWidth;
    const nh = window.innerHeight;

    for (const b of bubbles) {
        b.x *= nw / vw;
        b.y *= nh / vh;
    }

    vw = nw;
    vh = nh;
}

function frame(now) {
    // Seconds since the last frame, clamped so a backgrounded tab
    // doesn't teleport everything on return.
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0.016;
    last = now;

    const t = now / 1000;

    for (const b of bubbles) {
        // --- constant drift ---
        b.y -= b.rise * dt;       // negative Y is up
        b.x += b.wander * dt;

        // Wrap: off the top, back on at the bottom in a new column.
        if (b.y + b.size < 0) {
            b.y = vh + b.size;
            b.x = rand(-b.size, vw);
        }

        // Wrap sideways too, for the ones that wander far enough.
        if (b.x + b.size < 0) b.x = vw;
        if (b.x > vw) b.x = -b.size;

        // --- sway on top of the drift ---
        const swayX = Math.sin(t * b.swaySpeed * Math.PI * 2 + b.swayPhase) * b.sway;

        // --- avoidance ---
        const cx = b.x + swayX + b.size / 2;
        const cy = b.y + b.size / 2;

        const dx = cx - pointerX;
        const dy = cy - pointerY;
        const dist = Math.hypot(dx, dy) || 1;

        if (dist < MOUSE_RADIUS) {
            // Squared falloff: barely a nudge at the edge of the radius,
            // urgent once the pointer is right on top of the bubble.
            const falloff = (1 - dist / MOUSE_RADIUS) ** 2;

            b.vx += (dx / dist) * FLEE * falloff * dt;
            b.vy += (dy / dist) * FLEE * falloff * dt;

            const speed = Math.hypot(b.vx, b.vy);
            if (speed > MAX_FLEE) {
                b.vx = (b.vx / speed) * MAX_FLEE;
                b.vy = (b.vy / speed) * MAX_FLEE;
            }
        }

        // Water resistance. The escape decays to nothing and the bubble
        // carries on drifting from wherever it got to — the position is
        // never owned by the pointer, so there's nothing to spring back to.
        const drag = Math.exp(-DRAG * dt);
        b.vx *= drag;
        b.vy *= drag;

        b.x += b.vx * dt;
        b.y += b.vy * dt;

        b.el.style.transform = `translate3d(${b.x + swayX}px, ${b.y}px, 0)`;
    }

    requestAnimationFrame(frame);
}

if (field) {
    build();

    window.addEventListener('resize', onResize);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (reduceMotion.matches) {
        // Place them and leave them be.
        for (const b of bubbles) {
            b.el.style.transform = `translate3d(${b.x}px, ${b.y}px, 0)`;
        }
    } else {
        window.addEventListener('pointermove', (e) => {
            pointerX = e.clientX;
            pointerY = e.clientY;
        }, { passive: true });

        document.addEventListener('pointerleave', () => {
            pointerX = -9999;
            pointerY = -9999;
        });

        requestAnimationFrame(frame);
    }
}
