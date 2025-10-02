import Irys from "@irys/sdk";
import fs from "fs-extra";
import path from "path";
import dotenv from 'dotenv';
import axios from 'axios';
import cron from 'node-cron';
import sharp from 'sharp';

dotenv.config();

const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "your-private-key-here";

// Configuration
const CONFIG = {
  IMAGES_PER_DAY: 20, // Jumlah gambar per hari
  UPLOAD_TIME: '0 9 * * *', // Setiap hari jam 9 pagi (format cron)
  TEMP_FOLDER: './temp_images',
  
  // Image sources - hanya gunakan yang pasti work
  IMAGE_SOURCES: [
    {
      name: 'picsum',
      baseUrl: 'https://picsum.photos',
      categories: ['random1', 'random2', 'random3', 'random4', 'random5', 'random6', 'random7', 'random8', 'random9', 'random10']
    },
    {
      name: 'picsum_grayscale',
      baseUrl: 'https://picsum.photos',
      categories: ['grayscale']
    },
    {
      name: 'picsum_blur',
      baseUrl: 'https://picsum.photos',
      categories: ['blur']
    }
  ],
  
  IMAGE_DIMENSIONS: [
    { width: 800, height: 600 },
    { width: 1024, height: 768 },
    { width: 1200, height: 800 },
    { width: 900, height: 900 }, // Square
    { width: 1080, height: 1350 } // Portrait
  ],
  
  MAX_IMAGE_SIZE: 2048,
  IMAGE_QUALITY: 85,
  RETRY_ATTEMPTS: 3,
  DOWNLOAD_TIMEOUT: 15000
};

// Logging system
class Logger {
  static log(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);
    
