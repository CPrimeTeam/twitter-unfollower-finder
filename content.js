// Twitter Takip Edilmeyen Bulucu - Content Script (Tek Sayfa)

// Duplicate script injection önleme - HARD STOP
if (window.twitterUnfollowerContentScriptLoaded) {
    console.log('⚠️ Content script zaten yüklü, duplicate injection engellendi');
    // Return etmek yerine throw ile script execution'ı tamamen durdur
    throw new Error('Content script already loaded');
}

// Global flag - bu script yüklü
window.twitterUnfollowerContentScriptLoaded = true;
console.log('✓ Content script ilk kez yükleniyor');

let scanState = {
    isScanning: false,
    notFollowingBack: []
};

// Aynı anda birden fazla unfollow işlemini engelle
let currentlyProcessingUnfollow = null;

// Mesajları dinle - sadece bir kere listener ekle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Content script mesaj aldı:', request.action);

    if (request.action === 'ping') {
        // Content script'in yüklü olduğunu doğrula
        sendResponse({pong: true});
    } else if (request.action === 'startScan') {
        startScan();
        sendResponse({received: true});
    } else if (request.action === 'stopScan') {
        scanState.isScanning = false;
        sendLog('Tarama kullanıcı tarafından durduruldu', 'info');
        sendResponse({received: true});
    } else if (request.action === 'unfollowUser') {
        unfollowUser(request.username, false);
        sendResponse({received: true});
    } else if (request.action === 'unfollowUserBulk') {
        // Bulk unfollow - işlem bitince bildirim gönderecek
        unfollowUser(request.username, true);
        sendResponse({received: true});
    } else if (request.action === 'getStatus') {
        sendResponse({isScanning: scanState.isScanning});
    } else {
        sendResponse({received: true});
    }

    return true;
});

// Twitter sayfasında progress göstergesi oluştur
function createTwitterProgressOverlay() {
    // Önceki overlay varsa kaldır
    const existing = document.getElementById('twitter-scan-progress');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'twitter-scan-progress';
    overlay.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); z-index: 99999; padding: 20px; box-shadow: 0 4px 24px rgba(0,0,0,0.3); border-bottom: 2px solid #3b82f6;">
            <div style="max-width: 800px; margin: 0 auto;">
                <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
                    <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center; animation: pulse 2s ease-in-out infinite;">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <path d="M21 21l-4.35-4.35"/>
                        </svg>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-size: 18px; font-weight: 700; color: white; margin-bottom: 4px;">Takip Analizi Yapılıyor</div>
                        <div id="scan-status-text" style="font-size: 14px; color: #94a3b8;">Başlatılıyor...</div>
                    </div>
                    <button id="stop-scan-btn" style="padding: 10px 20px; background: #ef4444; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px;">
                        Durdur
                    </button>
                </div>
                <div style="background: rgba(59, 130, 246, 0.1); height: 8px; border-radius: 100px; overflow: hidden;">
                    <div id="scan-progress-bar" style="height: 100%; background: linear-gradient(90deg, #3b82f6 0%, #8b5cf6 100%); border-radius: 100px; width: 0%; transition: width 0.3s ease; position: relative; overflow: hidden;">
                        <div style="position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); animation: shimmer 1.5s infinite;"></div>
                    </div>
                </div>
            </div>
        </div>
        <style>
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.05); }
            }
            @keyframes shimmer {
                0% { transform: translateX(-100%); }
                100% { transform: translateX(100%); }
            }
        </style>
    `;

    document.body.appendChild(overlay);

    // Durdur butonuna event ekle
    document.getElementById('stop-scan-btn').addEventListener('click', () => {
        scanState.isScanning = false;
        overlay.remove();
    });

    return overlay;
}

function updateTwitterProgress(percent, text) {
    const statusText = document.getElementById('scan-status-text');
    const progressBar = document.getElementById('scan-progress-bar');

    if (statusText) statusText.textContent = text;
    if (progressBar) progressBar.style.width = percent + '%';
}

function removeTwitterProgressOverlay() {
    const overlay = document.getElementById('twitter-scan-progress');
    if (overlay) {
        overlay.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => overlay.remove(), 300);
    }
}

// Ana tarama fonksiyonu
async function startScan() {
    console.log('Tarama başlatılıyor...');
    sendLog('Tarama başlatıldı', 'info');

    // Twitter sayfasında progress göster
    createTwitterProgressOverlay();

    // State'i sıfırla
    scanState = {
        isScanning: true,
        notFollowingBack: []
    };

    try {
        // Kullanıcı adını bul
        sendLog('Kullanıcı adı aranıyor...', 'info');
        const username = await findUsername();
        if (!username) {
            throw new Error('Kullanıcı adı bulunamadı. Twitter\'a giriş yaptığınızdan emin olun!');
        }
        
        sendLog(`Kullanıcı bulundu: @${username}`, 'success');
        
        // Following sayfasına git
        if (!window.location.pathname.includes(`/${username}/following`)) {
            sendLog('Following sayfasına yönlendiriliyor...', 'info');
            updateTwitterProgress(5, 'Following sayfasına yönlendiriliyor...');

            // Sayfa yenilenecek, taramayı orada başlat
            localStorage.setItem('twitterScanPending', 'true');
            localStorage.setItem('twitterScanUsername', username);

            window.location.href = `https://twitter.com/${username}/following`;
            return;
        }

        // Following verilerini topla ve analiz et
        updateProgress(10, 'Takip edilenler analiz ediliyor...');
        updateTwitterProgress(10, 'Takip edilenler analiz ediliyor...');
        await scanFollowingList();
        
    } catch (error) {
        console.error('Tarama hatası:', error);
        sendLog(error.message, 'error');
        sendMessage('error', error.message);
    }
}

