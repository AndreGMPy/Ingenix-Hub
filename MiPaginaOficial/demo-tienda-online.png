(() => {
    'use strict';

    const trigger = document.getElementById('nix-chat-trigger');
    const chat = document.getElementById('nix-chat');
    const backdrop = document.getElementById('nix-chat-backdrop');
    const closeButton = document.getElementById('nix-chat-close');
    const form = document.getElementById('nix-chat-form');
    const input = document.getElementById('nix-chat-input');
    const sendButton = document.getElementById('nix-chat-send');
    const messagesElement = document.getElementById('nix-chat-messages');
    const quickElement = document.getElementById('nix-chat-quick');

    if (!trigger || !chat || !messagesElement) return;

    const avatarPath = 'public/mascota-ingenix/mascota-final.webp';
    let open = false;
    let messageShown = false;

    function createMessage(text) {
        const wrapper = document.createElement('div');
        wrapper.className = 'nix-message bot';

        const avatar = document.createElement('span');
        avatar.className = 'nix-message-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        const image = document.createElement('img');
        image.src = avatarPath;
        image.alt = '';
        avatar.appendChild(image);

        const bubble = document.createElement('div');
        bubble.className = 'nix-message-bubble';
        bubble.textContent = text;

        wrapper.appendChild(avatar);
        wrapper.appendChild(bubble);
        messagesElement.appendChild(wrapper);
        messagesElement.scrollTop = messagesElement.scrollHeight;
    }

    function showDevelopmentMessage() {
        if (messageShown) return;
        createMessage('¡Hola! Soy Nix 👋 Mi inteligencia artificial todavía está en desarrollo. Muy pronto podré ayudarte directamente desde aquí. Espera nuestras próximas actualizaciones.');
        messageShown = true;
    }

    function setOpen(nextOpen) {
        open = nextOpen;
        chat.classList.toggle('is-open', open);
        backdrop?.classList.toggle('is-open', open);
        document.body.classList.toggle('nix-chat-open', open);
        chat.setAttribute('aria-hidden', String(!open));
        backdrop?.setAttribute('aria-hidden', String(!open));
        trigger.setAttribute('aria-expanded', String(open));

        if (open) {
            showDevelopmentMessage();
            closeButton?.focus({ preventScroll: true });
        } else {
            trigger.focus({ preventScroll: true });
        }
    }

    // Modo temporal mientras se termina la integración con Gemini.
    quickElement?.setAttribute('hidden', '');
    if (input) {
        input.disabled = true;
        input.required = false;
        input.placeholder = 'IA en desarrollo — disponible próximamente';
    }
    if (sendButton) sendButton.disabled = true;
    form?.addEventListener('submit', event => event.preventDefault());

    trigger.addEventListener('click', () => setOpen(!open));
    closeButton?.addEventListener('click', () => setOpen(false));
    backdrop?.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && open) setOpen(false);
    });
})();
