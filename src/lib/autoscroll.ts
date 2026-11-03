/**
 * Middle-Click Autoscroll Engine for Linux / WebKitGTK
 * Provides smooth 2D autoscroll (vertical + horizontal) when middle-clicking any scrollable container.
 * Intercepts middle click to prevent Linux primary clipboard paste crashes.
 */

function findScrollableParent(target: HTMLElement | null): HTMLElement | Window {
  let el = target;
  while (el && el !== document.body && el !== document.documentElement) {
    const style = window.getComputedStyle(el);
    const overflowY = style.overflowY;
    const overflowX = style.overflowX;
    const isScrollableY = (overflowY === 'auto' || overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    const isScrollableX = (overflowX === 'auto' || overflowX === 'scroll') && el.scrollWidth > el.clientWidth;

    // Special check for textarea
    if (el instanceof HTMLTextAreaElement) {
      if (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth) {
        return el;
      }
    }

    if (isScrollableY || isScrollableX) {
      return el;
    }
    el = el.parentElement;
  }
  return window;
}

export function initMiddleClickAutoscroll(): () => void {
  let active = false;
  let originX = 0;
  let originY = 0;
  let currentX = 0;
  let currentY = 0;
  let scrollTarget: HTMLElement | Window | null = null;
  let animId: number | null = null;
  let anchorEl: HTMLDivElement | null = null;
  let mouseMovedFar = false;
  let downTime = 0;

  function createAnchor(x: number, y: number) {
    if (anchorEl) removeAnchor();
    anchorEl = document.createElement('div');
    anchorEl.className = 'autoscroll-anchor';
    anchorEl.style.left = `${x}px`;
    anchorEl.style.top = `${y}px`;
    anchorEl.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m12 3-3 3h6l-3-3z"/>
        <path d="m12 21-3-3h6l-3 3z"/>
        <path d="m3 12 3-3v6l-3-3z"/>
        <path d="m21 12-3-3v6l-3-3z"/>
        <circle cx="12" cy="12" r="2.5" fill="currentColor"/>
      </svg>
    `;
    document.body.appendChild(anchorEl);
  }

  function removeAnchor() {
    if (anchorEl && anchorEl.parentNode) {
      anchorEl.parentNode.removeChild(anchorEl);
    }
    anchorEl = null;
  }

  function scrollLoop() {
    if (!active || !scrollTarget) return;

    const dx = currentX - originX;
    const dy = currentY - originY;
    const deadzone = 8;

    let vx = 0;
    let vy = 0;

    if (Math.abs(dx) > deadzone) {
      const dist = Math.abs(dx) - deadzone;
      vx = Math.sign(dx) * Math.min(45, Math.pow(dist, 1.25) * 0.08);
    }

    if (Math.abs(dy) > deadzone) {
      const dist = Math.abs(dy) - deadzone;
      vy = Math.sign(dy) * Math.min(45, Math.pow(dist, 1.25) * 0.08);
    }

    if (vx !== 0 || vy !== 0) {
      if (scrollTarget instanceof Window) {
        window.scrollBy(vx, vy);
      } else {
        scrollTarget.scrollLeft += vx;
        scrollTarget.scrollTop += vy;
      }
    }

    animId = requestAnimationFrame(scrollLoop);
  }

  function stopAutoscroll() {
    active = false;
    if (animId !== null) {
      cancelAnimationFrame(animId);
      animId = null;
    }
    removeAnchor();
    scrollTarget = null;
    document.body.classList.remove('autoscrolling');
  }

  function onMouseDown(e: MouseEvent) {
    if (e.button === 1) {
      // Middle click
      e.preventDefault();
      e.stopPropagation();

      if (active) {
        stopAutoscroll();
        return;
      }

      const target = e.target as HTMLElement;
      scrollTarget = findScrollableParent(target);
      originX = e.clientX;
      originY = e.clientY;
      currentX = e.clientX;
      currentY = e.clientY;
      active = true;
      mouseMovedFar = false;
      downTime = Date.now();

      createAnchor(originX, originY);
      document.body.classList.add('autoscrolling');

      if (animId === null) {
        animId = requestAnimationFrame(scrollLoop);
      }
    } else if (active) {
      // Left or right click stops autoscroll
      stopAutoscroll();
    }
  }

  function onMouseMove(e: MouseEvent) {
    if (!active) return;
    currentX = e.clientX;
    currentY = e.clientY;
    if (Math.hypot(currentX - originX, currentY - originY) > 12) {
      mouseMovedFar = true;
    }
  }

  function onMouseUp(e: MouseEvent) {
    if (e.button === 1 && active) {
      e.preventDefault();
      // If user dragged more than 12px and released, stop autoscroll (drag-to-scroll style)
      // If they just tapped middle click in place, keep autoscroll active until next click
      if (mouseMovedFar || Date.now() - downTime > 350) {
        stopAutoscroll();
      }
    }
  }

  function onWheel() {
    if (active) {
      stopAutoscroll();
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    if (active && (e.key === 'Escape' || e.key === 'Tab')) {
      stopAutoscroll();
    }
  }

  function onAuxClick(e: MouseEvent) {
    if (e.button === 1) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // Intercept middle-click on window capture phase to completely suppress Linux primary paste
  window.addEventListener('mousedown', onMouseDown, { capture: true });
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('mouseup', onMouseUp, { capture: true });
  window.addEventListener('auxclick', onAuxClick, { capture: true });
  window.addEventListener('wheel', onWheel, { passive: true });
  window.addEventListener('keydown', onKeyDown, { capture: true });

  return () => {
    stopAutoscroll();
    window.removeEventListener('mousedown', onMouseDown, { capture: true });
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('mouseup', onMouseUp, { capture: true });
    window.removeEventListener('auxclick', onAuxClick, { capture: true });
    window.removeEventListener('wheel', onWheel);
    window.removeEventListener('keydown', onKeyDown, { capture: true });
  };
}
