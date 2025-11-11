// Popup script with timeline
let isScanning = false;
const timeline = [];

document.getElementById('scanBtn').addEventListener('click', startScan);
document.getElementById('stopBtn').addEventListener('click', stopScan);
document.getElementById('clearBtn').addEventListener('click', clearData);

// Chrome storage'dan sonuçları yükle
chrome.storage.local.get(['unfollowers', 'lastScan'], (result) => {
    if (result.unfollowers && result.lastScan) {
        displayResults(result.unfollowers);
        const lastScanDate = new Date(result.lastScan);
        updateStatus(`Son tarama: ${lastScanDate.toLocaleString('tr-TR')}`);
        document.getElementById('clearBtn').style.display = 'block';
    }
});

function addToTimeline(message, type = 'info') {
    const time = new Date().toLocaleTimeString('tr-TR');
    const item = { time, message, type };
    timeline.push(item);
    
    const timelineDiv = document.getElementById('timeline');
    timelineDiv.style.display = 'block';
    
    const itemDiv = document.createElement('div');
    itemDiv.className = `timeline-item ${type}`;
    itemDiv.innerHTML = `<span class="time">${time}</span> ${message}`;
    
    timelineDiv.appendChild(itemDiv);
    timelineDiv.scrollTop = timelineDiv.scrollHeight;
    
    // Console'a da yaz
    console.log(`[${time}] ${message}`);
}

function clearTimeline() {
    const timelineDiv = document.getElementById('timeline');
    timelineDiv.innerHTML = '';
    timelineDiv.style.display = 'none';
    timeline.length = 0;
}

function startScan() {
    if (isScanning) return;
    
    isScanning = true;
    clearTimeline();
    document.getElementById('scanBtn').style.display = 'none';
    document.getElementById('stopBtn').style.display = 'block';
    document.getElementById('clearBtn').style.display = 'none';
    document.getElementById('progress').style.display = 'block';
    document.getElementById('results').style.display = 'none';
    document.getElementById('stats').style.display = 'none';
    
    addToTimeline('Tarama başlatılıyor...', 'info');
    updateStatus('Twitter sayfasına bağlanılıyor...');
    
    // Active tab'a mesaj gönder
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        const currentTab = tabs[0];
        
        // Twitter'da mı kontrol et
        if (!currentTab.url.includes('twitter.com') && !currentTab.url.includes('x.com')) {
            addToTimeline('Hata: Twitter sayfasında değilsiniz!', 'error');
            updateStatus('Lütfen Twitter.com veya X.com\'a gidin');
            resetUI();
            return;
        }
        
        addToTimeline(`Tab bulundu: ${currentTab.title}`, 'success');
        addToTimeline('Content script\'e mesaj gönderiliyor...', 'info');
        
        chrome.tabs.sendMessage(currentTab.id, {action: 'startScan'}, (response) => {
            if (chrome.runtime.lastError) {
                addToTimeline(`Bağlantı hatası: ${chrome.runtime.lastError.message}`, 'error');
                updateStatus('Hata: Sayfa yenileniyor, lütfen tekrar deneyin');
                resetUI();
                
                // Sayfayı yenile
                chrome.tabs.reload(currentTab.id);
            } else {
                addToTimeline('Content script bağlantısı başarılı', 'success');
            }
        });
    });
}

function stopScan() {
    addToTimeline('Tarama durduruluyor...', 'info');
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {action: 'stopScan'});
    });
    resetUI();
    updateStatus('Tarama durduruldu.');
}

function clearData() {
    if (confirm('Tüm tarama verilerini silmek istediğinize emin misiniz?')) {
        chrome.storage.local.remove(['unfollowers', 'lastScan'], () => {
            document.getElementById('results').style.display = 'none';
            document.getElementById('stats').style.display = 'none';
            document.getElementById('clearBtn').style.display = 'none';
            clearTimeline();
            updateStatus('Veriler temizlendi.');
        });
    }
}

function resetUI() {
    isScanning = false;
    document.getElementById('scanBtn').style.display = 'block';
    document.getElementById('stopBtn').style.display = 'none';
    document.getElementById('progress').style.display = 'none';
    document.getElementById('progressBar').style.width = '0%';
    
    // Eğer sonuç varsa temizle butonunu göster
    chrome.storage.local.get(['unfollowers'], (result) => {
        if (result.unfollowers && result.unfollowers.length > 0) {
            document.getElementById('clearBtn').style.display = 'block';
        }
    });
}

function updateStatus(message) {
    document.getElementById('status').textContent = message;
}

function updateProgress(percent) {
    document.getElementById('progressBar').style.width = percent + '%';
}

