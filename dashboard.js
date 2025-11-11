// Dashboard Script
let isScanning = false;
let unfollowersData = [];
let selectedUsers = new Set();
let unfollowQueue = [];
let isUnfollowing = false;
let unfollowPaused = false;

// Unfollow hızı (milisaniye) - Twitter rate limit için güvenli değer
let UNFOLLOW_DELAY = 800; // 0.8 saniye (varsayılan 2 saniye idi)

// Duplicate mesaj processing önleme
let lastProcessedMessage = {
    action: '',
    username: '',
    timestamp: 0
};

// DOM Elements
const scanBtn = document.getElementById('scanBtn');
const stopBtn = document.getElementById('stopBtn');
const clearBtn = document.getElementById('clearBtn');
const status = document.getElementById('status');
const progress = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const resultsContainer = document.getElementById('resultsContainer');
const results = document.getElementById('results');
const statsDiv = document.getElementById('stats');
const searchInput = document.getElementById('searchInput');

// Bulk action elements
const bulkActions = document.getElementById('bulkActions');
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const selectedCount = document.getElementById('selectedCount');
const unfollowSelectedBtn = document.getElementById('unfollowSelectedBtn');
const pauseUnfollowBtn = document.getElementById('pauseUnfollowBtn');
const bulkProgress = document.getElementById('bulkProgress');
const bulkProgressText = document.getElementById('bulkProgressText');
const bulkProgressPercent = document.getElementById('bulkProgressPercent');
const bulkProgressBar = document.getElementById('bulkProgressBar');
const selectAllBtn = document.getElementById('selectAllBtn');
const selectNoneBtn = document.getElementById('selectNoneBtn');
const selectInverseBtn = document.getElementById('selectInverseBtn');
const unfollowSpeedSelect = document.getElementById('unfollowSpeedSelect');

// Event Listeners
scanBtn.addEventListener('click', startScan);
stopBtn.addEventListener('click', stopScan);
clearBtn.addEventListener('click', clearData);
searchInput.addEventListener('input', filterResults);
selectAllCheckbox.addEventListener('change', toggleSelectAll);
unfollowSelectedBtn.addEventListener('click', startBulkUnfollow);
pauseUnfollowBtn.addEventListener('click', togglePauseUnfollow);
selectAllBtn.addEventListener('click', selectAll);
selectNoneBtn.addEventListener('click', selectNone);
selectInverseBtn.addEventListener('click', selectInverse);

// Hız değiştiğinde güncelle
unfollowSpeedSelect.addEventListener('change', (e) => {
    UNFOLLOW_DELAY = parseInt(e.target.value);
    console.log('Unfollow hızı güncellendi:', UNFOLLOW_DELAY, 'ms');
});

// Load saved data on page load
loadSavedData();

let scanPollingInterval = null;

