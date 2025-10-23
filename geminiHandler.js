// Use built-in fetch for Node.js 18+
const fetch = globalThis.fetch || require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

// Default API key (fallback)
const DEFAULT_API_KEY = 'AIzaSyAMiSUr8xBrlugcZbkhJ5IBnYYzc_Y45ho';

// Default model endpoint - use a supported Gemini model
const DEFAULT_MODEL = 'models/gemini-2.0-flash';
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

class GeminiAIHandler {
    constructor() {
        this.model = DEFAULT_MODEL;
        this.knowledgeBase = '';
        this.initialized = false;
        // API keys with fallback support
        this.apiKeys = {
            primary: DEFAULT_API_KEY,
            backup1: null,
            backup2: null
        };
        this.currentKeyIndex = 0; // Track which key is currently being used
    }

    async initialize() {
        try {
            // Load the main knowledge base from KB/kb.txt
            this.knowledgeBase = await fs.readFile(
                path.join(__dirname, 'KB', 'kb.txt'),
                'utf8'
            );
            this.fullKnowledgeBase = this.knowledgeBase;
            console.log('Knowledge base loaded successfully from KB/kb.txt');
        } catch (error) {
            console.log('No knowledge base found, using empty KB');
            this.knowledgeBase = '';
            this.fullKnowledgeBase = '';
        }
        this.initialized = true;
    }

    async getResponse(message) {
        if (!this.initialized) await this.initialize();

        // Enhanced system prompt for formal Egyptian Arabic responses
        let prompt = `أنت مساعد ذكي محترف ومهذب. يجب أن تجيب على جميع الأسئلة باللغة العربية المصريةالعامية بشكل رسمي ومحترم.

قواعد الرد:
- استخدم العامية المصرية بشكل رسمي ومحترم
- كن مهذباً ومحترماً في جميع ردودك
- قدم إجابات مفيدة ودقيقة
- استخدم أسلوب مهني وودود
- تجنب الألفاظ غير المناسبة أو العامية الخشنة

رسالة المستخدم: ${message}

يرجى الرد بالعامية المصرية الرسمية والمحترمة:`;

        // Determine if we need detailed information based on keywords
        const needsDetailedInfo = message.toLowerCase().includes('تفاصيل') ||
            message.toLowerCase().includes('details') ||
            message.toLowerCase().includes('كيف') ||
            message.toLowerCase().includes('how') ||
            message.toLowerCase().includes('خطوات') ||
            message.toLowerCase().includes('steps') ||
            message.toLowerCase().includes('ازاي') ||
            message.toLowerCase().includes('إزاي') ||
            message.toLowerCase().includes('عايز أعرف') ||
            message.toLowerCase().includes('عاوز أعرف');

        // Choose appropriate knowledge base
        const kbToUse = (needsDetailedInfo && this.fullKnowledgeBase) ? this.fullKnowledgeBase : this.knowledgeBase;

        // Add knowledge base context if available
        if (kbToUse && kbToUse.trim()) {
            prompt += `\n\nمعلومات إضافية عن الخدمة:\n${kbToUse}\n\nاستخدم هذه المعلومات لتقديم إجابة دقيقة ومفيدة بالعامية المصرية الرسمية.`;
        }

        prompt += `\n\nتذكر: يجب أن تكون الإجابة بالعامية المصرية بشكل رسمي ومحترم، مع الحفاظ على الطابع المهني والودود.`;

        // Try API keys with fallback
        return await this.makeRequestWithFallback(prompt);

    }

    // Get available API keys in order of preference
    getAvailableApiKeys() {
        const keys = [];
        if (this.apiKeys.primary) keys.push(this.apiKeys.primary);
        if (this.apiKeys.backup1) keys.push(this.apiKeys.backup1);
        if (this.apiKeys.backup2) keys.push(this.apiKeys.backup2);
        return keys;
    }

