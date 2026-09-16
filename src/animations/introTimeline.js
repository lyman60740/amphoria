import gsap from 'gsap'

// All intro timing lives here, including the draw-SVG-style 3D line reveal.
export const INTRO_TIMING = {
  scene: 0,
  header: 1.8,
  title: 2.2,
  captions: 2.9,
  orbit: 2.4,
  button: 3.6,
  orbitDuration: 5.5,
  lighting: {
    startAngleDegrees: -110,
    rotationDuration: 10.2,
    keyDelay: 0.15,
    keyDuration: 4.3,
    overheadDelay: 0.6,
    overheadDuration: 4.3,
    ambientDelay: 0.9,
    ambientDuration: 4.3,
    ease: 'power2.inOut',
  },
}

export function createIntroTimeline({ root, orbit, lighting }) {
  const select = gsap.utils.selector(root)
  const canvas = select('.hero__canvas')
  const header = select('.header')
  const rows = select('.title-row')
  const captions = select('.hero__aside')
  const button = select('.shop-now')
  const scrollLine = select('.scroll-line')
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  let timeline
  const context = gsap.context(() => {
    gsap.set(canvas, { autoAlpha: 1 })
    gsap.set([header, rows, captions, button, scrollLine].flat(), { autoAlpha: 0 })
    const light = INTRO_TIMING.lighting
    timeline = gsap.timeline({ paused: true, onComplete: lighting.finish, defaults: { ease: 'power2.out' } })
    timeline
      .addLabel('scene', INTRO_TIMING.scene)
      .fromTo(lighting.state, { angle: light.startAngleDegrees * Math.PI / 180 }, {
        angle: 0, duration: light.rotationDuration, ease: light.ease,
      }, 'scene')
      .fromTo(lighting.state, { key: 0 }, {
        key: 1, duration: light.keyDuration, ease: light.ease,
      }, INTRO_TIMING.scene + light.keyDelay)
      .fromTo(lighting.state, { overhead: 0 }, {
        overhead: 1, duration: light.overheadDuration, ease: light.ease,
      }, INTRO_TIMING.scene + light.overheadDelay)
      .fromTo(lighting.state, { ambient: 0 }, {
        ambient: 1, duration: light.ambientDuration, ease: light.ease,
      }, INTRO_TIMING.scene + light.ambientDelay)
      .addLabel('header', INTRO_TIMING.header)
      .fromTo(header, { autoAlpha: 0, y: -8 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 'header')
      .addLabel('title', INTRO_TIMING.title)
      .fromTo(rows, { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.12 }, 'title')
      .addLabel('captions', INTRO_TIMING.captions)
      .fromTo(captions, { autoAlpha: 0, y: 6 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 'captions')
      .addLabel('orbit', INTRO_TIMING.orbit)
      .fromTo(orbit.draw, { progress: 0 }, {
        progress: 1, duration: INTRO_TIMING.orbitDuration,
        ease: 'power4.inOut', onUpdate: orbit.updateDraw,
      }, 'orbit')
      .addLabel('button', INTRO_TIMING.button)
      .fromTo(button, { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 'button')
      .fromTo(scrollLine, { autoAlpha: 0, scaleY: 0, transformOrigin: 'bottom center' }, {
        autoAlpha: 1, scaleY: 1, duration: 0.9,
      }, 'button+=0.15')
  }, root)

  function finish() {
    timeline.progress(1).pause()
    lighting.finish()
    orbit.draw.progress = 1
    orbit.updateDraw()
  }
  function play() {
    if (reducedMotion.matches) finish()
    else {
      lighting.begin(INTRO_TIMING.lighting.startAngleDegrees * Math.PI / 180)
      orbit.draw.progress = 0
      orbit.updateDraw()
      timeline.restart()
    }
  }
  function preferenceChanged() { if (reducedMotion.matches) finish() }
  reducedMotion.addEventListener('change', preferenceChanged)
  return {
    timeline, play, finish,
    dispose() {
      reducedMotion.removeEventListener('change', preferenceChanged)
      context.revert()
    },
  }
}