function startScanPolling() {
    // Önceki polling'i temizle
    if (scanPollingInterval) {
        clearInterval(scanPollingInterval);
    }

    // Her 2 saniyede bir storage'ı kontrol et
    scanPollingInterval = setInterval(() => {
        chrome.storage.local.get(['scanInProgress', 'scanComplete', 'scanData'], (result) => {
            if (result.scanData) {
                // Progress güncelle
                const data = result.scanData;
                if (data.totalFollowing > 0) {
                    statsDiv.style.display = 'grid';
                    document.getElementById('followingCount').textContent = data.totalFollowing;
                    document.getElementById('notFollowingBack').textContent = data.notFollowingCount;

                    // Karşılıklı takip hesapla
                    const mutualFollow = data.totalFollowing - data.notFollowingCount;
                    const mutualFollowEl = document.getElementById('mutualFollowCount');
                    if (mutualFollowEl) {
                        mutualFollowEl.textContent = mutualFollow;
                    }
                }
            }

            // Tarama devam ediyorsa Twitter tab'ını aktif tut
            if (result.scanInProgress) {
                chrome.tabs.query({}, (tabs) => {
                    const twitterTab = tabs.find(tab =>
                        tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))
                    );
                    if (twitterTab && !twitterTab.active) {
                        // Twitter tab'ı aktif değilse kullanıcıyı uyar
                        updateStatus('⚠️ Tarama için Twitter tab\'ı açık kalmalı! Lütfen Twitter\'a geri dönün.');
                    } else if (twitterTab && twitterTab.active) {
                        updateStatus(`Tarama devam ediyor... (${result.scanData?.totalFollowing || 0} kişi kontrol edildi)`);
                    }
                });
            }

            // Tarama tamamlandı mı?
            if (result.scanComplete) {
                clearInterval(scanPollingInterval);
                scanPollingInterval = null;

                const data = result.scanData;
                statsDiv.style.display = 'grid';
                document.getElementById('followingCount').textContent = data.stats.following;
                document.getElementById('notFollowingBack').textContent = data.stats.notFollowingBack;

                // Karşılıklı takip hesapla
                const mutualFollow = data.stats.following - data.stats.notFollowingBack;
                const mutualFollowEl = document.getElementById('mutualFollowCount');
                if (mutualFollowEl) {
                    mutualFollowEl.textContent = mutualFollow;
                }

                displayResults(data.unfollowers);
                updateStatus(`Tarama tamamlandı! ${data.unfollowers.length} kişi sizi takip etmiyor.`);

                chrome.storage.local.set({
                    unfollowers: data.unfollowers,
                    lastScan: new Date().toISOString(),
                    scanComplete: false
                });

                // Dashboard aktif olunca bildirimi göster
                // Tab aktif mi kontrol et
                document.addEventListener('visibilitychange', function showNotificationWhenActive() {
                    if (!document.hidden) {
                        // Tab aktif oldu, bildirimi göster
                        showScanCompleteNotification(data.stats.notFollowingBack);
                        document.removeEventListener('visibilitychange', showNotificationWhenActive);
                    }
                });

                // Eğer zaten aktifse direkt göster
                if (!document.hidden) {
                    showScanCompleteNotification(data.stats.notFollowingBack);
                }
            }
        });
    }, 2000);
}

function stopScanPolling() {
    if (scanPollingInterval) {
        clearInterval(scanPollingInterval);
        scanPollingInterval = null;
    }
}

