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
    const whatsappLink = document.getElementById('nix-chat-whatsapp');

    if (!trigger || !chat || !form || !input || !messagesElement) return;

    const state = {
        open: false,
        busy: false,
        history: [],
        welcomed: false
    };

    const avatarPath = 'public/mascota-ingenix/mascota-final.webp';
    const whatsappNumber = '524451820808';

    function safeStorageRead() {
        try {
            const raw = sessionStorage.getItem('nix-chat-history');
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter(item => item && (item.role === 'user' || item.role === 'model') && typeof item.text === 'string')
                .slice(-12);
        } catch (_) {
            return [];
        }
    }

    function safeStorageWrite() {
        try {
            sessionStorage.setItem('nix-chat-history', JSON.stringify(state.history.slice(-12)));
        } catch (_) {}
    }

    function createBubble(role, text, options = {}) {
        const wrapper = document.createElement('div');
        wrapper.className = `nix-message ${role === 'user' ? 'user' : 'bot'}${options.error ? ' error' : ''}`;

        if (role !== 'user') {
            const avatar = document.createElement('span');
            avatar.className = 'nix-message-avatar';
            avatar.setAttribute('aria-hidden', 'true');
            const image = document.createElement('img');
            image.src = avatarPath;
            image.alt = '';
            avatar.appendChild(image);
            wrapper.appendChild(avatar);
        }

        const bubble = document.createElement('div');
        bubble.className = 'nix-message-bubble';
        bubble.textContent = text;
        wrapper.appendChild(bubble);
        messagesElement.appendChild(wrapper);
        messagesElement.scrollTop = messagesElement.scrollHeight;
        return wrapper;
    }

    function showTyping() {
        const wrapper = document.createElement('div');
        wrapper.className = 'nix-message bot nix-typing';
        wrapper.id = 'nix-typing';
        wrapper.innerHTML = `
            <span class="nix-message-avatar" aria-hidden="true"><img src="${avatarPath}" alt=""></span>
            <span class="nix-message-bubble" aria-label="Nix está escribiendo">
                <i class="nix-typing-dot"></i><i class="nix-typing-dot"></i><i class="nix-typing-dot"></i>
            </span>`;
        messagesElement.appendChild(wrapper);
        messagesElement.scrollTop = messagesElement.scrollHeight;
    }

    function hideTyping() {
        document.getElementById('nix-typing')?.remove();
    }

    function renderStoredHistory() {
        state.history = safeStorageRead();
        if (!state.history.length) return;
        state.history.forEach(item => createBubble(item.role, item.text));
        state.welcomed = true;
    }

    function showWelcome() {
        if (state.welcomed) return;
        createBubble('model', 'Hola, soy Nix 👋 La IA de Ingenix Hub. Cuéntame qué quieres crear y te ayudaré a definir la opción más conveniente para tu proyecto.');
        state.welcomed = true;
    }

    function setOpen(open) {
        state.open = open;
        chat.classList.toggle('is-open', open);
        backdrop?.classList.toggle('is-open', open);
        document.body.classList.toggle('nix-chat-open', open);
        chat.setAttribute('aria-hidden', String(!open));
        backdrop?.setAttribute('aria-hidden', String(!open));
        trigger.setAttribute('aria-expanded', String(open));

        if (open) {
            showWelcome();
            window.setTimeout(() => input.focus({ preventScroll: true }), 180);
        } else {
            trigger.focus({ preventScroll: true });
        }
    }

    function resizeInput() {
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 108)}px`;
    }

    function updateWhatsApp() {
        const userMessages = state.history
            .filter(item => item.role === 'user')
            .slice(-4)
            .map(item => `• ${item.text.replace(/\s+/g, ' ').trim()}`);

        const summary = userMessages.length
            ? `Hola, hablé con Nix en ingenixhub.com y quiero continuar mi cotización. Esto es lo que necesito:\n${userMessages.join('\n')}`
            : 'Hola, quiero cotizar un proyecto con Ingenix Hub.';

        whatsappLink.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(summary.slice(0, 1400))}`;
    }

    function setBusy(busy) {
        state.busy = busy;
        sendButton.disabled = busy;
        input.disabled = busy;
        quickElement?.querySelectorAll('button').forEach(button => { button.disabled = busy; });
    }

    async function askNix(text) {
        const clean = text.trim().slice(0, 800);
        if (!clean || state.busy) return;

        createBubble('user', clean);
        state.history.push({ role: 'user', text: clean });
        state.history = state.history.slice(-12);
        safeStorageWrite();
        updateWhatsApp();
        input.value = '';
        resizeInput();
        setBusy(true);
        showTyping();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: state.history })
            });

            let payload = {};
            try { payload = await response.json(); } catch (_) {}

            if (!response.ok) {
                throw new Error(payload.error || 'No pude conectar con la IA en este momento.');
            }

            const answer = String(payload.reply || '').trim();
            if (!answer) throw new Error('La IA no devolvió una respuesta. Intenta de nuevo.');

            hideTyping();
            createBubble('model', answer);
            state.history.push({ role: 'model', text: answer });
            state.history = state.history.slice(-12);
            safeStorageWrite();
        } catch (error) {
            hideTyping();
            const localPreview = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
            const fallback = localPreview
                ? 'El chat visual ya funciona, pero esta vista local necesita ejecutarse con “vercel dev” o estar desplegada en Vercel con GEMINI_API_KEY configurada para conectarse a Gemini.'
                : (error?.message || 'No pude responder ahora. Puedes continuar por WhatsApp.');
            createBubble('model', fallback, { error: true });
        } finally {
            setBusy(false);
            input.focus({ preventScroll: true });
        }
    }

    trigger.addEventListener('click', () => setOpen(!state.open));
    closeButton?.addEventListener('click', () => setOpen(false));
    backdrop?.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && state.open) setOpen(false);
    });

    input.addEventListener('input', resizeInput);
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            form.requestSubmit();
        }
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        askNix(input.value);
    });

    quickElement?.addEventListener('click', event => {
        const button = event.target.closest('[data-nix-prompt]');
        if (!button) return;
        askNix(button.dataset.nixPrompt || '');
    });

    renderStoredHistory();
    updateWhatsApp();
})();
