# WhatsApp AI Bot - Vercel Deployment

A WhatsApp AI bot with Gemini integration, optimized for Vercel serverless deployment.

## Features

- 🤖 AI-powered responses using Google Gemini
- 📱 WhatsApp Web integration
- 🔄 Multi-API key support with automatic fallback
- 📚 Knowledge base management
- 🌐 Web dashboard for management
- ☁️ Serverless deployment on Vercel

## Deployment to Vercel

### Method 1: Direct Upload

1. **Prepare the project:**
   - Ensure all files are in the `whatsapp-bot-vercel` directory
   - Verify `vercel.json` configuration is correct

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Upload the `whatsapp-bot-vercel` folder
   - Set Framework Preset: **Other**
   - Set Root Directory: **.**
   - Click Deploy

### Method 2: GitHub Integration

1. **Push to GitHub:**
   ```bash
   cd whatsapp-bot-vercel
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import from GitHub
   - Select your repository
   - Framework Preset: **Other**
   - Root Directory: **.**
   - Deploy

## Configuration

### Environment Variables (Optional)

You can set these in Vercel dashboard under Settings > Environment Variables:

- `GEMINI_API_KEY_1`: Primary Gemini API key
- `GEMINI_API_KEY_2`: Backup Gemini API key  
- `GEMINI_API_KEY_3`: Second backup Gemini API key

### API Keys Setup

1. Get your Gemini API keys from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Access your deployed dashboard
3. Navigate to the Knowledge Base section
4. Enter your API keys in the dashboard

## Usage

1. **Access Dashboard:**
   - Visit your Vercel deployment URL
   - You'll see the WhatsApp Bot Dashboard

2. **Start the Bot:**
   - Click "Start Bot" in the dashboard
   - Scan the QR code with WhatsApp
   - Bot is now ready to receive messages

3. **Manage Knowledge Base:**
   - Use the dashboard to update the bot's knowledge
   - Save changes to apply them immediately

## Important Notes

### Vercel Limitations

- **Serverless Functions:** Each request has a 30-second timeout
- **Stateless:** WhatsApp session may not persist between requests
- **Cold Starts:** First request may be slower
- **File Storage:** Limited to `/tmp` directory (temporary)

### Recommended Alternatives

For production use, consider these platforms that better support persistent connections:

- **Railway:** `railway.app` - Better for persistent Node.js apps
- **Render:** `render.com` - Good for Express.js applications
- **Fly.io:** `fly.io` - Excellent for containerized apps
- **Heroku:** `heroku.com` - Classic choice for Node.js apps

## Troubleshooting

### Common Issues

1. **QR Code Not Loading:**
   - Check Vercel function logs
   - Ensure WhatsApp Web dependencies are installed
   - Try refreshing the page

2. **API Key Errors:**
   - Verify API keys are correct
   - Check Gemini API quotas
   - Test keys in the dashboard

3. **Session Issues:**
   - WhatsApp sessions may not persist on Vercel
   - You may need to scan QR code frequently
   - Consider using a persistent platform for production

### Debugging

- Check Vercel function logs in the dashboard
- Use browser developer tools for client-side issues
- Monitor the activity log in the bot dashboard

## File Structure

```
whatsapp-bot-vercel/
├── api/
│   └── index.js          # Main serverless function
├── public/
│   └── index.html        # Dashboard interface
├── KB/
│   └── kb.txt           # Knowledge base content
├── vercel.json          # Vercel configuration
├── package.json         # Dependencies
├── geminiHandler.js     # AI handler
└── README.md           # This file
```

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review Vercel deployment logs
3. Test with a simpler deployment first

## License

MIT License - see LICENSE file for details.