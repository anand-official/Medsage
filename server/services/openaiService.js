const axios = require('axios');

class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
  }

  async generateMedicalResponse(question, context = {}) {
    try {
      const { syllabus = 'Indian MBBS', subject, studyMode = 'conceptual' } = context;

      const systemPrompt = `You are MedSage, an AI medical study assistant specializing in ${syllabus} curriculum. 
      
      Guidelines:
      - Provide accurate, evidence-based medical information
      - Include relevant textbook references and citations
      - Adapt complexity based on study mode: ${studyMode}
      - Focus on ${subject || 'general medical topics'}
      - Always include page numbers and chapter references when possible
      - Structure answers with clear explanations and clinical relevance
      - For exam mode: focus on high-yield facts and mnemonics
      - For conceptual mode: provide detailed pathophysiology and mechanisms
      
      Format your response as JSON with:
      {
        "answer": "detailed medical answer",
        "references": [{"book": "title", "chapter": "X", "page": "XXX-XXX"}],
        "citations": ["specific facts with sources"],
        "keyPoints": ["important points to remember"],
        "clinicalRelevance": "how this applies in practice"
      }`;

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: question
            }
          ],
          temperature: 0.3, // Lower temperature for more factual responses
          max_tokens: 2000,
          top_p: 0.9
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const aiResponse = response.data.choices[0].message.content;
      
      // Try to parse as JSON, fallback to structured text
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(aiResponse);
      } catch (e) {
        // If not JSON, structure the response manually
        parsedResponse = {
          answer: aiResponse,
          references: this.extractReferences(aiResponse),
          citations: this.extractCitations(aiResponse),
          keyPoints: this.extractKeyPoints(aiResponse),
          clinicalRelevance: this.extractClinicalRelevance(aiResponse)
        };
      }

      return parsedResponse;

    } catch (error) {
      console.error('OpenAI API Error:', error.response?.data || error.message);
      
      // Fallback response
      return {
        answer: "I apologize, but I'm having trouble processing your question right now. Please try again later or rephrase your question.",
        references: [],
        citations: [],
        keyPoints: [],
        clinicalRelevance: "Please consult with healthcare professionals for clinical decisions.",
        error: true
      };
    }
  }

  extractReferences(text) {
    const references = [];
    const refPattern = /(?:from|in|according to|as per)\s+([^,\.]+)(?:,\s*(?:chapter|ch\.)\s*(\d+))?(?:,\s*p(?:age)?\.?\s*(\d+(?:-\d+)?))?/gi;
    
    let match;
    while ((match = refPattern.exec(text)) !== null) {
      references.push({
        book: match[1].trim(),
        chapter: match[2] || 'N/A',
        page: match[3] || 'N/A'
      });
    }
    
    return references;
  }

  extractCitations(text) {
    const citations = [];
    const citationPattern = /(?:according to|as per|from)\s+([^\.]+?)(?:\.|$)/gi;
    
    let match;
    while ((match = citationPattern.exec(text)) !== null) {
      citations.push(match[1].trim());
    }
    
    return citations;
  }

  extractKeyPoints(text) {
    const keyPoints = [];
    const keyPointPatterns = [
      /key points?:?\s*([^\.]+?)(?:\.|$)/i,
      /important points?:?\s*([^\.]+?)(?:\.|$)/i,
      /main points?:?\s*([^\.]+?)(?:\.|$)/i
    ];
    
    for (const pattern of keyPointPatterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        const points = match[1].split(/[,;]/).map(point => point.trim());
        keyPoints.push(...points);
      }
    }
    
    return keyPoints;
  }

  extractClinicalRelevance(text) {
    const clinicalPatterns = [
      /clinical(?:ly)?\s+relevant?[:\s]+(.+?)(?:\n\n|\.|$)/gi,
      /in practice[:\s]+(.+?)(?:\n\n|\.|$)/gi
    ];
    
    for (const pattern of clinicalPatterns) {
      const match = pattern.exec(text);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return "Clinical correlation is essential for proper patient management.";
  }
}

module.exports = new OpenAIService(); 