function showScanCompleteNotification(unfollowerCount) {
    // Büyük başarı bildirimi oluştur
    const notification = document.createElement('div');
    notification.className = 'scan-complete-notification';
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                    <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
            </div>
            <h2>Tarama Tamamlandı! 🎉</h2>
            <p class="notification-count">${unfollowerCount} kişi sizi takip etmiyor</p>
            <p class="notification-sub">Sonuçlar yükleniyor...</p>
        </div>
    `;

    document.body.appendChild(notification);

    // Animasyon ile göster
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // 3 saniye sonra kaldır
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 3000);
}

function loadSavedData() {
    chrome.storage.local.get(['unfollowers', 'lastScan'], (result) => {
        if (result.unfollowers && result.lastScan) {
            unfollowersData = result.unfollowers;
            displayResults(result.unfollowers);
            const lastScanDate = new Date(result.lastScan);
            updateStatus(`Son tarama: ${lastScanDate.toLocaleString('tr-TR')}`);
            clearBtn.style.display = 'block';
        }
    });
}

function startScan() {
    if (isScanning) return;

    isScanning = true;
    scanBtn.style.display = 'none';
    stopBtn.style.display = 'flex';
    clearBtn.style.display = 'none';
    progress.style.display = 'block';
    resultsContainer.style.display = 'none';
    statsDiv.style.display = 'none';

    updateStatus('Twitter tab\'ları aranıyor...');

    // Tarama tamamlanma kontrolü için polling başlat
    startScanPolling();

    // Tüm tab'ları kontrol et, Twitter tab'ı bul
    chrome.tabs.query({}, (tabs) => {
        const twitterTab = tabs.find(tab =>
            tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))
        );

        if (!twitterTab) {
            updateStatus('Twitter tab\'ı bulunamadı! Yeni tab açılıyor...');

            // Twitter'ı yeni tab'da aç
            chrome.tabs.create({ url: 'https://twitter.com' }, (newTab) => {
                updateStatus('Twitter açıldı. Lütfen 5 saniye bekleyin ve tekrar tarama başlatın.');
                resetUI();
            });
            return;
        }

        updateStatus('Content script kontrol ediliyor...');

        // Twitter tab'ını aktif yap
        chrome.tabs.update(twitterTab.id, { active: true });

        // Kullanıcıyı uyar
        updateStatus('⚠️ ÖNEMLİ: Tarama sırasında Twitter tab\'ı açık kalmalıdır! Başka tab\'a geçmeyin.');

        // Önce content script'in yüklü olup olmadığını kontrol et
        chrome.tabs.sendMessage(twitterTab.id, {action: 'ping'}, (response) => {
            if (chrome.runtime.lastError || !response || !response.pong) {
                // Content script yüklü değil, manuel inject et

                chrome.scripting.executeScript({
                    target: { tabId: twitterTab.id },
                    files: ['content.js']
                }, () => {
                    if (chrome.runtime.lastError) {
                        updateStatus('Hata: Script yüklenemedi');
                        resetUI();
                        return;
                    }

                    // Script yüklendi, biraz bekle ve taramayı başlat
                    setTimeout(() => {
                        startScanOnTab(twitterTab.id);
                    }, 500);
                });
            } else {
                // Content script zaten yüklü
                startScanOnTab(twitterTab.id);
            }
        });
    });
}

function startScanOnTab(tabId) {

    chrome.tabs.sendMessage(tabId, {action: 'startScan'}, (response) => {
        if (chrome.runtime.lastError) {
            updateStatus('Hata: Bağlantı kurulamadı');
            resetUI();
        } else {
        }
    });
}

function stopScan() {
    stopScanPolling();

    // Twitter tab'ı bul ve durdurma mesajı gönder
    chrome.tabs.query({}, (tabs) => {
        const twitterTab = tabs.find(tab =>
            tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))
        );

        if (twitterTab) {
            chrome.tabs.sendMessage(twitterTab.id, {action: 'stopScan'});
        }
    });
    resetUI();
    updateStatus('Tarama durduruldu.');
}

function clearData() {
    if (confirm('Tüm tarama verilerini silmek istediğinize emin misiniz?')) {
        chrome.storage.local.remove(['unfollowers', 'lastScan'], () => {
            resultsContainer.style.display = 'none';
            statsDiv.style.display = 'none';
            clearBtn.style.display = 'none';
            clearTimeline();
            unfollowersData = [];
            updateStatus('Veriler temizlendi.');
        });

        // Twitter tab'larındaki localStorage'ı da temizle
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))) {
                    chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            localStorage.removeItem('pendingUnfollow');
                            localStorage.removeItem('unfollowStartTime');
                            localStorage.removeItem('unfollowIsBulk');
                            localStorage.removeItem('twitterScanPending');
                        }
                    }).catch(() => {
                        // Hata olursa sessizce devam et
                    });
                }
            });
        });
    }
}

function resetUI() {
    isScanning = false;
    scanBtn.style.display = 'flex';
    stopBtn.style.display = 'none';
    progress.style.display = 'none';
    progressBar.style.width = '0%';

    chrome.storage.local.get(['unfollowers'], (result) => {
        if (result.unfollowers && result.unfollowers.length > 0) {
            clearBtn.style.display = 'block';
        }
    });
}

function updateStatus(message) {
    status.textContent = message;
}

function updateProgress(percent) {
    progressBar.style.width = percent + '%';
}

function displayResults(unfollowers) {
    unfollowersData = unfollowers;
    selectedUsers.clear();

    if (unfollowers.length === 0) {
        updateStatus('Harika! Tüm takip ettikleriniz sizi takip ediyor!');

        resultsContainer.style.display = 'block';
        bulkActions.style.display = 'none';
        results.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                </div>
                <h3 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 10px;">Tebrikler!</h3>
                <p style="font-size: 16px; color: #64748b;">Tüm takip ettikleriniz sizi takip ediyor.</p>
            </div>
        `;
        resetUI();
        return;
    }

    statsDiv.style.display = 'grid';
    resultsContainer.style.display = 'block';
    bulkActions.style.display = 'flex';


    renderUserList(unfollowers);
    updateSelectedCount();
    resetUI();
}

