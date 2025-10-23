const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;
const { handleGeminiRequest } = require('../geminiHandler');

// Global variables for WhatsApp client (shared across function calls)
let client = null;
let qrCodeData = null;
let isClientReady = false;
let clientStatus = 'disconnected';

// Initialize WhatsApp client
function initializeClient() {
    if (client) return client;
    
    try {
        console.log('Creating new WhatsApp client...');
        
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
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            }
        });
        
        console.log('WhatsApp client created successfully');
    } catch (error) {
        console.error('Error creating WhatsApp client:', error);
        throw error;
    }

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

// Main serverless function handler
module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    const { method } = req;
    
    // Parse the URL to get the path after /api
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;
    
    // Remove /api prefix if present
    const apiPath = pathname.startsWith('/api') ? pathname.substring(4) : pathname;
    
    console.log(`${method} ${pathname} -> ${apiPath}`);

    try {
        // Route: GET /status
        if (method === 'GET' && apiPath === '/status') {
            return res.status(200).json({
                status: clientStatus,
                isReady: isClientReady,
                hasQR: !!qrCodeData
            });
        }

        // Route: GET /qr
        if (method === 'GET' && apiPath === '/qr') {
            if (qrCodeData) {
                return res.status(200).json({ qr: qrCodeData });
            } else {
                return res.status(404).json({ error: 'QR code not available' });
            }
        }

        // Route: POST /start
        if (method === 'POST' && apiPath === '/start') {
            try {
                console.log('Start endpoint called');
                
                // Check if we're in a serverless environment
                const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
                
                if (isServerless) {
                    console.log('Running in serverless environment');
                    return res.status(200).json({ 
                        message: 'WhatsApp client initialization attempted...',
                        warning: 'Note: WhatsApp Web.js may not work reliably in serverless environments due to Puppeteer limitations.',
                        environment: 'serverless',
                        status: 'attempting_start'
                    });
                }
                
                if (!client) {
                    console.log('Initializing new WhatsApp client');
                    initializeClient();
                    return res.status(200).json({ 
                        message: 'WhatsApp client starting...',
                        status: 'initializing'
                    });
                } else {
                    console.log('WhatsApp client already exists');
                    return res.status(200).json({ 
                        message: 'WhatsApp client already running',
                        status: clientStatus
                    });
                }
            } catch (error) {
                console.error('Error starting client:', error);
                return res.status(500).json({ 
                    error: 'Failed to start WhatsApp client',
                    details: error.message,
                    stack: error.stack
                });
            }
        }

        // Route: POST /stop
        if (method === 'POST' && apiPath === '/stop') {
            try {
                if (client) {
                    await client.destroy();
                    client = null;
                    isClientReady = false;
                    clientStatus = 'disconnected';
                    qrCodeData = null;
                    return res.status(200).json({ message: 'WhatsApp client stopped' });
                } else {
                    return res.status(200).json({ message: 'WhatsApp client not running' });
                }
            } catch (error) {
                console.error('Error stopping client:', error);
                return res.status(500).json({ error: 'Failed to stop WhatsApp client' });
            }
        }

        // Route: POST /send-message
        if (method === 'POST' && apiPath === '/send-message') {
            const { number, message } = req.body;
            
            if (!isClientReady) {
                return res.status(400).json({ error: 'WhatsApp client not ready' });
            }
            
            try {
                const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
                await client.sendMessage(chatId, message);
                return res.status(200).json({ success: true, message: 'Message sent successfully' });
            } catch (error) {
                console.error('Error sending message:', error);
                return res.status(500).json({ error: 'Failed to send message' });
            }
        }

        // Route: GET /knowledge-base
        if (method === 'GET' && apiPath === '/knowledge-base') {
            try {
                const kbPath = path.join(__dirname, '../KB/kb.txt');
                const content = await fs.readFile(kbPath, 'utf8');
                return res.status(200).json({ content });
            } catch (error) {
                console.error('Error reading knowledge base:', error);
                return res.status(500).json({ error: 'Failed to read knowledge base' });
            }
        }

        // Route: POST /knowledge-base
        if (method === 'POST' && apiPath === '/knowledge-base') {
            try {
                const { content } = req.body;
                const kbPath = path.join(__dirname, '../KB/kb.txt');
                
                // Ensure KB directory exists
                await fs.mkdir(path.dirname(kbPath), { recursive: true });
                await fs.writeFile(kbPath, content, 'utf8');
                
                return res.status(200).json({ success: true, message: 'Knowledge base updated successfully' });
            } catch (error) {
                console.error('Error updating knowledge base:', error);
                return res.status(500).json({ error: 'Failed to update knowledge base' });
            }
        }

        // Route: GET /scenarios
        if (method === 'GET' && apiPath === '/scenarios') {
            try {
                const scenariosPath = path.join(__dirname, '../scenarios.json');
                const content = await fs.readFile(scenariosPath, 'utf8');
                return res.status(200).json(JSON.parse(content));
            } catch (error) {
                if (error.code === 'ENOENT') {
                    return res.status(200).json([]);
                } else {
                    console.error('Error reading scenarios:', error);
                    return res.status(500).json({ error: 'Failed to read scenarios' });
                }
            }
        }

        // Route: POST /scenarios
        if (method === 'POST' && apiPath === '/scenarios') {
            try {
                const scenarios = req.body;
                const scenariosPath = path.join(__dirname, '../scenarios.json');
                await fs.writeFile(scenariosPath, JSON.stringify(scenarios, null, 2), 'utf8');
                return res.status(200).json({ success: true, message: 'Scenarios updated successfully' });
            } catch (error) {
                console.error('Error updating scenarios:', error);
                return res.status(500).json({ error: 'Failed to update scenarios' });
            }
        }

        // Default route - return info
        if (method === 'GET' && (apiPath === '/' || apiPath === '')) {
            return res.status(200).json({ 
                message: 'WhatsApp Bot API',
                endpoints: ['/status', '/qr', '/start', '/stop', '/send-message', '/knowledge-base', '/scenarios']
            });
        }

        // 404 for unmatched routes
        console.log(`Route not found: ${method} ${apiPath}`);
        return res.status(404).json({ 
            error: 'Route not found',
            method: method,
            path: apiPath,
            available: ['/status', '/qr', '/start', '/stop', '/send-message', '/knowledge-base', '/scenarios']
        });

    } catch (error) {
        console.error('Server error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};