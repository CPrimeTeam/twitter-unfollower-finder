# Twitter Takip Edilmeyen Bulucu Chrome Eklentisi

Twitter'da (X) sizi takip etmeyen kullanıcıları kolayca bulun ve toplu takibi bırakma işlemi yapın.

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

## Kurulum

1. **Chrome'a Yükleme**:
   - Chrome'u açın ve `chrome://extensions/` adresine gidin
   - Sağ üst köşeden "Geliştirici modu"nu açın
   - "Paketlenmemiş uzantı yükle" butonuna tıklayın
   - Zip'ten çıkardığınız klasörü seçin

2. **Kullanım**:
   - Twitter'a (x.com) giriş yapın
   - Chrome araç çubuğundaki eklenti ikonuna tıklayın (Dashboard açılır)
   - "Taramayı Başlat" butonuna basın
   - Eklenti otomatik olarak:
     - Twitter Following sayfanıza yönlendirir
     - Takip ettiklerinizi tek tek tarar
     - "Seni takip ediyor" yazısını kontrol eder
     - Tarama bitince dashboard'a geri döner
   - Dashboard'da:
     - Checkbox ile istediğiniz kullanıcıları seçin
     - Hız ayarını belirleyin (Çok Hızlı/Hızlı/Normal/Yavaş)
     - "Takibi Bırak" butonuna basın

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

**"Hata: Twitter sayfasında olduğunuzdan emin olun!" mesajı alıyorsanız:**
- Twitter'a giriş yaptığınızdan emin olun
- twitter.com veya x.com adresinde olduğunuzdan emin olun

**Tarama çok uzun sürüyorsa:**
- Çok fazla takipçiniz varsa normal olabilir
- "Durdur" butonuyla işlemi sonlandırabilirsiniz

## Geliştirme

Kodu geliştirmek isterseniz:
- `content.js`: Twitter sayfasında çalışan ana mantık (tarama ve unfollow)
- `dashboard.js`: Dashboard sayfasının kontrolü
- `background.js`: Tab yönetimi ve mesaj iletimi
- `index.html` & `styles.css`: Dashboard arayüzü
- `manifest.json`: Eklenti yapılandırması

## Lisans

Bu proje eğitim amaçlı oluşturulmuştur. Twitter'ın kullanım koşullarına uygun şekilde kullanın.
