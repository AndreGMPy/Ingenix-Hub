(() => {
  'use strict';

  const mobileMedia = window.matchMedia('(max-width: 700px)');
  const chat = document.getElementById('nix-chat');
  const input = document.getElementById('nix-chat-input');
  const messages = document.getElementById('nix-chat-messages');

  if (!chat) return;

  let savedScrollY = 0;
  let locked = false;
  let frame = 0;

  function isOpen() {
    return chat.classList.contains('is-open') &&
      chat.getAttribute('aria-hidden') !== 'true';
  }

  function updateViewport() {
    cancelAnimationFrame(frame);

    frame = requestAnimationFrame(() => {
      const viewport = window.visualViewport;
      const visibleHeight = viewport?.height || window.innerHeight;
      const visibleTop = viewport?.offsetTop || 0;
      const keyboardOpen = visibleHeight < window.innerHeight * 0.78;

      document.documentElement.style.setProperty(
        '--nix-visual-height',
        `${Math.max(280, Math.round(visibleHeight))}px`
      );
      document.documentElement.style.setProperty(
        '--nix-visual-top',
        `${Math.max(0, Math.round(visibleTop))}px`
      );

      document.documentElement.classList.toggle('nix-keyboard-open', keyboardOpen);
      document.body.classList.toggle('nix-keyboard-open', keyboardOpen);
    });
  }

  function scrollMessagesToBottom() {
    if (!messages) return;
    requestAnimationFrame(() => {
      messages.scrollTop = messages.scrollHeight;
    });
  }

  function lockPage() {
    if (locked || !mobileMedia.matches) return;

    savedScrollY = window.scrollY || window.pageYOffset || 0;
    document.documentElement.classList.add('nix-mobile-chat-lock');
    document.body.classList.add('nix-mobile-chat-lock');
    document.body.style.top = `-${savedScrollY}px`;
    locked = true;

    updateViewport();
    scrollMessagesToBottom();
  }

  function unlockPage() {
    if (!locked) return;

    document.documentElement.classList.remove(
      'nix-mobile-chat-lock',
      'nix-keyboard-open'
    );
    document.body.classList.remove(
      'nix-mobile-chat-lock',
      'nix-keyboard-open'
    );
    document.body.style.top = '';

    locked = false;
    window.scrollTo(0, savedScrollY);
  }

  function sync() {
    if (mobileMedia.matches && isOpen()) {
      lockPage();
      updateViewport();
    } else {
      unlockPage();
    }
  }

  const observer = new MutationObserver(sync);
  observer.observe(chat, {
    attributes: true,
    attributeFilter: ['class', 'aria-hidden', 'style', 'hidden']
  });

  input?.addEventListener('focus', () => {
    lockPage();

    [0, 80, 220, 420].forEach(delay => {
      window.setTimeout(() => {
        updateViewport();
        scrollMessagesToBottom();
      }, delay);
    });
  });

  input?.addEventListener('blur', () => {
    [100, 280, 520].forEach(delay => {
      window.setTimeout(() => {
        updateViewport();
        sync();
      }, delay);
    });
  });

  window.visualViewport?.addEventListener('resize', updateViewport, { passive: true });
  window.visualViewport?.addEventListener('scroll', updateViewport, { passive: true });
  window.addEventListener('resize', updateViewport, { passive: true });
  window.addEventListener('orientationchange', () => {
    window.setTimeout(() => {
      updateViewport();
      sync();
    }, 250);
  });

  if (typeof mobileMedia.addEventListener === 'function') {
    mobileMedia.addEventListener('change', sync);
  } else {
    mobileMedia.addListener(sync);
  }

  updateViewport();
  sync();
})();