// Kullanıcı bilgilerini çıkar
function extractUserInfo(cell, username) {
    const userInfo = {
        username: username,
        displayName: '',
        avatar: '',
        followers: '',
        following: '',
        bio: ''
    };

    try {
        // Display name (gerçek isim) - ilk span[dir="ltr"]
        const displayNameSpans = cell.querySelectorAll('span[dir="ltr"]');
        if (displayNameSpans.length > 0) {
            userInfo.displayName = displayNameSpans[0].textContent.trim();
        }

        // Avatar (profil resmi)
        const avatarImg = cell.querySelector('img[alt][src*="profile"], img[alt][src*="pbs.twimg.com"]');
        if (avatarImg) {
            userInfo.avatar = avatarImg.src;
        }

        // Takipçi ve takip sayılarını daha akıllı parse et
        // Twitter'da format: "1,234 Followers" veya "1.2K Following" şeklinde
        const allSpans = cell.querySelectorAll('span');

        allSpans.forEach((span, index) => {
            const text = span.textContent.trim();
            const nextSpan = allSpans[index + 1];
            const nextText = nextSpan ? nextSpan.textContent.trim().toLowerCase() : '';

            // Sayı formatını kontrol et (123, 1.2K, 1,234 gibi)
            if (/^[\d,\.]+[KMB]?$/.test(text)) {
                // Bir sonraki span "Followers" veya "Takipçi" içeriyorsa
                if (nextText.includes('follower') || nextText.includes('takipçi')) {
                    userInfo.followers = text;
                }
                // Bir sonraki span "Following" veya "Takip edilen" içeriyorsa
                else if (nextText.includes('following') || (nextText.includes('takip') && !nextText.includes('takipçi'))) {
                    userInfo.following = text;
                }
            }
        });

        // Alternatif yöntem: Regex ile direkt ara
        if (!userInfo.followers || !userInfo.following) {
            const cellText = cell.textContent;

            // Followers regex
            const followersRegex = /([\d,\.]+[KMB]?)\s*(Followers?|Takipçi)/i;
            const followersMatch = cellText.match(followersRegex);
            if (followersMatch && !userInfo.followers) {
                userInfo.followers = followersMatch[1];
            }

            // Following regex
            const followingRegex = /([\d,\.]+[KMB]?)\s*(Following|Takip\s+edilen)/i;
            const followingMatch = cellText.match(followingRegex);
            if (followingMatch && !userInfo.following) {
                userInfo.following = followingMatch[1];
            }
        }

        // Bio çıkarma - UserCell içindeki açıklama kısmı
        const userCell = cell.querySelector('[data-testid="UserCell"]');
        if (userCell) {
            // Bio genelde 3. veya 4. div'de oluyor
            const divs = userCell.querySelectorAll(':scope > div > div');
            if (divs.length >= 2) {
                const possibleBio = divs[1].textContent.trim();
                // Bio'nun kullanıcı adı, display name, followers/following içermemesi lazım
                if (possibleBio &&
                    !possibleBio.includes(username) &&
                    !possibleBio.includes('Followers') &&
                    !possibleBio.includes('Following') &&
                    !possibleBio.includes('Takipçi') &&
                    !possibleBio.includes('Follows you') &&
                    !possibleBio.includes('Seni takip ediyor')) {
                    userInfo.bio = possibleBio;
                }
            }
        }

        // Debug log
        if (userInfo.followers || userInfo.following) {
            console.log(`@${username}:`, {
                followers: userInfo.followers,
                following: userInfo.following
            });
        }

    } catch (e) {
        console.error('Kullanıcı bilgileri çıkarılırken hata:', e);
    }

    return userInfo;
}