    // Make request with API key fallback
    async makeRequestWithFallback(prompt) {
        const availableKeys = this.getAvailableApiKeys();

        if (availableKeys.length === 0) {
            console.error('❌ No API keys available');
            return "No API keys configured. Please add API keys in the dashboard.";
        }

        const body = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                maxOutputTokens: 500,
                temperature: 0.3,
            }
        };

        // Try each API key in order
        for (let i = 0; i < availableKeys.length; i++) {
            const apiKey = availableKeys[i];
            const keyName = i === 0 ? 'Primary' : `Backup ${i}`;

            try {
                console.log(`🔑 Trying ${keyName} API key...`);

                const url = `${BASE_URL}/${this.model}:generateContent?key=${apiKey}`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                });

                if (!res.ok) {
                    const txt = await res.text();
                    throw new Error(`HTTP ${res.status} - ${res.statusText}: ${txt}`);
                }

                const data = await res.json();

                // Extract text from the response
                if (data.candidates && data.candidates.length > 0) {
                    const candidate = data.candidates[0];
                    if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
                        console.log(`✅ ${keyName} API key worked successfully`);
                        this.currentKeyIndex = i; // Remember which key worked
                        return candidate.content.parts[0].text;
                    }
                    // Handle case where content exists but no parts
                    if (candidate.content && candidate.content.text) {
                        console.log(`✅ ${keyName} API key worked successfully`);
                        this.currentKeyIndex = i;
                        return candidate.content.text;
                    }
                    // Handle case where there's no content but finish reason indicates completion
                    if (candidate.finishReason === 'MAX_TOKENS') {
                        console.log(`✅ ${keyName} API key worked but response too long`);
                        this.currentKeyIndex = i;
                        return "Response was too long. Please ask a shorter question.";
                    }
                    if (candidate.finishReason === 'STOP' && !candidate.content.parts) {
                        console.log(`⚠️ ${keyName} API key worked but no content generated`);
                        this.currentKeyIndex = i;
                        return "I apologize, but I couldn't generate a proper response. Please try again.";
                    }
                }

                // Unexpected response format
                console.log(`⚠️ ${keyName} API key: Unexpected response format:`, JSON.stringify(data, null, 2));
                throw new Error("Unexpected response format");

            } catch (error) {
                console.error(`❌ ${keyName} API key failed:`, error.message);

                // If this is the last key, return error message
                if (i === availableKeys.length - 1) {
                    return `All API keys failed. Last error: ${error.message}`;
                }

                // Continue to next key
                console.log(`🔄 Trying next API key...`);
            }
        }

        return "All API keys failed. Please check your API keys in the dashboard.";
    }

    // Update API keys
    async updateApiKeys(newApiKeys) {
        try {
            console.log('🔑 Updating API keys...');

            this.apiKeys = {
                primary: newApiKeys.primary || this.apiKeys.primary,
                backup1: newApiKeys.backup1 || null,
                backup2: newApiKeys.backup2 || null
            };

            console.log('✅ API keys updated successfully');
            console.log('🔑 Primary key:', !!this.apiKeys.primary);
            console.log('🔑 Backup1 key:', !!this.apiKeys.backup1);
            console.log('🔑 Backup2 key:', !!this.apiKeys.backup2);

            return true;
        } catch (error) {
            console.error('❌ Error updating API keys:', error);
            return false;
        }
    }

    // Test API keys
    async testApiKeys(apiKeysToTest) {
        const results = [];
        const testPrompt = "أنت مساعد ذكي. يرجى الرد بالعامية المصرية الرسمية والمحترمة وقول 'الاختبار نجح بإذن الله'.";

        // Test primary key
        if (apiKeysToTest.primary) {
            try {
                console.log('🧪 Testing primary API key...');
                const result = await this.testSingleApiKey(apiKeysToTest.primary, testPrompt);
                results.push({
                    key: 'primary',
                    success: result.success,
                    message: result.message
                });
            } catch (error) {
                results.push({
                    key: 'primary',
                    success: false,
                    message: error.message
                });
            }
        }

        // Test backup1 key
        if (apiKeysToTest.backup1) {
            try {
                console.log('🧪 Testing backup1 API key...');
                const result = await this.testSingleApiKey(apiKeysToTest.backup1, testPrompt);
                results.push({
                    key: 'backup1',
                    success: result.success,
                    message: result.message
                });
            } catch (error) {
                results.push({
                    key: 'backup1',
                    success: false,
                    message: error.message
                });
            }
        }

        // Test backup2 key
        if (apiKeysToTest.backup2) {
            try {
                console.log('🧪 Testing backup2 API key...');
                const result = await this.testSingleApiKey(apiKeysToTest.backup2, testPrompt);
                results.push({
                    key: 'backup2',
                    success: result.success,
                    message: result.message
                });
            } catch (error) {
                results.push({
                    key: 'backup2',
                    success: false,
                    message: error.message
                });
            }
        }

        return results;
    }

    // Test a single API key
    async testSingleApiKey(apiKey, testPrompt) {
        try {
            const url = `${BASE_URL}/${this.model}:generateContent?key=${apiKey}`;
            const body = {
                contents: [{
                    parts: [{
                        text: testPrompt
                    }]
                }],
                generationConfig: {
                    maxOutputTokens: 100,
                    temperature: 0.1,
                }
            };

            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            if (!res.ok) {
                const txt = await res.text();
                return {
                    success: false,
                    message: `HTTP ${res.status}: ${txt.substring(0, 100)}`
                };
            }

            const data = await res.json();

            if (data.candidates && data.candidates.length > 0) {
                return {
                    success: true,
                    message: 'API key is working correctly'
                };
            } else {
                return {
                    success: false,
                    message: 'Unexpected response format'
                };
            }

        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    async updateKnowledgeBase(newContent) {
        try {
            // Update the main KB file
            await fs.writeFile(path.join(__dirname, 'KB', 'kb.txt'), newContent, 'utf8');
            this.knowledgeBase = newContent;
            this.fullKnowledgeBase = newContent;
            console.log('Knowledge base updated in memory and file');
            return true;
        } catch (error) {
            console.error('Error updating knowledge base:', error);
            return false;
        }
    }
}

// Create a global instance
const geminiHandler = new GeminiAIHandler();

// Export the handler function for Vercel
async function handleGeminiRequest(message) {
    try {
        return await geminiHandler.getResponse(message);
    } catch (error) {
        console.error('Error in Gemini handler:', error);
        return 'عذراً، حدث خطأ في معالجة رسالتك. يرجى المحاولة مرة أخرى.';
    }
}

module.exports = { handleGeminiRequest, geminiHandler };