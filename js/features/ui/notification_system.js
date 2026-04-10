// Sistema de Notificações Personalizadas
class NotificationSystem {
    constructor() {
        this.activeNotifications = new Set();
        this.notificationId = 0;
        this.init();
    }

    init() {
        // Criar container para notificações se não existir
        if (!document.getElementById('notification-container')) {
            const container = document.createElement('div');
            container.id = 'notification-container';
            document.body.appendChild(container);
        }
    }

    show(options) {
        const {
            title = 'Notificação',
            message = '',
            type = 'info', // 'success', 'error', 'warning', 'info'
            icon = null,
            actions = [],
            autoClose = true,
            autoCloseDelay = 5000,
            onClose = null,
            onAction = null
        } = options;

        const notificationId = ++this.notificationId;
        const notification = this.createNotification(notificationId, title, message, type, icon, actions);
        
        // Adicionar ao container
        const container = document.getElementById('notification-container');
        container.appendChild(notification);

        // Mostrar com animação
        requestAnimationFrame(() => {
            notification.classList.add('show');
        });

        this.activeNotifications.add(notificationId);

        // Auto-close se habilitado
        let autoCloseTimer = null;
        if (autoClose && autoCloseDelay > 0) {
            autoCloseTimer = setTimeout(() => {
                this.close(notificationId);
            }, autoCloseDelay);
        }

        // Configurar fechamento
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (autoCloseTimer) clearTimeout(autoCloseTimer);
                this.close(notificationId);
                if (onClose) onClose();
            });
        }

        // Configurar ações
        const actionBtns = notification.querySelectorAll('.notification-btn');
        actionBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                if (autoCloseTimer) clearTimeout(autoCloseTimer);
                this.close(notificationId);
                if (onAction) onAction(actions[index]);
            });
        });

        // Fechar ao clicar fora (opcional)
        const overlay = notification.querySelector('.notification-overlay');
        if (overlay) {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    if (autoCloseTimer) clearTimeout(autoCloseTimer);
                    this.close(notificationId);
                    if (onClose) onClose();
                }
            });
        }

        return notificationId;
    }

    createNotification(id, title, message, type, icon, actions) {
        const notification = document.createElement('div');
        notification.className = 'notification-overlay';
        notification.dataset.notificationId = id;

        // Determinar ícone baseado no tipo
        let defaultIcon = 'ℹ️';
        switch (type) {
            case 'success': defaultIcon = '✅'; break;
            case 'error': defaultIcon = '❌'; break;
            case 'warning': defaultIcon = '⚠️'; break;
            case 'info': defaultIcon = 'ℹ️'; break;
        }

        const finalIcon = icon || defaultIcon;

        // Determinar título baseado no tipo
        let defaultTitle = title;
        if (title === 'Notificação') {
            switch (type) {
                case 'success': defaultTitle = 'Sucesso'; break;
                case 'error': defaultTitle = 'Erro'; break;
                case 'warning': defaultTitle = 'Aviso'; break;
                case 'info': defaultTitle = 'Informação'; break;
            }
        }

        notification.innerHTML = `
            <div class="notification-modal">
                <div class="notification-header">
                    <div class="notification-icon ${type}">${finalIcon}</div>
                    <h3 class="notification-title">${defaultTitle}</h3>
                    <button class="notification-close" title="Fechar">×</button>
                </div>
                <div class="notification-content">
                    ${this.formatMessage(message)}
                </div>
                ${actions.length > 0 ? `
                    <div class="notification-actions">
                        ${actions.map(action => `
                            <button class="notification-btn ${action.type || 'secondary'}" data-action="${action.id || 'default'}">
                                ${action.label || 'OK'}
                            </button>
                        `).join('')}
                    </div>
                ` : `
                    <div class="notification-actions">
                        <button class="notification-btn primary" data-action="ok">OK</button>
                    </div>
                `}
            </div>
        `;

        return notification;
    }

    formatMessage(message) {
        if (typeof message === 'string') {
            // Converter quebras de linha em <br>
            return message.replace(/\n/g, '<br>');
        }
        return message;
    }

    t(key, fallback) {
        if (window.I18n && typeof window.I18n.t === 'function') {
            return window.I18n.t(key);
        }
        return fallback;
    }

    close(notificationId) {
        const notification = document.querySelector(`[data-notification-id="${notificationId}"]`);
        if (notification) {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
                this.activeNotifications.delete(notificationId);
            }, 300);
        }
    }

    closeAll() {
        this.activeNotifications.forEach(id => this.close(id));
    }

    // Métodos de conveniência
    success(message, title = 'Sucesso', options = {}) {
        return this.show({
            title,
            message,
            type: 'success',
            ...options
        });
    }

    error(message, title = 'Erro', options = {}) {
        return this.show({
            title,
            message,
            type: 'error',
            ...options
        });
    }

    warning(message, title = 'Aviso', options = {}) {
        return this.show({
            title,
            message,
            type: 'warning',
            ...options
        });
    }

    info(message, title = 'Informação', options = {}) {
        return this.show({
            title,
            message,
            type: 'info',
            ...options
        });
    }

    // Método para substituir alert()
    alert(message, title = 'Aviso', options = {}) {
        return this.show({
            title,
            message,
            type: 'info',
            autoClose: false,
            ...options
        });
    }

    // Método para confirmação
    confirm(message, title = 'Confirmar', onConfirm = null, onCancel = null) {
        return this.show({
            title,
            message,
            type: 'warning',
            autoClose: false,
            actions: [
                {
                    id: 'cancel',
                    label: this.t('common.cancel', 'Cancel'),
                    type: 'secondary'
                },
                {
                    id: 'confirm',
                    label: this.t('common.confirm', 'Confirm'),
                    type: 'primary'
                }
            ],
            onAction: (action) => {
                if (action.id === 'confirm' && onConfirm) {
                    onConfirm();
                } else if (action.id === 'cancel' && onCancel) {
                    onCancel();
                }
            }
        });
    }

    // Método para prompt (simplificado)
    prompt(message, title = 'Entrada', defaultValue = '', onConfirm = null, onCancel = null) {
        const notification = document.createElement('div');
        notification.className = 'notification-overlay';
        notification.innerHTML = `
            <div class="notification-modal">
                <div class="notification-header">
                    <div class="notification-icon info">📝</div>
                    <h3 class="notification-title">${title}</h3>
                    <button class="notification-close" title="Fechar">×</button>
                </div>
                <div class="notification-content">
                    <p>${message}</p>
                    <input type="text" class="modal-input" value="${defaultValue}" placeholder="Digite aqui..." style="width: 100%; margin-top: 10px;">
                </div>
                <div class="notification-actions">
                    <button class="notification-btn secondary" data-action="cancel">Cancelar</button>
                    <button class="notification-btn primary" data-action="confirm">OK</button>
                </div>
            </div>
        `;

        document.body.appendChild(notification);
        requestAnimationFrame(() => notification.classList.add('show'));

        const input = notification.querySelector('input');
        const confirmBtn = notification.querySelector('[data-action="confirm"]');
        const cancelBtn = notification.querySelector('[data-action="cancel"]');
        const closeBtn = notification.querySelector('.notification-close');

        input.focus();

        const closeNotification = () => {
            notification.classList.remove('show');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        };

        confirmBtn.addEventListener('click', () => {
            const value = input.value;
            closeNotification();
            if (onConfirm) onConfirm(value);
        });

        cancelBtn.addEventListener('click', () => {
            closeNotification();
            if (onCancel) onCancel();
        });

        closeBtn.addEventListener('click', () => {
            closeNotification();
            if (onCancel) onCancel();
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const value = input.value;
                closeNotification();
                if (onConfirm) onConfirm(value);
            }
        });

        return notification;
    }
}

