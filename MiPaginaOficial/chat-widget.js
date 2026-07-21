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

    if (!trigger || !chat || !form || !input || !sendButton || !messagesElement) return;

    const STORAGE_KEY = 'ingenix-nix-chat-v1';
    const avatarPath = 'public/mascota-ingenix/mascota-final.webp';
    const baseWhatsapp = 'https://wa.me/524451820808';
    const maxHistory = 12;

    let isOpen = false;
    let isSending = false;
    let history = loadHistory();

    function syncVisualViewportHeight() {
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        document.documentElement.style.setProperty('--nix-visual-viewport-height', `${Math.round(viewportHeight)}px`);
    }

    syncVisualViewportHeight();
    window.addEventListener('resize', syncVisualViewportHeight, { passive: true });
    window.addEventListener('orientationchange', syncVisualViewportHeight, { passive: true });
    window.visualViewport?.addEventListener('resize', syncVisualViewportHeight, { passive: true });
    window.visualViewport?.addEventListener('scroll', syncVisualViewportHeight, { passive: true });

    function loadHistory() {
        try {
            const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || '[]');
            if (!Array.isArray(stored)) return [];
            return stored
                .filter(item => item && (item.role === 'user' || item.role === 'model') && typeof item.text === 'string')
                .slice(-maxHistory)
                .map(item => ({ role: item.role, text: item.text.slice(0, 4000) }));
        } catch (_) {
            return [];
        }
    }

    function saveHistory() {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(-maxHistory)));
        } catch (_) {}
    }

    function scrollToLatest() {
        requestAnimationFrame(() => {
            messagesElement.scrollTop = messagesElement.scrollHeight;
        });
    }

    function createMessage(text, role = 'model', options = {}) {
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
        scrollToLatest();
        return wrapper;
    }

    function createTypingIndicator() {
        const wrapper = document.createElement('div');
        wrapper.className = 'nix-message bot nix-typing';
        wrapper.setAttribute('aria-label', 'Nix está escribiendo');

        const avatar = document.createElement('span');
        avatar.className = 'nix-message-avatar';
        avatar.setAttribute('aria-hidden', 'true');
        const image = document.createElement('img');
        image.src = avatarPath;
        image.alt = '';
        avatar.appendChild(image);

        const bubble = document.createElement('div');
        bubble.className = 'nix-message-bubble';
        for (let index = 0; index < 3; index += 1) {
            const dot = document.createElement('span');
            dot.className = 'nix-typing-dot';
            bubble.appendChild(dot);
        }

        wrapper.append(avatar, bubble);
        messagesElement.appendChild(wrapper);
        scrollToLatest();
        return wrapper;
    }

    function renderConversation() {
        messagesElement.replaceChildren();

        if (!history.length) {
            createMessage('¡Hola! Soy Nix 👋 La IA de Ingenix Hub. Cuéntame qué negocio tienes o qué solución quieres crear y te orientaré para comenzar.');
            return;
        }

        history.forEach(message => createMessage(message.text, message.role));
    }

    function updateWhatsappLink() {
        if (!whatsappLink) return;

        const recent = history
            .slice(-6)
            .map(message => `${message.role === 'user' ? 'Cliente' : 'Nix'}: ${message.text}`)
            .join('\n');

        const text = recent
            ? `Hola, quiero continuar mi cotización con Ingenix Hub. Este es el resumen de mi conversación con Nix:\n\n${recent}`
            : 'Hola, quiero cotizar un proyecto con Ingenix Hub.';

        whatsappLink.href = `${baseWhatsapp}?text=${encodeURIComponent(text.slice(0, 1700))}`;
    }

    function setOpen(nextOpen) {
        isOpen = nextOpen;
        chat.classList.toggle('is-open', isOpen);
        backdrop?.classList.toggle('is-open', isOpen);
        document.body.classList.toggle('nix-chat-open', isOpen);
        chat.setAttribute('aria-hidden', String(!isOpen));
        backdrop?.setAttribute('aria-hidden', String(!isOpen));
        trigger.setAttribute('aria-expanded', String(isOpen));

        if (isOpen) {
            syncVisualViewportHeight();
            renderConversation();
            updateWhatsappLink();
            window.setTimeout(() => {
                syncVisualViewportHeight();
                input.focus({ preventScroll: true });
            }, 180);
        } else {
            trigger.focus({ preventScroll: true });
        }
    }

    function setSending(nextSending) {
        isSending = nextSending;
        input.disabled = isSending;
        sendButton.disabled = isSending;
        quickElement?.querySelectorAll('button').forEach(button => {
            button.disabled = isSending;
        });
    }

    function resizeInput() {
        input.style.height = 'auto';
        input.style.height = `${Math.min(input.scrollHeight, 108)}px`;
    }

    async function sendMessage(rawText) {
        const text = String(rawText || '').trim().slice(0, 800);
        if (!text || isSending) return;

        history.push({ role: 'user', text });
        history = history.slice(-maxHistory);
        saveHistory();
        createMessage(text, 'user');
        updateWhatsappLink();

        input.value = '';
        resizeInput();
        setSending(true);
        quickElement?.setAttribute('hidden', '');

        const typing = createTypingIndicator();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: history }),
                credentials: 'same-origin'
            });

            const data = await response.json().catch(() => ({}));
            typing.remove();

            if (!response.ok || typeof data.reply !== 'string') {
                throw new Error(data.error || 'No pude obtener una respuesta en este momento.');
            }

            const reply = data.reply.trim().slice(0, 4000);
            history.push({ role: 'model', text: reply });
            history = history.slice(-maxHistory);
            saveHistory();
            createMessage(reply, 'model');
            updateWhatsappLink();
        } catch (error) {
            typing.remove();
            createMessage(
                error?.message || 'La IA no está disponible en este momento. Puedes continuar por WhatsApp.',
                'model',
                { error: true }
            );
        } finally {
            setSending(false);
            input.focus({ preventScroll: true });
        }
    }

    trigger.addEventListener('click', () => setOpen(!isOpen));
    closeButton?.addEventListener('click', () => setOpen(false));
    backdrop?.addEventListener('click', () => setOpen(false));

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && isOpen) setOpen(false);
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        sendMessage(input.value);
    });

    input.addEventListener('input', resizeInput);
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            sendMessage(input.value);
        }
    });

    quickElement?.addEventListener('click', event => {
        const button = event.target.closest('[data-nix-prompt]');
        if (!button || button.disabled) return;
        sendMessage(button.dataset.nixPrompt || button.textContent);
    });

    renderConversation();
    updateWhatsappLink();
})();