function renderUserList(users) {
    results.innerHTML = '';

    if (users.length === 0) {
        results.innerHTML = `
            <div class="empty-state">
                <p>Arama sonucu bulunamadı.</p>
            </div>
        `;
        return;
    }

    users.forEach((user, index) => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card';

        // Avatar - gerçek resim varsa kullan, yoksa placeholder
        const avatarHTML = user.avatar ?
            `<img src="${user.avatar}" alt="${user.username}" class="user-avatar">` :
            `<div class="user-avatar" style="background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 20px;">
                ${user.username.charAt(0).toUpperCase()}
            </div>`;

        // Display name ve username
        const displayName = user.displayName || user.username;

        userCard.innerHTML = `
            <div class="user-card-header">
                <div class="user-checkbox-wrapper">
                    <label class="user-card-checkbox-label">
                        <input type="checkbox" class="user-card-checkbox" data-username="${user.username}">
                        <span class="user-checkbox-custom"></span>
                    </label>
                </div>
                <div class="user-avatar-wrapper">
                    ${avatarHTML}
                </div>
                <div class="user-info">
                    <a href="https://twitter.com/${user.username}" target="_blank" class="user-name" data-username="${user.username}">${displayName}</a>
                    <div class="user-handle">@${user.username}</div>
                    <div class="user-status-badge" style="display: none;"></div>
                </div>
            </div>
        `;

        // Checkbox event listener
        const checkbox = userCard.querySelector('.user-card-checkbox');
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                selectedUsers.add(user.username);
                userCard.classList.add('selected');
            } else {
                selectedUsers.delete(user.username);
                userCard.classList.remove('selected');
            }
            updateSelectedCount();
        });

        // Card'ın her yerine tıklanınca seçim yap (link hariç)
        userCard.addEventListener('click', (e) => {
            // Eğer link'e tıklanmışsa, seçim yapma
            if (e.target.closest('.user-name')) {
                return;
            }

            // Checkbox'ı toggle et
            checkbox.checked = !checkbox.checked;

            // Change event'ini tetikle
            if (checkbox.checked) {
                selectedUsers.add(user.username);
                userCard.classList.add('selected');
            } else {
                selectedUsers.delete(user.username);
                userCard.classList.remove('selected');
            }
            updateSelectedCount();
        });

        // Eğer önceden seçilmişse işaretle
        if (selectedUsers.has(user.username)) {
            checkbox.checked = true;
            userCard.classList.add('selected');
        }

        results.appendChild(userCard);
    });
}

function filterResults() {
    const query = searchInput.value.toLowerCase();
    const filtered = unfollowersData.filter(user =>
        user.username.toLowerCase().includes(query)
    );
    renderUserList(filtered);
}