function displayResults(unfollowers) {
    const resultsDiv = document.getElementById('results');
    const statsDiv = document.getElementById('stats');
    
    if (unfollowers.length === 0) {
        addToTimeline('Harika! Tüm takip ettikleriniz sizi takip ediyor! 🎉', 'success');
        updateStatus('Harika! Tüm takip ettikleriniz sizi takip ediyor! 🎉');
        
        resultsDiv.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🎉</div>
                <div>Tebrikler! Herkes sizi takip ediyor.</div>
            </div>
        `;
        resultsDiv.style.display = 'block';
        resetUI();
        return;
    }
    
    // İstatistikleri göster
    statsDiv.style.display = 'flex';
    
    resultsDiv.innerHTML = '<h3>Sizi takip etmeyenler:</h3>';
    resultsDiv.style.display = 'block';
    
    addToTimeline(`${unfollowers.length} kişi sizi takip etmiyor`, 'info');
    
    unfollowers.forEach((user, index) => {
        const userDiv = document.createElement('div');
        userDiv.className = 'user-item';
        userDiv.innerHTML = `
            <div class="user-info">
                <div class="user-avatar">👤</div>
                <span class="username" onclick="window.open('https://twitter.com/${user.username}', '_blank')">@${user.username}</span>
            </div>
            <button class="unfollow-btn" onclick="unfollowUser('${user.username}', ${index})">
                Takibi Bırak
            </button>
        `;
        resultsDiv.appendChild(userDiv);
    });
    
    document.getElementById('notFollowingBack').textContent = unfollowers.length;
    resetUI();
}

// Content script'ten gelen mesajları dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateProgress') {
        updateProgress(request.percent);
        updateStatus(request.message);
        
        // Timeline'a ekle
        if (request.message.includes('analiz ediliyor') || request.message.includes('kontrol edildi')) {
            const match = request.message.match(/(\d+) kişi kontrol edildi, (\d+) takip etmeyen/);
            if (match) {
                document.getElementById('stats').style.display = 'flex';
                document.getElementById('followingCount').textContent = match[1];
                document.getElementById('notFollowingBack').textContent = match[2];
            }
        }
    } else if (request.action === 'scanComplete') {
        addToTimeline('Tarama tamamlandı!', 'success');
        
        // İstatistikleri logla
        const following = request.stats?.following || 0;
        const notFollowers = request.unfollowers.length;
        
        addToTimeline(`Toplam kontrol edilen: ${following} kişi`, 'info');
        addToTimeline(`Sizi takip etmeyen: ${notFollowers} kişi`, 'info');
        
        // Stats güncelle
        document.getElementById('stats').style.display = 'flex';
        document.getElementById('followingCount').textContent = following;
        document.getElementById('notFollowingBack').textContent = notFollowers;
        
        displayResults(request.unfollowers);
        updateStatus(`Tarama tamamlandı! ${request.unfollowers.length} kişi sizi takip etmiyor.`);
        
        // Sonuçları kaydet
        chrome.storage.local.set({
            unfollowers: request.unfollowers,
            lastScan: new Date().toISOString()
        });
    } else if (request.action === 'error') {
        addToTimeline(`Hata: ${request.message}`, 'error');
        updateStatus(`Hata: ${request.message}`);
        resetUI();
    } else if (request.action === 'unfollowSuccess') {
        addToTimeline(`@${request.username} takipten çıkarıldı`, 'success');
        updateStatus(`@${request.username} takipten çıkarıldı.`);
    } else if (request.action === 'log') {
        // Content script'ten gelen log mesajları
        addToTimeline(request.message, request.type || 'info');
    }
});

// Global unfollow fonksiyonu
window.unfollowUser = function(username, index) {
    if (!confirm(`@${username} kullanıcısını takipten çıkarmak istediğinize emin misiniz?`)) {
        return;
    }
    
    addToTimeline(`@${username} takipten çıkarılıyor...`, 'info');
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, {
            action: 'unfollowUser',
            username: username
        }, (response) => {
            if (response && response.success) {
                // UI'dan kullanıcıyı kaldır
                const userItems = document.querySelectorAll('.user-item');
                userItems[index].style.opacity = '0.5';
                userItems[index].querySelector('.unfollow-btn').disabled = true;
                userItems[index].querySelector('.unfollow-btn').textContent = 'Çıkarıldı';
                
                // Storage'ı güncelle
                chrome.storage.local.get(['unfollowers'], (result) => {
                    const updated = result.unfollowers.filter(u => u.username !== username);
                    chrome.storage.local.set({unfollowers: updated});
                    
                    document.getElementById('notFollowingBack').textContent = updated.length;
                    
                    if (updated.length === 0) {
                        displayResults([]);
                    }
                });
            }
        });
    });
};

// Sayfa yüklendiğinde son durumu kontrol et
window.addEventListener('load', () => {
    // Eğer aktif tarama varsa durumu göster
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        if (tabs[0] && (tabs[0].url.includes('twitter.com') || tabs[0].url.includes('x.com'))) {
            // Content script'e durum sorgusu gönder
            chrome.tabs.sendMessage(tabs[0].id, {action: 'getStatus'}, (response) => {
                if (response && response.isScanning) {
                    isScanning = true;
                    document.getElementById('scanBtn').style.display = 'none';
                    document.getElementById('stopBtn').style.display = 'block';
                    document.getElementById('progress').style.display = 'block';
                    document.getElementById('timeline').style.display = 'block';
                    
                    addToTimeline('Devam eden tarama algılandı', 'info');
                    updateStatus('Tarama devam ediyor...');
                }
            });
        }
    });
});
