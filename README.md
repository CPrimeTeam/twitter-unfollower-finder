# Twitter Takip Edilmeyen Bulucu Chrome Eklentisi

Bu Chrome eklentisi, Twitter'da (X) sizi takip etmeyen kullanıcıları tek sayfada hızlıca bulur.

## Özellikler

- ✅ Tek sayfada tüm analizi yapar (sadece Following listesi)
- ✅ "Seni takip ediyor" bilgisini kontrol eder
- ✅ Çok daha hızlı sonuç verir
- ✅ Detaylı timeline/log sistemi
- ✅ Modern ve kullanışlı arayüz
- ✅ Direkt takibi bırakma özelliği

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
   - Chrome araç çubuğundaki eklenti ikonuna tıklayın
   - "Tarama Başlat" butonuna basın
   - Eklenti otomatik olarak:
     - Önce takip ettiklerinizi tarayacak
     - Sonra takipçilerinize geçecek  
     - Karşılaştırma yapıp sonuçları gösterecek
   - Sonuçlar gösterildiğinde istediğiniz kullanıcıların takibini bırakabilirsiniz
   - Twitter'a (x.com) giriş yapın
   - Kendi profil sayfanıza gidin
   - Chrome araç çubuğundaki eklenti ikonuna tıklayın
   - "Tarama Başlat" butonuna basın
   - Eklenti otomatik olarak takip ettiklerinizi ve takipçilerinizi tarayacak
   - Sonuçlar gösterildiğinde istediğiniz kullanıcıların takibini bırakabilirsiniz

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
- `content.js`: Twitter sayfasında çalışan ana mantık
- `popup.js`: Eklenti popup'ının kontrolü
- `manifest.json`: Eklenti yapılandırması

## Lisans

Bu proje eğitim amaçlı oluşturulmuştur. Twitter'ın kullanım koşullarına uygun şekilde kullanın.
