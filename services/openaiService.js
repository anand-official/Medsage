const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

const openai = new OpenAIApi(configuration);

exports.generateMedicalResponse = async (question, options = {}) => {
  try {
    const { syllabus = 'Indian MBBS', subject, studyMode = 'conceptual' } = options;

    const prompt = `As a medical expert, provide a detailed answer to the following question:
    Question: ${question}
    Context: ${syllabus} curriculum, ${subject ? subject + ' subject, ' : ''}${studyMode} study mode
    Please include:
    1. A comprehensive answer
    2. Key points to remember
    3. Clinical relevance
    4. References from standard medical textbooks`;

    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 1000,
      temperature: 0.7,
    });

    const answer = response.data.choices[0].text.trim();

    // Parse the response to extract different sections
    const sections = answer.split('\n\n');
    const mainAnswer = sections[0];
    const keyPoints = sections.find(s => s.includes('Key points'))?.split('\n').slice(1) || [];
    const clinicalRelevance = sections.find(s => s.includes('Clinical relevance'))?.split('\n').slice(1).join('\n') || '';
    const references = sections.find(s => s.includes('References'))?.split('\n').slice(1) || [];

    return {
      answer: mainAnswer,
      keyPoints,
      clinicalRelevance,
      references,
      citations: references
    };
  } catch (error) {
    console.error('OpenAI API Error:', error);
    throw new Error('Failed to generate medical response');
  }
};