// Following listesini tara
async function scanFollowingList() {
    console.log('Following listesi taranıyor...');
    sendLog('Takip listesi analizi başladı', 'info');

    let totalFollowing = 0;
    let notFollowingCount = 0;
    let previousHeight = 0;
    let stuckCount = 0;
    let scrollCount = 0;
    let lastLoggedCount = 0;

    // İlk yüklemeyi bekle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Tarama durumunu storage'a kaydet
    chrome.storage.local.set({
        scanInProgress: true,
        scanData: {
            totalFollowing: 0,
            notFollowingCount: 0,
            unfollowers: []
        }
    });
    
    while (scanState.isScanning && scrollCount < 100) {
        // Tüm kullanıcı hücrelerini bul
        const userCells = document.querySelectorAll('[data-testid="cellInnerDiv"]');
        
        userCells.forEach(cell => {
            try {
                // Kullanıcı linkini bul
                const userLink = cell.querySelector('a[role="link"][href^="/"]');
                if (!userLink) return;

                const href = userLink.getAttribute('href');
                if (!href || !href.match(/^\/[^\/]+$/) || href.includes('/status/')) return;

                const username = href.substring(1);

                // Geçerli kullanıcı mı kontrol et
                if (!username || username.includes('?') ||
                    ['home', 'explore', 'notifications', 'messages'].includes(username)) return;

                // Bu kullanıcıyı daha önce işledik mi?
                if (scanState.notFollowingBack.some(u => u.username === username)) return;

                // Kullanıcı bilgilerini topla
                const userInfo = extractUserInfo(cell, username);

                // "Follows you" veya "Seni takip ediyor" yazısını ara
                const followsYouText = cell.textContent.includes('Follows you') ||
                                      cell.textContent.includes('Seni takip ediyor');

                totalFollowing++;

                if (!followsYouText) {
                    // Bizi takip etmiyor
                    scanState.notFollowingBack.push(userInfo);
                    notFollowingCount++;
                    console.log(`Takip etmeyen bulundu: @${username}`, userInfo);

                    // Her 10 kişide bir log
                    if (notFollowingCount % 10 === 0) {
                        sendLog(`${notFollowingCount} takip etmeyen bulundu`, 'info');
                    }
                }

            } catch (e) {
                console.error('Hata:', e);
            }
        });

        // Progress update
        const progress = Math.min(10 + (scrollCount * 0.9), 95);
        const statusText = `${totalFollowing} kişi kontrol edildi • ${notFollowingCount} takip etmeyen bulundu`;
        updateProgress(progress, statusText);
        updateTwitterProgress(progress, statusText);

        // Storage'ı güncelle (her 5 scroll'da bir)
        if (scrollCount % 5 === 0) {
            chrome.storage.local.set({
                scanInProgress: true,
                scanData: {
                    totalFollowing: totalFollowing,
                    notFollowingCount: notFollowingCount,
                    unfollowers: scanState.notFollowingBack
                }
            });
        }
        
        // Sayfa sonuna ulaştık mı?
        const currentHeight = document.documentElement.scrollHeight;
        if (currentHeight === previousHeight) {
            stuckCount++;
            if (stuckCount > 3) {
                console.log('Sayfa sonu. Tarama tamamlandı.');
                sendLog(`Tarama tamamlandı. Toplam ${totalFollowing} kişi kontrol edildi`, 'success');
                break;
            }
        } else {
            stuckCount = 0;
            previousHeight = currentHeight;
        }
        
        // Scroll yap
        window.scrollTo(0, document.documentElement.scrollHeight);
        
        // Yeni içeriğin yüklenmesini bekle
        await new Promise(resolve => setTimeout(resolve, 1500));
        scrollCount++;
    }
    
    // Sonuçları gönder
    sendLog(`Analiz tamamlandı: ${notFollowingCount} kişi sizi takip etmiyor`, 'success');

    const finalData = {
        unfollowers: scanState.notFollowingBack,
        stats: {
            following: totalFollowing,
            notFollowingBack: notFollowingCount
        }
    };

    // Twitter overlay'de başarı göster
    updateTwitterProgress(100, `✓ Tamamlandı! ${totalFollowing} kişi kontrol edildi, ${notFollowingCount} takip etmeyen bulundu`);

    setTimeout(() => {
        const overlayDiv = document.querySelector('#twitter-scan-progress > div');
        if (overlayDiv) {
            overlayDiv.innerHTML = `
                <div style="max-width: 800px; margin: 0 auto; text-align: center;">
                    <div style="width: 80px; height: 80px; margin: 0 auto 20px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; animation: successPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3">
                            <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                            <polyline points="22 4 12 14.01 9 11.01"/>
                        </svg>
                    </div>
                    <div style="font-size: 24px; font-weight: 800; color: white; margin-bottom: 8px;">Tarama Tamamlandı! 🎉</div>
                    <div style="font-size: 16px; color: #94a3b8; margin-bottom: 16px;">${totalFollowing} kişi kontrol edildi • ${notFollowingCount} takip etmeyen bulundu</div>
                    <div style="font-size: 14px; color: #22c55e;">Dashboard'a yönlendiriliyorsunuz...</div>
                </div>
                <style>
                    @keyframes successPop {
                        0% { transform: scale(0) rotate(-180deg); }
                        60% { transform: scale(1.2) rotate(10deg); }
                        100% { transform: scale(1) rotate(0deg); }
                    }
                </style>
            `;
        }

        // 2 saniye sonra overlay'i kaldır ve dashboard'a geç
        setTimeout(() => {
            removeTwitterProgressOverlay();

            // Overlay kapandıktan sonra dashboard'a geçmek için mesaj gönder
            setTimeout(() => {
                chrome.runtime.sendMessage({
                    action: 'switchToDashboard'
                });
            }, 300);
        }, 2000);
    }, 500);

    sendMessage('scanComplete', finalData);

    // Storage'a final durumu kaydet
    chrome.storage.local.set({
        scanInProgress: false,
        scanComplete: true,
        scanData: finalData
    });

    scanState.isScanning = false;
    localStorage.removeItem('twitterScanPending');
}

