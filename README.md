# Irys Auto Image Uploader

Automated script for uploading random images from free image APIs to Irys/Arweave network with beautiful gallery generation.

## Features

- ✅ Download random images from Lorem Picsum API
- ✅ Manual or scheduled uploads to Irys
- ✅ Batch upload 20+ images at once
- ✅ Automatic image optimization (resize & compress)
- ✅ Comprehensive logging with balance checking
- ✅ Beautiful HTML gallery generation
- ✅ Automatic temporary file cleanup
- ✅ Error handling with 4-second upload delays
- ✅ Cost estimation before uploads
- ✅ Lightweight without browser automation
- ✅ Multiple image variants (normal, grayscale, blur)

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
Copy `.env.example` to `.env` and fill in your wallet private key:
```bash
cp .env.example .env
```

Edit `.env`:
```
WALLET_PRIVATE_KEY=your-ethereum-private-key-here
IMAGES_PER_DAY=20
```

### 3. Fund Wallet
Make sure your Ethereum wallet has Sepolia ETH for upload costs:
- Get Sepolia ETH from: https://sepoliafaucet.com/

## Usage

### 🚀 Direct Upload (Default)
```bash
npm start
```
Script will immediately download and upload images once, then exit.
- Download images from Picsum API
- Upload to Irys with 4-second delay between uploads
- Create HTML gallery and manifest
- Cleanup and exit

### 🧪 Test Mode (Upload 3 Images)
```bash
npm test
```
Same as direct upload, but only 3 images for testing.

### ⏰ Scheduler Mode (Auto Daily Upload)
```bash
npm run schedule
```
**Optional** - Script will run continuously and upload images daily on schedule.
- Active 24/7 until stopped (Ctrl+C)
- Automatic upload every day at 9 AM
- Use if you want full automation

> **Note**: Default mode is direct upload, not scheduler. Scheduler is only activated when needed.

## Configuration

### Environment Variables (.env)
- `WALLET_PRIVATE_KEY`: Your Ethereum wallet private key (REQUIRED)
- `IMAGES_PER_DAY`: Number of images per upload (default: 20)
- `MAX_IMAGE_SIZE`: Maximum image resolution in pixels (default: 2048)
- `IMAGE_QUALITY`: JPEG quality 1-100 (default: 80)
- `DOWNLOAD_TIMEOUT`: Download timeout in ms (default: 15000)

### Advanced Configuration (in script)
```javascript
const CONFIG = {
  IMAGES_PER_DAY: 20, // Number of images per day
  UPLOAD_TIME: '0 9 * * *', // Cron format
  TEMP_FOLDER: './temp_images',
  IMAGE_SOURCES: [...], // Image API sources
  MAX_IMAGE_SIZE: 2048, // Max image resolution
  IMAGE_QUALITY: 80, // JPEG quality
  RETRY_ATTEMPTS: 3
};
```

## Cron Time Format

- `0 9 * * *` = Every day at 9 AM
- `0 */6 * * *` = Every 6 hours
- `0 12 * * 1` = Every Monday at 12 PM
- `30 8 * * 1-5` = Every weekday at 8:30 AM

## Output

### Log Files
- `daily-upload.log`: All activity logs
- `daily-report-YYYY-MM-DD.json`: Daily report in JSON format

### Generated URLs
- **Gallery URL**: Web page with all uploaded images
- **Manifest URL**: Main Arweave manifest URL
- **Individual Image URLs**: URL for each image

### Example Output:
```
✅ Daily upload completed successfully!
🔗 Gallery URL: https://gateway.irys.xyz/ABC123.../gallery.html
📋 Manifest ID: ABC123...
📊 Images uploaded: 20
```

## Image Sources

Script uses the following free image APIs:

### Lorem Picsum (https://picsum.photos)
- High-quality random images
- Various dimensions and seeds
- Multiple variants: normal, grayscale, blur

### Image Dimensions
- 800x600 (4:3)
- 1024x768 (4:3)
- 1200x800 (3:2)
- 900x900 (Square)
- 1080x1350 (Portrait)

### Image Variants
- **Normal**: Standard color images
- **Grayscale**: Black and white versions
- **Blur**: Blurred effect with varying intensity (1-5)

## Upload Workflow

1. **Check Balance** - Script checks wallet Sepolia ETH balance
2. **Download Images** - Download random images from Picsum with 1-second delays
3. **Optimize Images** - Resize and compress using Sharp
4. **Upload to Irys** - Upload one by one with 4-second delays
5. **Create Gallery** - Generate beautiful HTML gallery
6. **Save Report** - Save daily report in JSON format
7. **Cleanup** - Remove temporary files

## Troubleshooting

## Troubleshooting

### Error: Not enough balance for transaction
```
💸 Insufficient balance for filename.jpg. Try funding your wallet.
💰 Get Sepolia ETH: https://sepoliafaucet.com/
```
**Cause**: Wallet balance is insufficient for uploading specific file
**Solution**: Top up Sepolia ETH to your wallet

### Error: No images downloaded
- Check internet connection
- Lorem Picsum might be down
- Try running again after a few minutes

### Error: Image download timeout
- Check internet connection
- Increase `DOWNLOAD_TIMEOUT` in .env
- API might be slow

### Partial Upload Success/Failure
This is normal if wallet balance is low. Larger files require higher costs.
- Check cost estimates in logs: `💸 Estimated cost for filename.jpg`
- Fund wallet with more ETH
- Or reduce `IMAGE_QUALITY` and `MAX_IMAGE_SIZE`
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

Each upload generates:
- `daily-upload.log` - All activities with timestamps
- `daily-report-YYYY-MM-DD.json` - Detailed upload report in JSON
- HTML gallery on Irys with published URL

## 🔒 Security Notes

- Never commit `.env` file to repository
- Private key is stored locally, never sent anywhere
- Use a separate wallet dedicated for uploads
- Monitor upload costs regularly

## 📝 Summary

This script is a **manual uploader** with optional scheduler. Default modes:
- ✅ **Manual**: `npm start` - Upload once then exit
- ✅ **Test**: `npm test` - Upload 3 images for testing  
- ⏰ **Scheduler**: `npm run schedule` - Auto daily upload (optional)

Perfect for batch uploading images to Arweave/Irys with beautiful galleries! 🎨

## License

MIT