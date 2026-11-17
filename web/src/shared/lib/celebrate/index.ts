// A short burst of confetti from an element, for moments worth marking such as a request sent or approved.
// It only decorates: callers commit state and announce the result themselves, and reduced motion skips it.

// The theme accent leads; a few bright hues keep the burst festive in every palette and mode. Each is the theme's own
// hue: the work item marks' (app/theme), or the old theme's icon hue while its stylesheet is still loaded.
const festive = [['yellow', 'medium'], ['red', 'urgent'], ['green', 'done'], ['blue', 'low'], ['purple', 'high']]
  .map(([icon, mark]) => `var(--color-icon-${icon}, var(--mark-${mark}))`);

export type CelebrateOptions = {
  /** Pieces in the burst. */
  count?: number;
  /** Emoji mixed in among the paper pieces. */
  glyphs?: readonly string[];
};

const reducedMotion = () => typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Returns a function that stops the burst early and removes it. */
export function celebrate(origin: Element | null, { count = 44, glyphs = [] }: CelebrateOptions = {}): () => void {
  if (!origin || reducedMotion() || typeof HTMLElement.prototype.animate !== 'function') return () => {};
  const rect = origin.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const root = getComputedStyle(document.documentElement);
  const accent = (root.getPropertyValue('--illustration-accent') || root.getPropertyValue('--color-accent')).trim();
  const colors = accent ? [accent, ...festive] : festive;

  // A modal dialog sits in the top layer; a manual popover opened after it is drawn above it.
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  Object.assign(layer.style, {
    position: 'fixed', inset: '0', width: '100vw', height: '100dvh', margin: '0', padding: '0', border: '0',
    background: 'transparent', overflow: 'hidden', pointerEvents: 'none', zIndex: '2147483647',
  });
  document.body.append(layer);
  if (typeof layer.showPopover === 'function') {
    layer.popover = 'manual';
    layer.showPopover();
  }

  const animations: Animation[] = [];
  for (let index = 0; index < count; index++) {
    const piece = document.createElement('span');
    const glyph = glyphs.length > 0 && index % 6 === 0 ? glyphs[Math.floor(index / 6) % glyphs.length] : undefined;
    const size = glyph ? 20 : 6 + Math.random() * 6;
    Object.assign(piece.style, {
      position: 'absolute', left: `${x}px`, top: `${y}px`, width: `${size}px`, height: `${glyph ? size : size * 0.45}px`,
      marginLeft: `${-size / 2}px`, marginTop: `${-size / 2}px`, fontSize: `${size}px`, lineHeight: '1',
      background: glyph ? 'transparent' : colors[index % colors.length],
      borderRadius: index % 3 === 0 ? '50%' : '2px',
    });
    if (glyph) piece.textContent = glyph;
    layer.append(piece);
    // Pieces leave upward in a fan, slow down, then fall and fade.
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
    const speed = 140 + Math.random() * 180;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;
    const spin = (Math.random() - 0.5) * 900;
    animations.push(piece.animate([
      { transform: 'translate(0, 0) rotate(0deg) scale(0.6)', opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) rotate(${spin / 2}deg) scale(1)`, opacity: 1, offset: 0.45, easing: 'ease-in' },
      { transform: `translate(${dx * 1.25}px, ${dy + 260}px) rotate(${spin}deg) scale(0.9)`, opacity: 0 },
    ], { duration: 1100 + Math.random() * 500, easing: 'cubic-bezier(0.15, 0.7, 0.3, 1)', fill: 'forwards' }));
  }

  let removed = false;
  const remove = () => {
    if (removed) return;
    removed = true;
    animations.forEach(animation => animation.cancel());
    layer.remove();
  };
  void Promise.allSettled(animations.map(animation => animation.finished)).then(remove);
  return remove;
}
