const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const { handleGeminiRequest } = require('../geminiHandler');

const app = express();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Global variables for WhatsApp client
let client = null;
let qrCodeData = null;
let isClientReady = false;
let clientStatus = 'disconnected';

// Initialize WhatsApp client
function initializeClient() {
    if (client) return client;
    
    client = new Client({
        authStrategy: new LocalAuth({
            dataPath: '/tmp/whatsapp-session'
        }),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--single-process',
                '--disable-gpu'
            ]
        }
    });

    client.on('qr', async (qr) => {
        console.log('QR Code received');
        qrCodeData = await qrcode.toDataURL(qr);
        clientStatus = 'qr_ready';
    });

    client.on('ready', () => {
        console.log('WhatsApp client is ready!');
        isClientReady = true;
        clientStatus = 'ready';
        qrCodeData = null;
    });

    client.on('authenticated', () => {
        console.log('WhatsApp client authenticated');
        clientStatus = 'authenticated';
    });

    client.on('auth_failure', (msg) => {
        console.error('Authentication failed:', msg);
        clientStatus = 'auth_failed';
    });

    client.on('disconnected', (reason) => {
        console.log('WhatsApp client disconnected:', reason);
        isClientReady = false;
        clientStatus = 'disconnected';
        client = null;
    });

    client.on('message', async (message) => {
        if (message.body && !message.fromMe) {
            try {
                const response = await handleGeminiRequest(message.body);
                if (response) {
                    await message.reply(response);
                }
            } catch (error) {
                console.error('Error handling message:', error);
                await message.reply('عذراً، حدث خطأ في معالجة رسالتك. يرجى المحاولة مرة أخرى.');
            }
        }
    });

    client.initialize();
    return client;
}

// Routes
app.get('/api/status', (req, res) => {
    res.json({
        status: clientStatus,
        isReady: isClientReady,
        hasQR: !!qrCodeData
    });
});

app.get('/api/qr', (req, res) => {
    if (qrCodeData) {
        res.json({ qr: qrCodeData });
    } else {
        res.status(404).json({ error: 'QR code not available' });
    }
});

app.post('/api/start', (req, res) => {
    try {
        if (!client) {
            initializeClient();
            res.json({ message: 'WhatsApp client starting...' });
        } else {
            res.json({ message: 'WhatsApp client already running' });
        }
    } catch (error) {
        console.error('Error starting client:', error);
        res.status(500).json({ error: 'Failed to start WhatsApp client' });
    }
});

app.post('/api/stop', async (req, res) => {
    try {
        if (client) {
            await client.destroy();
            client = null;
            isClientReady = false;
            clientStatus = 'disconnected';
            qrCodeData = null;
            res.json({ message: 'WhatsApp client stopped' });
        } else {
            res.json({ message: 'WhatsApp client not running' });
        }
    } catch (error) {
        console.error('Error stopping client:', error);
        res.status(500).json({ error: 'Failed to stop WhatsApp client' });
    }
});

app.post('/api/send-message', async (req, res) => {
    const { number, message } = req.body;
    
    if (!isClientReady) {
        return res.status(400).json({ error: 'WhatsApp client not ready' });
    }
    
    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        await client.sendMessage(chatId, message);
        res.json({ success: true, message: 'Message sent successfully' });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send message' });
    }
});

// Knowledge Base routes
app.get('/api/knowledge-base', async (req, res) => {
    try {
        const kbPath = path.join(__dirname, '../KB/kb.txt');
        const content = await fs.readFile(kbPath, 'utf8');
        res.json({ content });
    } catch (error) {
        console.error('Error reading knowledge base:', error);
        res.status(500).json({ error: 'Failed to read knowledge base' });
    }
});

app.post('/api/knowledge-base', async (req, res) => {
    try {
        const { content } = req.body;
        const kbPath = path.join(__dirname, '../KB/kb.txt');
        
        // Ensure KB directory exists
        await fs.mkdir(path.dirname(kbPath), { recursive: true });
        await fs.writeFile(kbPath, content, 'utf8');
        
        res.json({ success: true, message: 'Knowledge base updated successfully' });
    } catch (error) {
        console.error('Error updating knowledge base:', error);
        res.status(500).json({ error: 'Failed to update knowledge base' });
    }
});

// Scenarios routes
app.get('/api/scenarios', async (req, res) => {
    try {
        const scenariosPath = path.join(__dirname, '../scenarios.json');
        const content = await fs.readFile(scenariosPath, 'utf8');
        res.json(JSON.parse(content));
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.json([]);
        } else {
            console.error('Error reading scenarios:', error);
            res.status(500).json({ error: 'Failed to read scenarios' });
        }
    }
});

app.post('/api/scenarios', async (req, res) => {
    try {
        const scenarios = req.body;
        const scenariosPath = path.join(__dirname, '../scenarios.json');
        await fs.writeFile(scenariosPath, JSON.stringify(scenarios, null, 2), 'utf8');
        res.json({ success: true, message: 'Scenarios updated successfully' });
    } catch (error) {
        console.error('Error updating scenarios:', error);
        res.status(500).json({ error: 'Failed to update scenarios' });
    }
});

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Export for Vercel
module.exports = app;