    // Append to log file
    fs.appendFileSync('./daily-upload.log', logMessage + '\n');
  }

  static error(message, error = null) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message}`;
    if (error) {
      console.error(errorMessage, error);
      fs.appendFileSync('./daily-upload.log', errorMessage + '\n' + error.stack + '\n');
    } else {
      console.error(errorMessage);
      fs.appendFileSync('./daily-upload.log', errorMessage + '\n');
    }
  }
}

// Image downloader class - versi ringan tanpa Puppeteer
class ImageDownloader {
  constructor() {
    this.downloadedUrls = new Set(); // Avoid duplicates
  }

  async downloadRandomImages(count = 20) {
    Logger.log(`📥 Starting download of ${count} random images...`);
    const imagePaths = [];
    let attempts = 0;
    const maxAttempts = count * 3; // Give more attempts in case some fail

    await fs.ensureDir(CONFIG.TEMP_FOLDER);

    while (imagePaths.length < count && attempts < maxAttempts) {
      attempts++;
      
      try {
        const imageInfo = this.generateRandomImageUrl();
        const imageUrl = imageInfo.url;
        
        // Skip if we already downloaded this URL
        if (this.downloadedUrls.has(imageUrl)) {
          continue;
        }

        Logger.log(`📷 Downloading from ${imageInfo.source}: ${imageInfo.category} (${imageInfo.dimensions.width}x${imageInfo.dimensions.height})`);
        
        const response = await axios.get(imageUrl, {
          responseType: 'arraybuffer',
          timeout: CONFIG.DOWNLOAD_TIMEOUT,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (response.data && response.data.byteLength > 5000) { // Ensure decent file size
          const filename = `${imageInfo.source}_${imageInfo.category}_${Date.now()}_${imagePaths.length + 1}.jpg`;
          const filepath = path.join(CONFIG.TEMP_FOLDER, filename);
          
          // Process and optimize image
          await sharp(response.data)
            .resize(CONFIG.MAX_IMAGE_SIZE, CONFIG.MAX_IMAGE_SIZE, { 
              fit: 'inside', 
              withoutEnlargement: true 
            })
            .jpeg({ quality: CONFIG.IMAGE_QUALITY })
            .toFile(filepath);

          imagePaths.push(filepath);
          this.downloadedUrls.add(imageUrl);
          Logger.log(`✅ Downloaded: ${filename} (${Math.round(response.data.byteLength / 1024)}kb)`);
          
          // Small delay to be respectful to the APIs
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          Logger.log(`⚠️ Skipped small image from ${imageUrl}`);
        }

      } catch (error) {
        Logger.error(`Failed to download image (attempt ${attempts})`, error);
        // Short delay before retry
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    Logger.log(`📁 Successfully downloaded ${imagePaths.length} images`);
    return imagePaths;
  }

  generateRandomImageUrl() {
    // Randomly choose a source
    const source = CONFIG.IMAGE_SOURCES[Math.floor(Math.random() * CONFIG.IMAGE_SOURCES.length)];
    const category = source.categories[Math.floor(Math.random() * source.categories.length)];
    const dimensions = CONFIG.IMAGE_DIMENSIONS[Math.floor(Math.random() * CONFIG.IMAGE_DIMENSIONS.length)];
    
    let url;
    const seed = Math.floor(Math.random() * 1000);
    
    if (source.name === 'picsum') {
      // Lorem Picsum - random images with seed
      url = `${source.baseUrl}/${dimensions.width}/${dimensions.height}?random=${seed}`;
    } else if (source.name === 'picsum_grayscale') {
      // Lorem Picsum - grayscale version
      url = `${source.baseUrl}/${dimensions.width}/${dimensions.height}?random=${seed}&grayscale`;
    } else if (source.name === 'picsum_blur') {
      // Lorem Picsum - blurred version
      const blurLevel = [1, 2, 3, 4, 5][Math.floor(Math.random() * 5)];
      url = `${source.baseUrl}/${dimensions.width}/${dimensions.height}?random=${seed}&blur=${blurLevel}`;
    }
    
    return {
      url,
      source: source.name,
      category: `${category}_${seed}`,
      dimensions
    };
  }
}

// Irys uploader class (sama seperti sebelumnya)
class IrysUploader {
  constructor() {
    this.irys = null;
  }

  async init() {
    this.irys = new Irys({
      network: "devnet",
      token: "ethereum",
      key: WALLET_PRIVATE_KEY,
      config: {
        providerUrl: "https://ethereum-sepolia-rpc.publicnode.com",
      },
    });

    // Check wallet balance
    try {
      const balance = await this.irys.getBalance();
      Logger.log(`💰 Wallet balance: ${balance.toString()} wei`);
      
      if (balance.toString() === '0') {
        Logger.log("⚠️ WARNING: Wallet balance is 0! Some uploads may fail.");
        Logger.log("💰 Fund your wallet with Sepolia ETH: https://sepoliafaucet.com/");
      }
    } catch (error) {
      Logger.error("Failed to check wallet balance", error);
    }
  }

  async uploadImages(imagePaths) {
    const uploadResults = [];

    for (const imagePath of imagePaths) {
      try {
        const data = await fs.readFile(imagePath);
        const fileName = path.basename(imagePath);
        const fileSizeKB = Math.round(data.byteLength / 1024);

        // Check upload cost before uploading
        try {
          const price = await this.irys.getPrice(data.byteLength);
          Logger.log(`💸 Estimated cost for ${fileName} (${fileSizeKB}kb): ${price.toString()} wei`);
        } catch (priceError) {
          Logger.log(`⚠️ Could not get price estimate for ${fileName}`);
        }

        const receipt = await this.irys.upload(data, {
          tags: [
            { name: "Content-Type", value: "image/jpeg" },
            { name: "File-Name", value: fileName },
            { name: "Upload-Date", value: new Date().toISOString() },
            { name: "Upload-Type", value: "daily-auto" }
          ]
        });

        uploadResults.push({
          fileName,
          id: receipt.id,
          url: `https://gateway.irys.xyz/${receipt.id}`
        });

        Logger.log(`✅ Uploaded: ${fileName} (${fileSizeKB}kb) - ID: ${receipt.id}`);
        
        // Jeda 4 detik sebelum upload berikutnya
        if (uploadResults.length < imagePaths.length) {
          Logger.log("⏳ Waiting 4 seconds before next upload...");
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      } catch (error) {
        const fileName = path.basename(imagePath);
        
        if (error.message.includes("402") || error.message.includes("insufficient")) {
          Logger.error(`💸 Insufficient balance for ${fileName}. Try funding your wallet.`);
          Logger.log("💰 Get Sepolia ETH: https://sepoliafaucet.com/");
        } else {
          Logger.error(`Failed to upload ${imagePath}`, error);
        }
        
        // Jeda juga saat error untuk menghindari spam
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return uploadResults;
  }

  async createManifest(uploadResults) {
    const manifest = {
      manifest: "arweave/paths",
      version: "0.1.0",
      index: {
        path: "gallery.html"
      },
      paths: {}
    };

    // Add all uploaded images to manifest
    uploadResults.forEach((result, index) => {
      manifest.paths[result.fileName] = {
        id: result.id
      };
    });

    // Create gallery HTML
    const galleryHtml = this.generateGalleryHTML(uploadResults);
    const galleryData = Buffer.from(galleryHtml, 'utf-8');
    
    const galleryReceipt = await this.irys.upload(galleryData, {
      tags: [
        { name: "Content-Type", value: "text/html" },
        { name: "File-Name", value: "gallery.html" }
      ]
    });

    manifest.paths["gallery.html"] = {
      id: galleryReceipt.id
    };

    // Upload manifest
    const manifestData = JSON.stringify(manifest, null, 2);
    const manifestReceipt = await this.irys.upload(manifestData, {
      tags: [
        { name: "Content-Type", value: "application/x.arweave-manifest+json" },
        { name: "Upload-Date", value: new Date().toISOString() }
      ]
    });

    return {
      manifestId: manifestReceipt.id,
      galleryUrl: `https://gateway.irys.xyz/${manifestReceipt.id}/gallery.html`,
      manifestUrl: `https://gateway.irys.xyz/${manifestReceipt.id}`
    };
  }

  generateGalleryHTML(uploadResults) {
    const imageCards = uploadResults.map(result => `
      <div class="image-card">
        <img src="https://gateway.irys.xyz/${result.id}" alt="${result.fileName}" loading="lazy">
        <div class="image-info">
          <p class="filename">${result.fileName}</p>
          <a href="https://gateway.irys.xyz/${result.id}" target="_blank" class="view-btn">View Full Size</a>
        </div>
      </div>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Image Gallery - ${new Date().toDateString()}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: rgba(255, 255, 255, 0.95);
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
        }
        
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 10px;
            font-size: 2.5em;
            font-weight: 700;
        }
        
        .stats {
            text-align: center;
            margin-bottom: 40px;
            padding: 20px;
            background: linear-gradient(45deg, #f093fb 0%, #f5576c 100%);
            border-radius: 15px;
            color: white;
        }
        
        .stats h2 {
            margin-bottom: 10px;
        }
        
        .stats p {
            margin: 5px 0;
            font-size: 1.1em;
        }
        
        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 25px;
            margin-top: 30px;
        }
        
        .image-card {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .image-card:hover {
            transform: translateY(-10px);
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }
        
        .image-card img {
            width: 100%;
            height: 250px;
            object-fit: cover;
            transition: transform 0.3s ease;
        }
        
        .image-card:hover img {
            transform: scale(1.05);
        }
        
        .image-info {
            padding: 20px;
            text-align: center;
        }
        
        .filename {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 15px;
            word-break: break-word;
        }
        
        .view-btn {
            display: inline-block;
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            text-decoration: none;
            padding: 10px 20px;
            border-radius: 25px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        
        .view-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
        }
        
        @media (max-width: 768px) {
            .container {
                padding: 20px;
                margin: 10px;
            }
            
            h1 {
                font-size: 2em;
            }
            
            .gallery {
                grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                gap: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 Daily Image Gallery</h1>
        <div class="stats">
            <h2>📅 Upload Summary</h2>
            <p><strong>Date:</strong> ${new Date().toDateString()}</p>
            <p><strong>Total Images:</strong> ${uploadResults.length}</p>
            <p><strong>Sources:</strong> Lorem Picsum & Unsplash</p>
        </div>
        <div class="gallery">
            ${imageCards}
        </div>
    </div>
</body>
</html>`;
  }
}