// Kullanıcı adını bul
async function findUsername() {
    // URL'den kontrol et
    const pathParts = window.location.pathname.split('/');
    if (pathParts[1] && !['home', 'explore', 'notifications', 'messages', 'i', 'settings'].includes(pathParts[1])) {
        return pathParts[1];
    }
    
    // Profil linkinden al
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const profileLink = document.querySelector('a[data-testid="AppTabBar_Profile_Link"]');
    if (profileLink) {
        const href = profileLink.getAttribute('href');
        if (href) return href.substring(1);
    }
    
    // Avatar menüden al
    const avatarBtn = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    if (avatarBtn) {
        avatarBtn.click();
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const userCell = document.querySelector('[data-testid="AccountSwitcher_Logout_Button"]');
        if (userCell) {
            const accountInfo = userCell.closest('[role="group"]');
            const usernameSpan = accountInfo?.querySelector('div[dir="ltr"] span');
            if (usernameSpan && usernameSpan.textContent.startsWith('@')) {
                const username = usernameSpan.textContent.substring(1);
                document.body.click();
                return username;
            }
        }
    }
    
    return null;
}

// Progress bildirimi
function updateProgress(percent, message) {
    sendMessage('updateProgress', {
        percent: percent,
        message: message
    });
}

// Mesaj gönderme
function sendMessage(action, data) {
    const message = {
        action: action,
        ...data
    };
    console.log('[CONTENT] Mesaj gönderiliyor:', action, data);
    chrome.runtime.sendMessage(message).then(() => {
        console.log('[CONTENT] Mesaj gönderildi:', action);
    }).catch(err => {
        console.error('[CONTENT] Mesaj gönderilemedi:', action, err);
    });
}

