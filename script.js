(function() {
    // ===== DOM Elements =====
    const notificationBanner = document.getElementById('notificationBanner');
    const btnCloseNotification = document.getElementById('btnCloseNotification');
    const keyInput = document.getElementById('keyInput');
    const userIdInput = document.getElementById('userIdInput');
    const btnActivate = document.getElementById('btnActivate');
    const btnDelete = document.getElementById('btnDelete');
    const statusMessage = document.getElementById('statusMessage');
    const activeKeyInfo = document.getElementById('activeKeyInfo');
    const infoUser = document.getElementById('infoUser');
    const infoKey = document.getElementById('infoKey');
    const infoType = document.getElementById('infoType');
    const infoExpiry = document.getElementById('infoExpiry');
    const countdownEl = document.getElementById('countdown');
    const toast = document.getElementById('toast');

    // ===== State =====
    let currentActiveKey = null;
    let countdownInterval = null;

    // ===== Storage Keys =====
    const STORAGE = {
        ACTIVE_KEY: 'livchu_current_active_key',
        PENDING_KEYS: 'livchu_pending_keys',
        KEY_HISTORY: 'livchu_key_history',
        APPROVAL_REQUESTS: 'livchu_approval_requests'
    };

    // ===== Utility Functions =====
    function formatDate(date) {
        return date.toLocaleString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    function showStatus(message, type) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message show ' + type;
        clearTimeout(statusMessage._timeout);
        statusMessage._timeout = setTimeout(() => {
            statusMessage.classList.remove('show');
        }, 6000);
    }

    function showToast(message) {
        toast.textContent = message;
        toast.style.display = 'block';
        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.style.display = 'none';
        }, 2500);
    }

    function getStorageData(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Error reading from storage:', e);
            return null;
        }
    }

    function setStorageData(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error writing to storage:', e);
            return false;
        }
    }

    // ===== Countdown Functions =====
    function stopCountdown() {
        if (countdownInterval) {
            clearInterval(countdownInterval);
            countdownInterval = null;
        }
        countdownEl.textContent = '';
    }

    function startCountdown() {
        stopCountdown();
        if (!currentActiveKey) return;

        function update() {
            const now = new Date();
            const expiry = new Date(currentActiveKey.expiresAt);
            const diff = expiry - now;

            if (diff <= 0) {
                countdownEl.textContent = '🔴 KEY ĐÃ HẾT HẠN';
                countdownEl.style.color = 'var(--accent)';
                currentActiveKey = null;
                localStorage.removeItem(STORAGE.ACTIVE_KEY);
                updateActiveKeyDisplay();
                stopCountdown();
                return;
            }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            let text = '⏳ Còn: ';
            if (days > 0) text += `${days}ngày `;
            text += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            countdownEl.textContent = text;
            countdownEl.style.color = 'var(--warning)';
        }

        update();
        countdownInterval = setInterval(update, 1000);
    }

    // ===== Active Key Management =====
    function loadActiveKey() {
        try {
            const saved = localStorage.getItem(STORAGE.ACTIVE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                if (new Date(parsed.expiresAt) > new Date()) {
                    currentActiveKey = parsed;
                } else {
                    currentActiveKey = null;
                    localStorage.removeItem(STORAGE.ACTIVE_KEY);
                }
            }
        } catch (e) {
            currentActiveKey = null;
        }
        updateActiveKeyDisplay();
    }

    function updateActiveKeyDisplay() {
        if (currentActiveKey && new Date(currentActiveKey.expiresAt) > new Date()) {
            activeKeyInfo.classList.add('show');
            infoUser.textContent = currentActiveKey.userId || 'N/A';
            infoKey.textContent = currentActiveKey.key.length > 25 ?
                currentActiveKey.key.substring(0, 25) + '...' :
                currentActiveKey.key;
            infoType.textContent = currentActiveKey.typeLabel || 'N/A';
            infoExpiry.textContent = formatDate(new Date(currentActiveKey.expiresAt));
            startCountdown();
        } else {
            activeKeyInfo.classList.remove('show');
            currentActiveKey = null;
            localStorage.removeItem(STORAGE.ACTIVE_KEY);
            stopCountdown();
        }
    }

    // ===== Key Validation =====
    function findKeyInSystem(inputKey) {
        // Check pending keys
        const pendingKeys = getStorageData(STORAGE.PENDING_KEYS);
        if (pendingKeys) {
            const found = pendingKeys.find(k => k.key === inputKey);
            if (found) return found;
        }

        // Check history
        const history = getStorageData(STORAGE.KEY_HISTORY);
        if (history) {
            const found = history.find(k => k.key === inputKey);
            if (found) return found;
        }

        return null;
    }

    function checkApprovalStatus(inputKey, userId) {
        const requests = getStorageData(STORAGE.APPROVAL_REQUESTS) || [];
        return requests.find(r => r.key === inputKey && r.userId === userId);
    }

    // ===== Event Handlers =====
    // Close notification
    btnCloseNotification.addEventListener('click', () => {
        notificationBanner.style.display = 'none';
    });

    // Activate / Request approval
    btnActivate.addEventListener('click', () => {
        const inputKey = keyInput.value.trim();
        const userId = userIdInput.value.trim();

        if (!inputKey) {
            showStatus('❌ Vui lòng nhập key!', 'error');
            return;
        }

        if (!userId) {
            showStatus('❌ Vui lòng nhập ID người dùng!', 'error');
            return;
        }

        // Find key in system
        const keyFound = findKeyInSystem(inputKey);

        if (!keyFound) {
            showStatus('❌ KEY KHÔNG TỒN TẠI trong hệ thống!', 'error');
            return;
        }

        if (keyFound.usedCount >= keyFound.userLimit) {
            showStatus('❌ KEY ĐÃ ĐẠT GIỚI HẠN NGƯỜI DÙNG!', 'error');
            return;
        }

        if (keyFound.approvedUsers && keyFound.approvedUsers.includes(userId)) {
            showStatus('⚠️ Bạn đã được duyệt key này rồi!', 'info');
            return;
        }

        // Check existing approval request
        const existingRequest = checkApprovalStatus(inputKey, userId);

        if (existingRequest) {
            if (existingRequest.status === 'approved') {
                showStatus('✅ Key này đã được duyệt cho bạn!', 'success');
                // Activate key
                const activeKey = {
                    key: inputKey,
                    userId: userId,
                    typeLabel: keyFound.typeLabel || 'Premium',
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                };
                setStorageData(STORAGE.ACTIVE_KEY, activeKey);
                currentActiveKey = activeKey;
                updateActiveKeyDisplay();
            } else if (existingRequest.status === 'pending') {
                showStatus('⏳ Yêu cầu của bạn đang chờ Admin duyệt...', 'pending');
            } else {
                showStatus('❌ Yêu cầu của bạn đã bị từ chối.', 'error');
            }
            return;
        }

        // Create new approval request
        const approvalRequests = getStorageData(STORAGE.APPROVAL_REQUESTS) || [];
        approvalRequests.push({
            key: inputKey,
            userId: userId,
            status: 'pending',
            requestTime: new Date().toISOString(),
            keyData: keyFound
        });

        if (setStorageData(STORAGE.APPROVAL_REQUESTS, approvalRequests)) {
            showStatus('⏳ ĐÃ GỬI YÊU CẦU DUYỆT! Vui lòng chờ Admin duyệt key.', 'pending');
            showToast('📤 Đã gửi yêu cầu duyệt!');
            keyInput.value = '';
            userIdInput.value = '';
        } else {
            showStatus('❌ Lỗi hệ thống!', 'error');
        }
    });

    // Delete / Clear
    btnDelete.addEventListener('click', () => {
        keyInput.value = '';
        userIdInput.value = '';
        showStatus('🗑️ Đã xoá thông tin.', 'info');
    });

    // Auto-paste from clipboard
    keyInput.addEventListener('focus', async () => {
        if (!keyInput.value) {
            try {
                const text = await navigator.clipboard.readText();
                if (text && (text.startsWith('LIVECHU-') || text.startsWith('LCHU-'))) {
                    keyInput.value = text;
                    showToast('📋 Đã dán key từ clipboard!');
                }
            } catch (e) {
                // Clipboard permission denied or no text
            }
        }
    });

    // ===== Initialize =====
    loadActiveKey();
    console.log('✅ FILE NHẬP KEY - Cần Admin duyệt');

    // ===== Demo Data for Testing =====
    // Uncomment below to add demo data
    /*
    const demoPendingKeys = [
        {
            key: 'LIVECHU-DEMO-001',
            typeLabel: 'Premium',
            userLimit: 5,
            usedCount: 0,
            approvedUsers: []
        }
    ];
    setStorageData(STORAGE.PENDING_KEYS, demoPendingKeys);
    */
})();