function unfollowUser(username, index) {
    if (!confirm(`@${username} kullanıcısını takipten çıkarmak istediğinize emin misiniz?`)) {
        return;
    }


    // Twitter tab'ı bul
    chrome.tabs.query({}, (tabs) => {
        const twitterTab = tabs.find(tab =>
            tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))
        );

        if (!twitterTab) {
            return;
        }

        chrome.tabs.sendMessage(twitterTab.id, {
            action: 'unfollowUser',
            username: username
        }, (response) => {
            // Butonu bul ve güncelle
            const allButtons = document.querySelectorAll('.btn-unfollow');
            allButtons.forEach(btn => {
                if (btn.getAttribute('data-username') === username) {
                    const card = btn.closest('.user-card');
                    if (card) {
                        card.style.opacity = '0.5';
                    }
                    btn.disabled = true;

                    if (response && response.suspended) {
                        // Askıya alınmış hesap
                        btn.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="12" y1="8" x2="12" y2="12"/>
                                <line x1="12" y1="16" x2="12.01" y2="16"/>
                            </svg>
                            Askıda
                        `;
                        btn.style.color = '#ff9800';
                    } else if (response && response.success) {
                        // Başarılı
                        btn.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                                <polyline points="22 4 12 14.01 9 11.01"/>
                            </svg>
                            Çıkarıldı
                        `;
                    } else {
                        // Başarısız
                        btn.innerHTML = `
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"/>
                                <line x1="15" y1="9" x2="9" y2="15"/>
                                <line x1="9" y1="9" x2="15" y2="15"/>
                            </svg>
                            Hata
                        `;
                        btn.style.color = '#f4212e';
                    }
                }
            });

            if (response && (response.success || response.suspended)) {
                chrome.storage.local.get(['unfollowers'], (result) => {
                    const updated = result.unfollowers.filter(u => u.username !== username);
                    chrome.storage.local.set({unfollowers: updated});

                    unfollowersData = updated;
                    document.getElementById('notFollowingBack').textContent = updated.length;

                    if (updated.length === 0) {
                        displayResults([]);
                    }
                });
            }
        });
    });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateProgress') {
        updateProgress(request.percent);
        updateStatus(request.message);

        if (request.message.includes('analiz ediliyor') || request.message.includes('kontrol edildi')) {
            const match = request.message.match(/(\d+) kişi kontrol edildi, (\d+) takip etmeyen/);
            if (match) {
                statsDiv.style.display = 'grid';
                document.getElementById('followingCount').textContent = match[1];
                document.getElementById('notFollowingBack').textContent = match[2];
            }
        }
    } else if (request.action === 'scanComplete') {

        const following = request.stats?.following || 0;
        const notFollowers = request.unfollowers.length;


        statsDiv.style.display = 'grid';
        document.getElementById('followingCount').textContent = following;
        document.getElementById('notFollowingBack').textContent = notFollowers;

        displayResults(request.unfollowers);
        updateStatus(`Tarama tamamlandı! ${request.unfollowers.length} kişi sizi takip etmiyor.`);

        chrome.storage.local.set({
            unfollowers: request.unfollowers,
            lastScan: new Date().toISOString()
        });
    } else if (request.action === 'error') {
        updateStatus(`Hata: ${request.message}`);
        resetUI();
    } else if (request.action === 'unfollowSuccess') {
        updateStatus(`@${request.username} takipten çıkarıldı.`);
    } else if (request.action === 'bulkUnfollowComplete') {
        // Duplicate mesaj kontrolü
        const now = Date.now();
        if (lastProcessedMessage.action === 'bulkUnfollowComplete' &&
            lastProcessedMessage.username === request.username &&
            now - lastProcessedMessage.timestamp < 500) {
            console.log('⚠️ Duplicate bulkUnfollowComplete engellendi:', request.username);
            return;
        }
        lastProcessedMessage = {
            action: 'bulkUnfollowComplete',
            username: request.username,
            timestamp: now
        };

        // Bulk unfollow için tamamlanma mesajı
        console.log('✓ bulkUnfollowComplete alındı:', request);

        const username = request.username;
        const userCard = document.querySelector(`.user-card-checkbox[data-username="${username}"]`)?.closest('.user-card');

        if (userCard) {
            userCard.classList.remove('processing');
        }

        if (request.success) {
            // Başarılı
            if (userCard) {
                updateUserCardStatus(userCard, 'success', 'Takipten çıkarıldı ✓');
                userCard.style.opacity = '0.5';
            }

            // Storage'dan kaldır
            chrome.storage.local.get(['unfollowers'], (result) => {
                const updated = result.unfollowers.filter(u => u.username !== username);
                chrome.storage.local.set({unfollowers: updated});
                unfollowersData = updated;
                document.getElementById('notFollowingBack').textContent = updated.length;
            });
        } else if (request.suspended) {
            // Askıya alınmış hesap
            if (userCard) {
                updateUserCardStatus(userCard, 'suspended', 'Askıya alınmış hesap');
                userCard.style.opacity = '0.5';
            }

            // Storage'dan kaldır
            chrome.storage.local.get(['unfollowers'], (result) => {
                const updated = result.unfollowers.filter(u => u.username !== username);
                chrome.storage.local.set({unfollowers: updated});
                unfollowersData = updated;
                document.getElementById('notFollowingBack').textContent = updated.length;
            });
        } else {
            // Hata
            if (userCard) {
                updateUserCardStatus(userCard, 'error', 'Hata oluştu');
            }
        }

        // Queue'dan çıkar
        console.log('Queue öncesi:', unfollowQueue);
        unfollowQueue.shift();
        console.log('Queue sonrası:', unfollowQueue);
        console.log('isUnfollowing:', isUnfollowing, 'unfollowPaused:', unfollowPaused);

        // Sonraki kullanıcıya geç (UNFOLLOW_DELAY kadar bekle)
        setTimeout(() => {
            console.log(`${UNFOLLOW_DELAY}ms sonra - isUnfollowing:`, isUnfollowing, 'unfollowPaused:', unfollowPaused);
            if (isUnfollowing && !unfollowPaused) {
                console.log('Sonraki kullanıcıya geçiliyor...');
                processUnfollowQueue();
            } else {
                console.log('İşlem durdu. isUnfollowing:', isUnfollowing, 'unfollowPaused:', unfollowPaused);
            }
        }, UNFOLLOW_DELAY);
    } else if (request.action === 'log') {
    }
});

