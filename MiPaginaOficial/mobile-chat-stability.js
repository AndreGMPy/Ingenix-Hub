(() => {
  'use strict';

  const MOBILE_QUERY = window.matchMedia('(max-width: 820px), (pointer: coarse)');
  const PANEL_SELECTORS = ['#nix-chat-panel', '.nix-chat-panel'];
  const INPUT_SELECTORS = [
    '#nix-chat-input',
    '.nix-chat-input',
    '#nix-chat-form input',
    '#nix-chat-form textarea',
    '.nix-chat-form input',
    '.nix-chat-form textarea'
  ];
  const MESSAGES_SELECTORS = ['#nix-chat-messages', '.nix-chat-messages'];
  const CLOSE_SELECTORS = [
    '#nix-chat-close',
    '.nix-chat-close',
    '[data-nix-close]',
    '[data-chat-close]',
    'button[aria-label*="cerrar" i]',
    'button[aria-label*="close" i]'
  ];

  let panel = null;
  let savedScrollY = 0;
  let locked = false;
  let rafId = 0;
  let backdrop = null;
  let fallbackClose = null;

  const firstMatch = (selectors, root = document) => {
    for (const selector of selectors) {
      const element = root.querySelector(selector);
      if (element) return element;
    }
    return null;
  };

  const panelIsVisible = element => {
    if (!element || !element.isConnected || element.hidden) return false;
    if (element.getAttribute('aria-hidden') === 'true') return false;

    const style = window.getComputedStyle(element);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      Number.parseFloat(style.opacity || '1') < 0.02
    ) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  };

  const ensureBackdrop = () => {
    if (backdrop?.isConnected) return backdrop;

    backdrop = document.createElement('div');
    backdrop.className = 'nix-mobile-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.addEventListener('click', closeChat);
    document.body.appendChild(backdrop);
    return backdrop;
  };

  const ensureFallbackClose = () => {
    if (!panel) return null;
    if (fallbackClose?.isConnected && fallbackClose.parentElement === panel) return fallbackClose;

    fallbackClose = document.createElement('button');
    fallbackClose.type = 'button';
    fallbackClose.className = 'nix-mobile-close-fallback';
    fallbackClose.setAttribute('aria-label', 'Cerrar chat');
    fallbackClose.textContent = '×';
    fallbackClose.addEventListener('click', closeChat);
    panel.appendChild(fallbackClose);
    return fallbackClose;
  };

  const closeChat = () => {
    if (!panel) panel = firstMatch(PANEL_SELECTORS);

    const nativeClose = panel ? firstMatch(CLOSE_SELECTORS, panel) : firstMatch(CLOSE_SELECTORS);

    if (nativeClose && nativeClose !== fallbackClose) {
      nativeClose.click();
    } else if (panel) {
      panel.setAttribute('aria-hidden', 'true');
      panel.hidden = true;
      panel.style.display = 'none';
    }

    unlockPage();
  };

  const updateVisualViewport = () => {
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      const viewport = window.visualViewport;
      const height = viewport ? viewport.height : window.innerHeight;
      const top = viewport ? viewport.offsetTop : 0;
      const keyboardOpen = height < window.innerHeight * 0.78;

      document.documentElement.style.setProperty('--nix-visual-height', `${Math.max(280, Math.round(height))}px`);
      document.documentElement.style.setProperty('--nix-visual-top', `${Math.max(0, Math.round(top))}px`);

      document.documentElement.classList.toggle('nix-keyboard-open', keyboardOpen);
      document.body.classList.toggle('nix-keyboard-open', keyboardOpen);
    });
  };

  const scrollConversationToBottom = () => {
    const messages = firstMatch(MESSAGES_SELECTORS);
    if (!messages) return;
    requestAnimationFrame(() => {
      messages.scrollTop = messages.scrollHeight;
    });
  };

  const lockPage = () => {
    if (locked || !MOBILE_QUERY.matches) return;

    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add('nix-mobile-chat-lock');
    document.body.classList.add('nix-mobile-chat-lock');
    document.body.style.top = `-${savedScrollY}px`;

    ensureBackdrop();
    ensureFallbackClose();

    locked = true;
    updateVisualViewport();
    scrollConversationToBottom();
  };

  const unlockPage = () => {
    if (!locked) return;

    document.documentElement.classList.remove('nix-mobile-chat-lock', 'nix-keyboard-open');
    document.body.classList.remove('nix-mobile-chat-lock', 'nix-keyboard-open');
    document.body.style.top = '';

    locked = false;
    window.scrollTo(0, savedScrollY);
  };

  const syncState = () => {
    panel = firstMatch(PANEL_SELECTORS);
    const shouldLock = MOBILE_QUERY.matches && panelIsVisible(panel);

    if (shouldLock) {
      ensureBackdrop();
      ensureFallbackClose();
      lockPage();
      updateVisualViewport();
    } else {
      unlockPage();
    }
  };

  const handleInputFocus = event => {
    if (!MOBILE_QUERY.matches) return;
    if (!event.target.matches(INPUT_SELECTORS.join(','))) return;

    lockPage();
    updateVisualViewport();

    [0, 80, 220, 420].forEach(delay => {
      window.setTimeout(() => {
        updateVisualViewport();
        scrollConversationToBottom();
      }, delay);
    });
  };

  const handleInputBlur = event => {
    if (!event.target.matches(INPUT_SELECTORS.join(','))) return;

    [80, 260, 500].forEach(delay => {
      window.setTimeout(() => {
        updateVisualViewport();
        syncState();
      }, delay);
    });
  };

  document.addEventListener('focusin', handleInputFocus, true);
  document.addEventListener('focusout', handleInputBlur, true);

  const observer = new MutationObserver(syncState);
  observer.observe(document.documentElement, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class', 'style', 'hidden', 'aria-hidden', 'open']
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateVisualViewport, { passive: true });
    window.visualViewport.addEventListener('scroll', updateVisualViewport, { passive: true });
  }

  window.addEventListener('resize', updateVisualViewport, { passive: true });
  window.addEventListener('orientationchange', () => {
    window.setTimeout(() => {
      updateVisualViewport();
      syncState();
    }, 250);
  });

  if (typeof MOBILE_QUERY.addEventListener === 'function') {
    MOBILE_QUERY.addEventListener('change', syncState);
  } else if (typeof MOBILE_QUERY.addListener === 'function') {
    MOBILE_QUERY.addListener(syncState);
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureBackdrop();
    updateVisualViewport();
    syncState();
  });

  window.addEventListener('pageshow', () => {
    updateVisualViewport();
    syncState();
  });
})();
