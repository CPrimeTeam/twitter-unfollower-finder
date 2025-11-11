# Twitter Takip Edilmeyen Bulucu Chrome Eklentisi

Twitter'da (X) sizi takip etmeyen kullanıcıları kolayca bulun ve toplu takibi bırakma işlemi yapın.

> 💡 **Hızlı Başlangıç:** Bu eklenti ile Twitter'da hangi takip ettiğiniz kişilerin sizi takip etmediğini öğrenip, toplu şekilde takibi bırakabilirsiniz. Kurulumu 2 dakikadan kısa sürer!

## Özellikler

- ✅ Modern dashboard arayüzü
- ✅ Tek sayfada hızlı analiz (sadece Following listesi)
- ✅ "Seni takip ediyor" bilgisini otomatik kontrol eder
- ✅ Gerçek zamanlı tarama ilerlemesi
- ✅ Toplu takibi bırakma (checkbox ile seçim)
- ✅ Ayarlanabilir hız seçenekleri (0.5s - 2s arası)
- ✅ Tarama sonuçları otomatik kaydedilir
- ✅ Tarama bitince otomatik dashboard'a yönlendirme
- ✅ Kullanıcı arama ve filtreleme

## Nasıl Çalışır?

Twitter'da takip ettiğiniz kişilerin profillerinde "Seni takip ediyor" (Follows you) yazısı görünür. Eklenti bu bilgiyi kullanarak tek sayfada analiz yapar:

1. Following sayfanıza gider
2. Tüm takip ettiklerinizi tararken "Seni takip ediyor" yazısını kontrol eder
3. Bu yazısı olmayanları "takip etmeyen" olarak listeler

## Kurulum (3 Adımda Kurulum)

### Adım 1: Dosyaları İndirin
1. Bu sayfanın sağ tarafında yeşil **"Code"** butonuna tıklayın
2. **"Download ZIP"** seçeneğine tıklayın
3. İndirilen ZIP dosyasını bilgisayarınızda bir klasöre çıkartın (Masaüstü gibi)

### Adım 2: Chrome'a Yükleyin
1. **Google Chrome** tarayıcınızı açın
2. Adres çubuğuna `chrome://extensions/` yazıp Enter'a basın
3. Sağ üst köşedeki **"Geliştirici modu"** yazısının yanındaki düğmeyi açın (mavi olmalı)
4. Sol üstte çıkan **"Paketlenmemiş uzantı yükle"** butonuna tıklayın
5. ZIP'ten çıkardığınız klasörü seçin ve **"Klasörü Seç"** butonuna basın
6. Eklenti yüklendi! Chrome araç çubuğunda eklenti ikonu görünecek

### Adım 3: Kullanmaya Başlayın
1. **Twitter'a giriş yapın** (twitter.com veya x.com)
2. Chrome'da **eklenti ikonuna tıklayın** (sağ üstte, uzantılar arasında)
3. Açılan **Dashboard sayfasında** "Taramayı Başlat" butonuna basın
4. **Bekleyin:** Eklenti otomatik olarak:
   - Following sayfanıza gider
   - Tüm takip ettiklerinizi tarar
   - Sizi takip etmeyenleri bulur
   - Size geri Dashboard'a döner
5. **Sonuçları görün:** Dashboard'da sizi takip etmeyenler listelenir
6. **Toplu işlem yapın:**
   - İstediğiniz kişileri ✅ checkbox ile seçin
   - Hız ayarını seçin (Hızlı önerilir)
   - "Takibi Bırak" butonuna basın

✅ **Tarama bitince** otomatik olarak Dashboard'a yönlendirileceksiniz!

## Önemli Notlar

- Twitter'ın rate limiting politikaları nedeniyle çok hızlı işlem yapmayın
- Çok fazla kullanıcıyı kısa sürede takipten çıkarmak hesabınızın kısıtlanmasına neden olabilir
- Eklenti sadece açık hesaplarla çalışır
- İlk taramada biraz zaman alabilir (takipçi sayınıza bağlı olarak)

## Güvenlik

- Eklenti hiçbir kişisel verinizi toplamaz veya göndermez
- Tüm veriler yerel olarak Chrome storage'da saklanır
- Sadece Twitter.com domain'inde çalışır

## Sorun Giderme

### ❌ Eklenti çalışmıyor
- Twitter'a giriş yaptığınızdan emin olun
- Chrome'u yeniden başlatın
- Eklentiyi kaldırıp tekrar yükleyin

### ⏱️ Tarama çok uzun sürüyor
- Çok takip ettiğiniz kişi varsa normal olabilir
- "Durdur" butonuyla durdurup daha sonra devam edebilirsiniz

### 🚫 Takibi bırakma çalışmıyor
- Çok hızlı seçtiyseniz, "Normal" veya "Yavaş" deneyin
- Twitter rate limit uygulamış olabilir (birkaç saat bekleyin)

## Geliştirme

Kodu geliştirmek isterseniz:
- `content.js`: Twitter sayfasında çalışan ana mantık (tarama ve unfollow)
- `dashboard.js`: Dashboard sayfasının kontrolü
- `background.js`: Tab yönetimi ve mesaj iletimi
- `index.html` & `styles.css`: Dashboard arayüzü
- `manifest.json`: Eklenti yapılandırması

## Lisans

Bu proje eğitim amaçlı oluşturulmuştur. Twitter'ın kullanım koşullarına uygun şekilde kullanın.
