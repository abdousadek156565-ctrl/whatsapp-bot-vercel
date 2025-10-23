# 🆓 Google Free Hosting Deployment Guide

Deploy your WhatsApp AI Bot to Google's free hosting platforms.

## 🚀 Option 1: Google Cloud Run (Recommended)

**Why Cloud Run?**
- ✅ 2 million requests/month free
- ✅ Supports Docker containers
- ✅ Better for WhatsApp bots
- ✅ Automatic scaling

### Prerequisites
1. **Google Cloud Account** (free)
2. **Google Cloud SDK** installed

### Setup Steps

#### 1. Install Google Cloud SDK
```bash
# Windows (using Chocolatey)
choco install gcloudsdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

#### 2. Initialize and Login
```bash
gcloud init
gcloud auth login
```

#### 3. Create a New Project
```bash
gcloud projects create whatsapp-bot-project --name="WhatsApp Bot"
gcloud config set project whatsapp-bot-project
```

#### 4. Enable Required APIs
```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

#### 5. Deploy to Cloud Run
```bash
cd whatsapp-bot-vercel

# Build and deploy
gcloud run deploy whatsapp-bot \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 1
```

#### 6. Get Your URL
After deployment, you'll get a URL like:
`https://whatsapp-bot-xxxxxxxxx-uc.a.run.app`

---

## 🚀 Option 2: Google App Engine

**Why App Engine?**
- ✅ 28 instance hours/day free
- ✅ Easy deployment
- ⚠️ Some Puppeteer limitations

### Setup Steps

#### 1. Deploy to App Engine
```bash
cd whatsapp-bot-vercel

# Deploy
gcloud app deploy app.yaml

# Get URL
gcloud app browse
```

---

## 🚀 Option 3: Google Compute Engine (VM)

**Why Compute Engine?**
- ✅ Always Free f1-micro instance
- ✅ Full control
- ✅ Best compatibility

### Setup Steps

#### 1. Create VM Instance
```bash
gcloud compute instances create whatsapp-bot-vm \
  --zone=us-central1-a \
  --machine-type=f1-micro \
  --image-family=ubuntu-2004-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=10GB \
  --tags=http-server,https-server
```

#### 2. SSH into VM
```bash
gcloud compute ssh whatsapp-bot-vm --zone=us-central1-a
```

#### 3. Setup on VM
```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Chrome
wget -q -O - https://dl.google.com/linux/linux_signing_key.pub | sudo apt-key add -
sudo sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list'
sudo apt-get update
sudo apt-get install -y google-chrome-stable

# Clone your repo
git clone https://github.com/abdousadek156565-ctrl/whatsapp-bot-vercel.git
cd whatsapp-bot-vercel

# Install dependencies
npm install

# Start the bot
npm start
```

#### 4. Setup Firewall
```bash
gcloud compute firewall-rules create allow-whatsapp-bot \
  --allow tcp:8080 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow WhatsApp Bot"
```

---

## 💰 Free Tier Limits

### Cloud Run (Recommended)
- **Requests:** 2 million/month
- **CPU:** 180,000 vCPU-seconds/month
- **Memory:** 360,000 GiB-seconds/month
- **Network:** 1 GB outbound/month

### App Engine
- **Instance Hours:** 28/day (F1 instance)
- **Storage:** 1 GB
- **Network:** 1 GB outbound/day

### Compute Engine
- **Instance:** 1 f1-micro (US regions)
- **Storage:** 30 GB HDD
- **Network:** 1 GB outbound/month

---

## 🔧 Configuration Tips

### Environment Variables
Set these in your deployment:

**Cloud Run:**
```bash
gcloud run services update whatsapp-bot \
  --set-env-vars="GEMINI_API_KEY=your_api_key_here" \
  --region=us-central1
```

**App Engine:**
Add to `app.yaml`:
```yaml
env_variables:
  GEMINI_API_KEY: "your_api_key_here"
```

### Custom Domain (Optional)
```bash
# Map custom domain to Cloud Run
gcloud run domain-mappings create \
  --service whatsapp-bot \
  --domain your-domain.com \
  --region us-central1
```

---

## 🐛 Troubleshooting

### Common Issues

**1. Chrome/Puppeteer Issues:**
- Ensure Chrome is installed in container
- Use correct Chrome path
- Add necessary flags

**2. Memory Issues:**
- Increase memory allocation
- Optimize WhatsApp session handling

**3. Timeout Issues:**
- Increase timeout limits
- Use health checks

### Monitoring
```bash
# View logs
gcloud run logs tail whatsapp-bot --region=us-central1

# Check service status
gcloud run services describe whatsapp-bot --region=us-central1
```

---

## 📱 Next Steps

1. **Deploy using your preferred option**
2. **Visit your deployment URL**
3. **Click "Start Bot"**
4. **Scan QR code with WhatsApp**
5. **Configure your Gemini API keys**
6. **Start chatting!**

Your WhatsApp bot will now run reliably on Google's infrastructure with proper persistent sessions and full WhatsApp Web.js support!