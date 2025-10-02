# Irys Auto Daily Image Uploader

Script otomatis untuk mengupload gambar-gambar random dari API gambar gratis ke Irys setiap hari.

## Fitur

- ✅ Download gambar random dari Lorem Picsum API
- ✅ Upload manual atau terjadwal ke Irys
- ✅ Bisa upload 20+ gambar sekaligus
- ✅ Optimasi gambar otomatis (resize & compress)
- ✅ Sistem logging lengkap dengan balance check
- ✅ Membuat gallery HTML otomatis yang cantik
- ✅ Cleanup temporary files
- ✅ Error handling dan jeda antar upload (4 detik)
- ✅ Estimasi biaya sebelum upload
- ✅ Ringan tanpa browser automation
- ✅ Multiple variasi gambar (normal, grayscale, blur)

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
Copy `.env.example` ke `.env` dan isi dengan private key wallet Anda:
```bash
cp .env.example .env
```

Edit `.env`:
```
WALLET_PRIVATE_KEY=your-ethereum-private-key-here
IMAGES_PER_DAY=20
UPLOAD_TIME="0 9 * * *"
```

### 3. Fund Wallet
Pastikan wallet Ethereum Anda memiliki Sepolia ETH untuk biaya upload:
- Dapatkan Sepolia ETH di: https://sepoliafaucet.com/

## Cara Menggunakan

### 🚀 Upload Langsung (Default)
```bash
npm start
```
Script akan langsung mendownload dan upload gambar sekali jalan, lalu selesai.
- Download gambar dari Picsum API
- Upload ke Irys dengan jeda 4 detik antar upload
- Buat gallery HTML dan manifest
- Cleanup dan keluar

### 🧪 Mode Test (Upload 3 Gambar)
```bash
npm test
```
Sama seperti upload langsung, tapi hanya 3 gambar untuk testing.

### ⏰ Mode Scheduler (Auto Daily Upload)
```bash
npm run schedule
```
**Opsional** - Script akan berjalan terus dan upload gambar setiap hari sesuai jadwal.
- Aktif 24/7 sampai dihentikan (Ctrl+C)
- Upload otomatis setiap hari jam 9 pagi
- Gunakan jika ingin automasi penuh

> **Catatan**: Mode default adalah upload langsung, bukan scheduler. Scheduler hanya diaktifkan jika diperlukan.

## Konfigurasi

### Environment Variables (.env)
- `WALLET_PRIVATE_KEY`: Private key wallet Ethereum Anda (REQUIRED)
- `IMAGES_PER_DAY`: Jumlah gambar per upload (default: 20)
- `MAX_IMAGE_SIZE`: Maksimal resolusi gambar dalam pixels (default: 2048)
- `IMAGE_QUALITY`: Kualitas JPEG 1-100 (default: 80)
- `DOWNLOAD_TIMEOUT`: Timeout download dalam ms (default: 15000)

### Advanced Configuration (dalam script)
```javascript
const CONFIG = {
  IMAGES_PER_DAY: 20, // Jumlah gambar per hari
  UPLOAD_TIME: '0 9 * * *', // Cron format
  TEMP_FOLDER: './temp_images',
  SEARCH_KEYWORDS: [...], // Keywords untuk search gambar
  MAX_IMAGE_SIZE: 2048, // Max resolusi gambar
  IMAGE_QUALITY: 80, // Kualitas JPEG
  RETRY_ATTEMPTS: 3
};
```

## Format Waktu Cron

- `0 9 * * *` = Setiap hari jam 9 pagi
- `0 */6 * * *` = Setiap 6 jam
- `0 12 * * 1` = Setiap Senin jam 12 siang
- `30 8 * * 1-5` = Setiap hari kerja jam 8:30 pagi

## Output

### File Log
- `daily-upload.log`: Log semua aktivitas
- `daily-report-YYYY-MM-DD.json`: Report harian dalam format JSON

### URLs yang Dihasilkan
- **Gallery URL**: Halaman web dengan semua gambar hari itu
- **Manifest URL**: URL utama manifest Arweave
- **Individual Image URLs**: URL untuk setiap gambar

### Contoh Output:
```
✅ Daily upload completed successfully!
🔗 Gallery URL: https://gateway.irys.xyz/ABC123.../gallery.html
📋 Manifest ID: ABC123...
📊 Images uploaded: 20
```

## Sumber Gambar

Script menggunakan API gambar gratis berikut:

### Lorem Picsum (https://picsum.photos)
- Gambar random berkualitas tinggi
- Berbagai dimensi dan seed

### Unsplash Source (https://source.unsplash.com)
Kategori yang digunakan:
- nature
- landscape  
- city
- architecture
- food
- technology
- abstract
- animal
- travel

### Dimensi Gambar
- 800x600 (4:3)
- 1024x768 (4:3)
- 1200x800 (3:2)
- 900x900 (Square)
- 1080x1350 (Portrait)

## Workflow Upload

1. **Check Balance** - Script cek balance wallet Sepolia ETH
2. **Download Images** - Download random dari Picsum dengan jeda 1 detik
3. **Optimize Images** - Resize dan compress dengan Sharp
4. **Upload to Irys** - Upload satu per satu dengan jeda 4 detik
5. **Create Gallery** - Buat HTML gallery cantik
6. **Save Report** - Simpan daily report JSON
7. **Cleanup** - Hapus temporary files

## Troubleshooting

### Error: Not enough balance for transaction
```
� Insufficient balance for filename.jpg. Try funding your wallet.
💰 Get Sepolia ETH: https://sepoliafaucet.com/
```
**Penyebab**: Balance wallet tidak cukup untuk upload file tertentu
**Solusi**: Top up Sepolia ETH ke wallet Anda

### Error: No images downloaded
- Periksa koneksi internet
- Lorem Picsum mungkin sedang down
- Coba jalankan ulang setelah beberapa menit

### Error: Image download timeout
- Periksa koneksi internet
- Increase `DOWNLOAD_TIMEOUT` di .env
- API mungkin sedang lambat

### Upload Sebagian Berhasil, Sebagian Gagal
Ini normal jika balance wallet tipis. File yang lebih besar butuh biaya lebih mahal.
- Cek estimasi biaya di log: `💸 Estimated cost for filename.jpg`
- Fund wallet dengan lebih banyak ETH
- Atau kurangi `IMAGE_QUALITY` dan `MAX_IMAGE_SIZE`

## Monitoring

### Check Log File
```bash
tail -f daily-upload.log
```

### Check Daily Reports
```bash
ls daily-report-*.json
cat daily-report-2024-10-02.json
```

## 📊 Output Files

Setiap kali upload, script akan menghasilkan:
- `daily-upload.log` - Log semua aktivitas dengan timestamp
- `daily-report-YYYY-MM-DD.json` - Report detail upload dalam JSON
- Gallery HTML di Irys dengan URL yang dipublish

## 🔒 Security Notes

- Jangan commit file `.env` ke repository
- Private key disimpan lokal, tidak dikirim kemana-mana
- Gunakan wallet terpisah khusus untuk upload
- Monitor biaya upload secara berkala

## 📝 Summary

Script ini adalah **manual uploader** dengan opsi scheduler. Mode default:
- ✅ **Manual**: `npm start` - Upload sekali lalu selesai
- ✅ **Test**: `npm test` - Upload 3 gambar untuk testing  
- ⏰ **Scheduler**: `npm run schedule` - Auto upload harian (opsional)

Perfect untuk upload batch gambar ke Arweave/Irys dengan gallery yang cantik! 🎨

## License

MIT