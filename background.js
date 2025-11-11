// Background script - Extension'ın arka planda çalışan kısmı

// Extension icon'una tıklandığında dashboard'u aç
chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({
        url: chrome.runtime.getURL('index.html')
    });
});

// Duplicate relay önleme için son mesajları takip et
const recentMessages = new Map();

// Mesaj yönlendirme sistemi
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('[BACKGROUND] Mesaj alındı:', request.action, 'from:', sender.tab ? `tab ${sender.tab.id}` : 'extension page');

    // Dashboard'a geçiş mesajı
    if (request.action === 'switchToDashboard') {
        chrome.tabs.query({url: chrome.runtime.getURL('index.html')}, (tabs) => {
            if (tabs && tabs.length > 0) {
                chrome.tabs.update(tabs[0].id, { active: true });
                console.log('[BACKGROUND] Dashboard aktif yapıldı:', tabs[0].id);
            }
        });
        sendResponse({received: true});
        return true;
    }

    // Content script'ten gelen mesajları tüm extension sayfalarına yayınla
    if (sender.tab && ['log', 'updateProgress', 'scanComplete', 'unfollowSuccess', 'bulkUnfollowComplete', 'error'].includes(request.action)) {

        // Duplicate mesaj kontrolü - aynı mesaj 100ms içinde tekrar geldiyse ignore et
        const messageKey = `${request.action}_${request.username || ''}_${Date.now()}`;
        const now = Date.now();

        // 100ms içinde aynı action+username varsa duplicate
        for (const [key, timestamp] of recentMessages.entries()) {
            if (now - timestamp < 100 && key.startsWith(`${request.action}_${request.username || ''}`)) {
                console.log('[BACKGROUND] ⚠️ Duplicate mesaj engellendi:', request.action, request.username);
                sendResponse({received: true, duplicate: true});
                return true;
            }
        }

        recentMessages.set(messageKey, now);

        // Eski mesajları temizle (1 saniyeden eski)
        for (const [key, timestamp] of recentMessages.entries()) {
            if (now - timestamp > 1000) {
                recentMessages.delete(key);
            }
        }

        console.log('[BACKGROUND] Content script mesajı yayınlanıyor:', request.action);

        // Tüm extension tab'larını bul (dashboard)
        chrome.tabs.query({url: chrome.runtime.getURL('index.html')}, (tabs) => {
            tabs.forEach(tab => {
                console.log('[BACKGROUND] Dashboard\'a gönderiliyor:', tab.id, request.action);
                chrome.tabs.sendMessage(tab.id, request).catch(err => {
                    console.log('[BACKGROUND] Dashboard mesaj hatası:', err);
                });
            });
        });
    }

    sendResponse({received: true});
    return true;
});

// Extension kurulunca
chrome.runtime.onInstalled.addListener(() => {
    console.log('Twitter Takip Edilmeyen Bulucu kuruldu!');
});