// Main daily upload function
async function performDailyUpload() {
  Logger.log("🚀 Starting daily image upload process...");
  
  const downloader = new ImageDownloader();
  const uploader = new IrysUploader();
  let allImagePaths = [];

  try {
    // Initialize uploader
    await uploader.init();

    // Download images using API approach
    allImagePaths = await downloader.downloadRandomImages(CONFIG.IMAGES_PER_DAY);

    if (allImagePaths.length === 0) {
      throw new Error("No images were downloaded");
    }

    // Upload to Irys
    Logger.log("📤 Starting upload to Irys...");
    const uploadResults = await uploader.uploadImages(allImagePaths);
    
    if (uploadResults.length === 0) {
      throw new Error("No images were uploaded successfully");
    }

    // Create manifest and gallery
    Logger.log("📦 Creating manifest and gallery...");
    const manifest = await uploader.createManifest(uploadResults);

    // Log success
    Logger.log("✅ Daily upload completed successfully!");
    Logger.log(`🔗 Gallery URL: ${manifest.galleryUrl}`);
    Logger.log(`📋 Manifest ID: ${manifest.manifestId}`);
    Logger.log(`📊 Images uploaded: ${uploadResults.length}`);

    // Save daily report
    const report = {
      date: new Date().toISOString(),
      imagesUploaded: uploadResults.length,
      manifestId: manifest.manifestId,
      galleryUrl: manifest.galleryUrl,
      uploadResults
    };

    await fs.writeJson(`./daily-report-${new Date().toISOString().split('T')[0]}.json`, report, { spaces: 2 });

  } catch (error) {
    Logger.error("❌ Daily upload failed", error);
    
    if (error.message.includes("insufficient")) {
      Logger.log("💰 Fund your wallet with Sepolia ETH: https://sepoliafaucet.com/");
    }
  } finally {
    // Cleanup
    try {
      if (allImagePaths.length > 0) {
        await fs.remove(CONFIG.TEMP_FOLDER);
        Logger.log("🧹 Temporary files cleaned up");
      }
    } catch (cleanupError) {
      Logger.error("Failed to cleanup", cleanupError);
    }
  }
}

