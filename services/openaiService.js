const axios = require('axios');

class OpenAIService {
  constructor() {
    this.apiKey = process.env.GITHUB_TOKEN; // GitHub token for marketplace access
    this.baseURL = 'https://models.inference.ai.azure.com';
    this.model = 'gpt-4'; // GitHub Marketplace GPT-4 model
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
    // Extract book references from text
    const referencePatterns = [
      /(\w+['']?s?\s+\w+.*?)\s*(?:Chapter|Ch\.?)\s*(\d+).*?(?:page|p\.?)\s*(\d+(?:-\d+)?)/gi,
      /(Harrison's|Robbins|Gray's|Guyton|Ganong|Netter)/gi
    ];
    
    const references = [];
    referencePatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[2] && match[3]) {
          references.push({
            book: match[1].trim(),
            chapter: match[2],
            page: match[3]
          });
        }
      }
    });
    
    return references;
  }

  extractCitations(text) {
    // Extract specific citations
    const citationPattern = /\(([^)]+(?:p\.|page)\s*\d+[^)]*)\)/gi;
    const citations = [];
    const matches = text.matchAll(citationPattern);
    
    for (const match of matches) {
      citations.push(match[1]);
    }
    
    return citations;
  }

  extractKeyPoints(text) {
    // Extract bullet points or numbered lists
    const keyPointPatterns = [
      /(?:^|\n)[-•*]\s*(.+)/gm,
      /(?:^|\n)\d+\.\s*(.+)/gm
    ];
    
    const keyPoints = [];
    keyPointPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].length > 10) {
          keyPoints.push(match[1].trim());
        }
      }
    });
    
    return keyPoints.slice(0, 5); // Limit to 5 key points
  }

  extractClinicalRelevance(text) {
    // Extract clinical relevance section
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