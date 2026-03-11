require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testStructuredOutput() {
    console.log('=== Testing Gemini 2.5 Flash Structured JSON Output ===\n');
    console.log(`Model: ${process.env.GEMINI_MODEL}`);

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL });

    const prompt = `List 3 facts about acute inflammation. Output ONLY valid JSON matching this schema:
{
  "claims": [
    { "statement": "factual claim", "chunk_ids": ["TEST_ID_1"] }
  ],
  "clinical_correlation": "brief clinical note"
}`;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 500,
            responseMimeType: 'application/json'
        }
    });

    const text = result.response.text();
    console.log('\nRaw response:');
    console.log(text);

    try {
        const parsed = JSON.parse(text);
        console.log('\n✅ JSON parsed successfully!');
        console.log(`   Claims: ${parsed.claims ? parsed.claims.length : 'none'}`);
        if (parsed.claims) {
            parsed.claims.forEach((c, i) => {
                console.log(`   [${i + 1}] "${c.statement.substring(0, 60)}..." chunk_ids: [${c.chunk_ids.join(', ')}]`);
            });
        }
    } catch (e) {
        console.log('\n❌ JSON parse failed:', e.message);
    }
}

testStructuredOutput().catch(e => console.error('ERROR:', e.message));