// Test function
async function testUpload() {
  Logger.log("🧪 Running test upload (3 images)...");
  const originalCount = CONFIG.IMAGES_PER_DAY;
  CONFIG.IMAGES_PER_DAY = 3;
  
  await performDailyUpload();
  
  CONFIG.IMAGES_PER_DAY = originalCount;
}

// Schedule daily uploads
function startScheduler() {
  Logger.log(`⏰ Scheduler started - will run daily at ${CONFIG.UPLOAD_TIME}`);
  
  cron.schedule(CONFIG.UPLOAD_TIME, () => {
    Logger.log("⏰ Scheduled upload triggered");
    performDailyUpload();
  });

  Logger.log(`⏰ Next upload scheduled for: ${new Date().toDateString()} at 9:00 AM`);
}

// Main execution
const isMainModule = process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]));

if (isMainModule) {
  const args = process.argv.slice(2);
  
  if (args.includes('--test')) {
    console.log("🧪 Starting test mode...");
    testUpload().catch(console.error);
  } else if (args.includes('--schedule')) {
    startScheduler();
    Logger.log("🤖 Daily auto upload bot started!");
    Logger.log("📋 Configuration:");
    Logger.log(`   - Images per day: ${CONFIG.IMAGES_PER_DAY}`);
    Logger.log(`   - Upload time: ${CONFIG.UPLOAD_TIME}`);
    Logger.log(`   - Image sources: ${CONFIG.IMAGE_SOURCES.map(s => s.name).join(', ')}`);
    Logger.log("🔄 Bot is running... Press Ctrl+C to stop");
    
    // Keep the process alive
    process.stdin.resume();
  } else {
    console.log("⚡ Running upload now...");
    performDailyUpload().catch(console.error);
  }
}

export { performDailyUpload, testUpload, startScheduler };