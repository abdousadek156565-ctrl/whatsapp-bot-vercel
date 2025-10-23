// Simple status endpoint for Vercel
module.exports = (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method === 'GET') {
        res.json({
            status: 'ready',
            message: 'WhatsApp Bot API is running on Vercel',
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(405).json({ error: 'Method not allowed' });
    }
};