// Check for active scan on load
window.addEventListener('load', () => {
    // Tüm tab'ları kontrol et, aktif tarama var mı bak
    chrome.tabs.query({}, (tabs) => {
        const twitterTab = tabs.find(tab =>
            tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))
        );

        if (twitterTab) {
            chrome.tabs.sendMessage(twitterTab.id, {action: 'getStatus'}, (response) => {
                if (response && response.isScanning) {
                    isScanning = true;
                    scanBtn.style.display = 'none';
                    stopBtn.style.display = 'flex';
                    progress.style.display = 'block';

                    updateStatus('Tarama devam ediyor...');
                }
            });
        }
    });
});

// ============= BULK UNFOLLOW SYSTEM =============

function updateSelectedCount() {
    const count = selectedUsers.size;
    selectedCount.textContent = count;
    unfollowSelectedBtn.disabled = count === 0;

    // Select all checkbox durumunu güncelle
    const totalUsers = document.querySelectorAll('.user-card-checkbox').length;
    selectAllCheckbox.checked = count > 0 && count === totalUsers;
    selectAllCheckbox.indeterminate = count > 0 && count < totalUsers;
}

function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.user-card-checkbox');

    if (selectAllCheckbox.checked) {
        // Hepsini seç
        checkboxes.forEach(cb => {
            cb.checked = true;
            selectedUsers.add(cb.dataset.username);
            cb.closest('.user-card').classList.add('selected');
        });
    } else {
        // Hiçbirini seçme
        checkboxes.forEach(cb => {
            cb.checked = false;
            selectedUsers.delete(cb.dataset.username);
            cb.closest('.user-card').classList.remove('selected');
        });
    }

    updateSelectedCount();
}

function selectAll() {
    const checkboxes = document.querySelectorAll('.user-card-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = true;
        selectedUsers.add(cb.dataset.username);
        cb.closest('.user-card').classList.add('selected');
    });
    updateSelectedCount();
}

function selectNone() {
    const checkboxes = document.querySelectorAll('.user-card-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = false;
        selectedUsers.delete(cb.dataset.username);
        cb.closest('.user-card').classList.remove('selected');
    });
    updateSelectedCount();
}

function selectInverse() {
    const checkboxes = document.querySelectorAll('.user-card-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = !cb.checked;
        if (cb.checked) {
            selectedUsers.add(cb.dataset.username);
            cb.closest('.user-card').classList.add('selected');
        } else {
            selectedUsers.delete(cb.dataset.username);
            cb.closest('.user-card').classList.remove('selected');
        }
    });
    updateSelectedCount();
}

