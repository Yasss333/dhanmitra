const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

// ──────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────

const FASTAPI_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
const PORT = process.env.PORT || 3001;

// ──────────────────────────────────────────────
// WHATSAPP CLIENT
// ──────────────────────────────────────────────

const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './session-data'
    }),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// QR Code generation (visible in terminal)
client.on('qr', (qr) => {
    console.log('\n📱 SCAN THIS QR CODE WITH WHATSAPP:\n');
    qrcode.generate(qr, { small: true });
    console.log('\n');
});

// Client ready
client.on('ready', () => {
    console.log('✅ WhatsApp client is ready!');
    console.log(`📱 Connected as: ${client.info.wid.user}`);
});

// Authentication failure
client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
});

// ──────────────────────────────────────────────
// INCOMING MESSAGE HANDLER
// ──────────────────────────────────────────────

client.on('message', async (message) => {
    try {
        // Skip messages from the bot itself
        if (message.from === client.info.wid._serialized) {
            return;
        }

        console.log(`📩 Received from ${message.from}: ${message.body}`);

        // Forward to FastAPI backend
        const response = await axios.post(
            `${FASTAPI_URL}/api/webhook/whatsapp`,
            {
                from: message.from,
                body: message.body,
                timestamp: message.timestamp,
                isGroup: message.isGroup || false,
                senderName: message._data?.notifyName || 'Unknown'
            },
            {
                timeout: 30000 // 30 second timeout
            }
        );

        // Send response back to user
        if (response.data && response.data.reply) {
            await client.sendMessage(message.from, response.data.reply);
            console.log(`✅ Sent reply to ${message.from}`);
        }

    } catch (error) {
        console.error('❌ Error processing message:', error.message);
        
        // Send error message to user
        try {
            await client.sendMessage(
                message.from,
                '⚠️ Sorry, I encountered an error. Please try again later.'
            );
        } catch (sendError) {
            console.error('Failed to send error message:', sendError);
        }
    }
});

// ──────────────────────────────────────────────
// HEALTH CHECK & STATUS API
// ──────────────────────────────────────────────

app.get('/status', (req, res) => {
    res.json({
        status: client.info ? 'connected' : 'disconnected',
        phone: client.info?.wid?.user || 'N/A',
        messages: client.info?.messages || 0,
        timestamp: new Date().toISOString()
    });
});

// Endpoint to send a message via API (for testing)
app.post('/send', async (req, res) => {
    const { to, message } = req.body;
    
    if (!to || !message) {
        return res.status(400).json({ error: 'Missing "to" or "message"' });
    }

    try {
        await client.sendMessage(to, message);
        res.json({ success: true, message: 'Message sent' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ──────────────────────────────────────────────
// START SERVER
// ──────────────────────────────────────────────

// Start Express server
app.listen(PORT, () => {
    console.log(`🚀 WhatsApp bridge running on port ${PORT}`);
    console.log(`📡 Forwarding to FastAPI at ${FASTAPI_URL}`);
});

// Start WhatsApp client
client.initialize();

// ──────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// ──────────────────────────────────────────────

process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down...');
    await client.destroy();
    process.exit(0);
});