// Log mesajı gönderme
function sendLog(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    sendMessage('log', { message, type });
}

// Unfollow işlemi
async function unfollowUser(username, isBulk = false) {
    try {
        // Eğer aynı kullanıcı için işlem zaten devam ediyorsa, atla
        if (currentlyProcessingUnfollow === username) {
            console.log(`@${username} için işlem zaten devam ediyor, duplicate atlanıyor`);
            return;
        }

        currentlyProcessingUnfollow = username;

        const currentPendingUnfollow = localStorage.getItem('pendingUnfollow');
        const unfollowStartTime = localStorage.getItem('unfollowStartTime');
        const now = Date.now();

        // Eğer 30 saniyeden fazla sürüyorsa işlemi iptal et
        if (unfollowStartTime && (now - parseInt(unfollowStartTime)) > 30000) {
            console.log(`@${username} için timeout, işlem iptal ediliyor...`);
            sendLog(`@${username} için işlem zaman aşımına uğradı`, 'error');
            const action = isBulk ? 'bulkUnfollowComplete' : 'unfollowSuccess';
            sendMessage(action, {username, success: false});
            localStorage.removeItem('pendingUnfollow');
            localStorage.removeItem('unfollowStartTime');
            localStorage.removeItem('unfollowIsBulk');
            currentlyProcessingUnfollow = null;
            return;
        }

        // Eğer kullanıcı profiline gitmemiz gerekiyorsa
        if (!window.location.pathname.includes(`/${username}`)) {
            // Sadece pendingUnfollow varsa ve aynı kullanıcıysa git
            if (currentPendingUnfollow !== username) {
                sendLog(`@${username} takipten çıkarılıyor...`, 'info');
                localStorage.setItem('pendingUnfollow', username);
                localStorage.setItem('unfollowStartTime', Date.now().toString());
                localStorage.setItem('unfollowIsBulk', isBulk ? 'true' : 'false');
                window.location.href = `https://twitter.com/${username}`;
            }
            return;
        }

        // Profil sayfasındayız, eğer bu kullanıcı için işlem bekleniyorsa devam et
        if (currentPendingUnfollow !== username) {
            console.log(`@${username} için bekleyen işlem yok, atlanıyor...`);
            currentlyProcessingUnfollow = null;
            return;
        }

        sendLog(`@${username} profil sayfasında, işlem başlıyor...`, 'info');

        // Profil sayfasındayız, sayfanın yüklenmesini bekle
        await new Promise(resolve => setTimeout(resolve, 2500));

        // Askıya alınmış hesap kontrolü
        const suspendedText = document.body.textContent;
        if (suspendedText.includes('Account suspended') ||
            suspendedText.includes('Hesap askıya alındı') ||
            suspendedText.includes('This account doesn\'t exist')) {
            sendLog(`@${username} askıya alınmış veya silinmiş hesap`, 'error');
            sendMessage(isBulk ? 'bulkUnfollowComplete' : 'unfollowSuccess', {username, success: false, suspended: true});
            localStorage.removeItem('pendingUnfollow');
            localStorage.removeItem('unfollowStartTime');
            localStorage.removeItem('unfollowIsBulk');
            currentlyProcessingUnfollow = null;
            return;
        }

        // Following butonunu ara - daha spesifik selector
        let followingBtn = null;

        // Yöntem 1: data-testid ile (en güvenilir)
        // Ama text de kontrol et - "Follow" veya "Abone ol" ise yanlış buton
        const testIdBtn = document.querySelector('[data-testid$="-unfollow"]');
        if (testIdBtn) {
            const text = testIdBtn.textContent.toLowerCase().trim();
            // Eğer text "Follow" veya "Abone ol" değilse, doğru buton
            if (text !== 'follow' && text !== 'abone ol' && text !== 'takip et') {
                followingBtn = testIdBtn;
            } else {
                console.log('data-testid ile bulunan buton yanlış, text:', testIdBtn.textContent);
            }
        }

        // Yöntem 2: Aria-label öncelikli kontrol (EN GÜVENİLİR!)
        // "@username adlı kullanıcıyı takibi bırak" gibi
        if (!followingBtn) {
            followingBtn = Array.from(document.querySelectorAll('button'))
                .find(btn => {
                    const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();

                    // Aria-label'da "takibi bırak", "unfollow", "takipten çık" var mı?
                    // Bu en güvenilir yöntem çünkü Twitter burada açık yaziyor
                    const hasUnfollowAria = ariaLabel.includes('takibi bırak') ||
                                           ariaLabel.includes('unfollow') ||
                                           ariaLabel.includes('takipten çık') ||
                                           ariaLabel.includes('abonelikten çık');

                    return hasUnfollowAria;
                });
        }

        // Yöntem 2.5: Text içeriğine göre - son çare
        if (!followingBtn) {
            followingBtn = Array.from(document.querySelectorAll('button'))
                .find(btn => {
                    const text = btn.textContent.toLowerCase().trim();

                    // ÖNEMLİ: "Follow" veya "Abone ol" içeriyorsa BU DEĞİL!
                    // Bunlar takip etmediğin kişiler için
                    if (text === 'follow' || text === 'abone ol' || text === 'takip et') {
                        return false;
                    }

                    // Text kontrolü - sadece takip edilenler için:
                    // "Following" - normal takip
                    // "Takip ediliyor" - Türkçe normal
                    // "Subscribed" - abone olunmuş
                    // "Abone olundu" - Türkçe abone (GEÇMİŞ ZAMAN!)
                    const hasFollowingText = text === 'following' ||
                                            text === 'takip ediliyor' ||
                                            text === 'subscribed' ||
                                            text === 'abone olundu';

                    return hasFollowingText;
                });
        }

        // Yöntem 3: Profil sayfasındaki spesifik buton konumuna göre
        // Eğer hala bulamadıysak, profil header'ındaki butonları kontrol et
        if (!followingBtn) {
            const profileButtons = document.querySelectorAll('[data-testid="userActions"] button, [role="button"]');
            followingBtn = Array.from(profileButtons).find(btn => {
                const text = btn.textContent.toLowerCase().trim();
                // Sadece geçmiş zaman/durum bildiren butonlar
                // "Following", "Takip ediliyor", "Subscribed", "Abone olundu"
                // OLUMSUZ: "Follow", "Abone ol", "Takip et"
                return (text === 'following' ||
                       text === 'takip ediliyor' ||
                       text === 'subscribed' ||
                       text === 'abone olundu') &&
                       text !== 'follow' &&
                       text !== 'abone ol' &&
                       text !== 'takip et';
            });
        }

        if (!followingBtn) {
            sendLog(`@${username} için unfollow butonu bulunamadı`, 'error');
            console.log('Sayfa üzerindeki tüm butonlar:', Array.from(document.querySelectorAll('button')).map(b => b.textContent));
            sendMessage(isBulk ? 'bulkUnfollowComplete' : 'unfollowSuccess', {username, success: false});
            localStorage.removeItem('pendingUnfollow');
            localStorage.removeItem('unfollowStartTime');
            localStorage.removeItem('unfollowIsBulk');
            currentlyProcessingUnfollow = null;
            return;
        }

        // Butonu ve içeriğini logla
        console.log('Following butonu bulundu:', {
            text: followingBtn.textContent,
            ariaLabel: followingBtn.getAttribute('aria-label'),
            testId: followingBtn.getAttribute('data-testid')
        });

        // Butona tıkla
        followingBtn.click();
        sendLog('Unfollow butonuna tıklandı', 'info');

        // Dropdown menü veya onay popup'ını bekle
        await new Promise(resolve => setTimeout(resolve, 800));

        // Senaryo 1: Dropdown menü çıktı mı? (Abone olunmuş hesaplar için)
        // "@username adlı kişiyi takibi bırak" yazısı olan menuitem'ı ara
        let unfollowMenuItem = Array.from(document.querySelectorAll('[role="menuitem"]'))
            .find(item => {
                const text = item.textContent.toLowerCase();
                return text.includes('takibi bırak') || text.includes('unfollow');
            });

        if (unfollowMenuItem) {
            console.log('Dropdown menüde unfollow seçeneği bulundu:', unfollowMenuItem.textContent);
            sendLog('Dropdown menüden takibi bırak seçiliyor...', 'info');
            unfollowMenuItem.click();

            // Dropdown'dan sonra onay popup'ı gelebilir
            await new Promise(resolve => setTimeout(resolve, 800));
        }

        // Senaryo 2: Onay popup'ı (her iki durumda da gelebilir)
        const confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirmBtn) {
            console.log('Onay popup\'ı bulundu, onaylanıyor...');
            confirmBtn.click();
            await new Promise(resolve => setTimeout(resolve, 500));
            sendLog(`@${username} takipten çıkarıldı`, 'success');
            sendMessage(isBulk ? 'bulkUnfollowComplete' : 'unfollowSuccess', {username, success: true});
        } else if (unfollowMenuItem) {
            // Dropdown'dan tıkladık ama onay popup'ı çıkmadı
            // Bazı hesaplarda onay istemeyebilir
            sendLog(`@${username} takipten çıkarıldı`, 'success');
            sendMessage(isBulk ? 'bulkUnfollowComplete' : 'unfollowSuccess', {username, success: true});
        } else {
            sendLog('Dropdown veya onay butonu bulunamadı', 'error');
            console.log('Sayfadaki menuitem\'lar:', Array.from(document.querySelectorAll('[role="menuitem"]')).map(m => m.textContent));
            sendMessage(isBulk ? 'bulkUnfollowComplete' : 'unfollowSuccess', {username, success: false});
        }

        // İşlem tamamlandı, localStorage ve processing flag'i temizle
        localStorage.removeItem('pendingUnfollow');
        localStorage.removeItem('unfollowStartTime');
        localStorage.removeItem('unfollowIsBulk');
        currentlyProcessingUnfollow = null;

    } catch (error) {
        console.error('Unfollow hatası:', error);
        sendLog(`Unfollow hatası: ${error.message}`, 'error');
        sendMessage(isBulk ? 'bulkUnfollowComplete' : 'unfollowSuccess', {username, success: false});
        localStorage.removeItem('pendingUnfollow');
        localStorage.removeItem('unfollowStartTime');
        localStorage.removeItem('unfollowIsBulk');
        currentlyProcessingUnfollow = null;
    }
}

