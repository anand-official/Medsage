require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function run() {
    try {
        const key = process.env.GEMINI_API_KEY;
        const genAI = new GoogleGenerativeAI(key);
        const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-1.5-flash' });

        const result = await model.generateContent("Say hello");
        const response = await result.response;
        require('fs').writeFileSync('out.txt', response.text());
    } catch (e) {
        require('fs').writeFileSync('out.txt', e.message);
    }
}
run();