function startBulkUnfollow() {
    if (selectedUsers.size === 0) return;

    if (!confirm(`${selectedUsers.size} kişinin takibini bırakmak istediğinize emin misiniz?\n\nBu işlem sırayla ve otomatik olarak gerçekleştirilecektir.`)) {
        return;
    }

    // Önceki localStorage verilerini temizle
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        localStorage.removeItem('pendingUnfollow');
                        localStorage.removeItem('unfollowStartTime');
                        localStorage.removeItem('unfollowIsBulk');
                    }
                }).catch(() => {});
            }
        });
    });

    // Queue'yu hazırla
    unfollowQueue = Array.from(selectedUsers);
    isUnfollowing = true;
    unfollowPaused = false;

    // UI güncelle
    unfollowSelectedBtn.style.display = 'none';
    pauseUnfollowBtn.style.display = 'flex';
    pauseUnfollowBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
        </svg>
        Duraklat
    `;
    bulkProgress.style.display = 'block';

    updateStatus(`Toplu takip bırakma başladı: ${unfollowQueue.length} kişi`);

    // Seçilenleri üste al
    moveSelectedToTop();

    // İşlemi başlat
    processUnfollowQueue();
}

function moveSelectedToTop() {
    const allCards = Array.from(document.querySelectorAll('.user-card'));
    const selectedCards = [];
    const unselectedCards = [];

    allCards.forEach(card => {
        const checkbox = card.querySelector('.user-card-checkbox');
        if (checkbox && checkbox.checked) {
            selectedCards.push(card);
        } else {
            unselectedCards.push(card);
        }
    });

    // Önce seçilileri, sonra seçilmeyenleri ekle
    results.innerHTML = '';
    selectedCards.forEach(card => results.appendChild(card));
    unselectedCards.forEach(card => results.appendChild(card));
}

async function processUnfollowQueue() {
    if (!isUnfollowing || unfollowQueue.length === 0) {
        // İşlem tamamlandı
        finishBulkUnfollow();
        return;
    }

    if (unfollowPaused) {
        // Duraklatıldı, bekle
        return;
    }

    const username = unfollowQueue[0];
    const totalCount = Array.from(selectedUsers).length;
    const remaining = unfollowQueue.length;
    const processed = totalCount - remaining;

    // Progress güncelle
    updateBulkProgress(processed, totalCount);

    // Kullanıcı kartını işaretle ve status güncelle
    const userCard = document.querySelector(`.user-card-checkbox[data-username="${username}"]`)?.closest('.user-card');
    if (userCard) {
        userCard.classList.add('processing');
        updateUserCardStatus(userCard, 'processing', `İşleniyor... (${processed + 1}/${totalCount})`);
    }
    
    // Twitter tab'ını bul
    chrome.tabs.query({}, (tabs) => {
        const twitterTab = tabs.find(tab =>
            tab.url && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))
        );
        
        if (!twitterTab) {
            unfollowQueue.shift();
            setTimeout(() => processUnfollowQueue(), 1000);
            return;
        }
        
        // Unfollow mesajı gönder
        chrome.tabs.sendMessage(twitterTab.id, {
            action: 'unfollowUserBulk',
            username: username
        }, (response) => {
            // İlk response - sadece işlem başladı bildirimi
            // Gerçek response runtime.onMessage'dan gelecek
        });
    });
}

function updateBulkProgress(processed, total) {
    const percent = Math.round((processed / total) * 100);
    bulkProgressText.textContent = `${processed} / ${total}`;
    bulkProgressPercent.textContent = `${percent}%`;
    bulkProgressBar.style.width = `${percent}%`;
}

function updateUserCardStatus(userCard, status, message) {
    const statusDiv = userCard.querySelector('.user-status');
    if (!statusDiv) return;

    statusDiv.style.display = 'flex';

    let icon = '';
    let className = '';

    switch(status) {
        case 'processing':
            className = 'status-processing';
            icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>';
            break;
        case 'success':
            className = 'status-success';
            icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
            break;
        case 'error':
            className = 'status-error';
            icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
            break;
        case 'suspended':
            className = 'status-suspended';
            icon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
            break;
    }

    statusDiv.className = `user-status ${className}`;
    statusDiv.innerHTML = `${icon}<span>${message}</span>`;
}

function togglePauseUnfollow() {
    unfollowPaused = !unfollowPaused;

    if (unfollowPaused) {
        pauseUnfollowBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Devam Et
        `;
        updateStatus('Toplu takip bırakma duraklatıldı');
    } else {
        pauseUnfollowBtn.innerHTML = `
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
            </svg>
            Duraklat
        `;
        updateStatus('Toplu takip bırakma devam ediyor');
        processUnfollowQueue();
    }
}

function finishBulkUnfollow() {
    isUnfollowing = false;
    unfollowPaused = false;

    unfollowSelectedBtn.style.display = 'flex';
    pauseUnfollowBtn.style.display = 'none';
    bulkProgress.style.display = 'none';

    // Seçimi temizle
    selectedUsers.clear();
    document.querySelectorAll('.user-card-checkbox').forEach(cb => {
        cb.checked = false;
        cb.closest('.user-card')?.classList.remove('selected');
    });
    updateSelectedCount();

    updateStatus('Toplu takip bırakma tamamlandı!');

    // Listeyi güncelle
    chrome.storage.local.get(['unfollowers'], (result) => {
        if (result.unfollowers && result.unfollowers.length > 0) {
            displayResults(result.unfollowers);
        } else {
            displayResults([]);
        }
    });
}