// Sayfa yüklendiğinde kontrol
window.addEventListener('load', () => {
    // ÖNCELİKLE bekleyen unfollow var mı kontrol et
    const pendingUnfollow = localStorage.getItem('pendingUnfollow');
    const unfollowStartTime = localStorage.getItem('unfollowStartTime');
    const unfollowIsBulk = localStorage.getItem('unfollowIsBulk');

    if (pendingUnfollow) {
        console.log('Bekleyen unfollow bulundu:', pendingUnfollow, 'isBulk:', unfollowIsBulk);

        // Eğer 5 dakikadan eski ise, temizle ve devam etme
        if (unfollowStartTime && (Date.now() - parseInt(unfollowStartTime)) > 300000) {
            console.log('Eski unfollow verisi bulundu, temizleniyor...');
            localStorage.removeItem('pendingUnfollow');
            localStorage.removeItem('unfollowStartTime');
            localStorage.removeItem('unfollowIsBulk');
        } else {
            // Unfollow varsa sadece onu yap, taramayı yapma
            setTimeout(() => {
                unfollowUser(pendingUnfollow, unfollowIsBulk === 'true');
            }, 1500);
            return; // Diğer işlemleri yapma
        }
    }

    // Unfollow yoksa tarama kontrolü yap
    const pendingScan = localStorage.getItem('twitterScanPending');
    if (pendingScan === 'true' && window.location.pathname.includes('/following')) {
        console.log('Bekleyen tarama bulundu, başlatılıyor...');
        const username = localStorage.getItem('twitterScanUsername');
        localStorage.removeItem('twitterScanPending');
        localStorage.removeItem('twitterScanUsername');

        // Overlay'i hemen göster
        createTwitterProgressOverlay();
        updateTwitterProgress(5, 'Following sayfası yüklendi, analiz başlıyor...');

        // Biraz bekle ve taramayı başlat
        setTimeout(() => {
            scanState.isScanning = true;
            sendLog('Following sayfası yüklendi, analiz başlıyor...', 'info');
            updateProgress(10, 'Takip edilenler analiz ediliyor...');
            updateTwitterProgress(10, 'Takip edilenler analiz ediliyor...');
            scanFollowingList();
        }, 1000);
    }
});