// Criar instância global
window.notificationSystem = new NotificationSystem();

// Substituir alert() global
window.originalAlert = window.alert;
window.alert = function(message, title = 'Aviso') {
    window.notificationSystem.alert(message, title);
};

// Funções de conveniência globais
window.showSuccess = (message, title) => window.notificationSystem.success(message, title);
window.showError = (message, title) => window.notificationSystem.error(message, title);
window.showWarning = (message, title) => window.notificationSystem.warning(message, title);
window.showInfo = (message, title) => window.notificationSystem.info(message, title);
window.showConfirm = (message, title, onConfirm, onCancel) => window.notificationSystem.confirm(message, title, onConfirm, onCancel);
window.showPrompt = (message, title, defaultValue, onConfirm, onCancel) => window.notificationSystem.prompt(message, title, defaultValue, onConfirm, onCancel);

// Função para testar o sistema
window.testNotifications = () => {
    window.notificationSystem.success('Operação concluída com sucesso!', 'Sucesso');
    
    setTimeout(() => {
        window.notificationSystem.error('Ocorreu um erro durante a operação.', 'Erro');
    }, 1000);
    
    setTimeout(() => {
        window.notificationSystem.warning('Atenção: Esta ação não pode ser desfeita.', 'Aviso');
    }, 2000);
    
    setTimeout(() => {
        window.notificationSystem.info('Informação importante sobre o sistema.', 'Informação');
    }, 3000);
    
    setTimeout(() => {
        window.notificationSystem.confirm(
            'Tem certeza que deseja excluir este item?',
            'Confirmar Exclusão',
            () => window.notificationSystem.success('Item excluído!'),
            () => window.notificationSystem.info('Operação cancelada.')
        );
    }, 4000);
};
