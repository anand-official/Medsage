const chatService = require('../services/chatService');

class ChatController {
  async sendMessage(req, res) {
    try {
      const { message, role } = req.body;
      
      if (!message || !role) {
        return res.status(400).json({
          success: false,
          error: 'Message and role are required',
          details: 'Please provide both message and role in the request body'
        });
      }

      // Add user message to history
      const userMessage = await chatService.addMessage({
        message,
        role,
        sender: role === 'user' ? 'user' : 'bot'
      });

      // Process the query and get AI response
      const aiResponse = await chatService.processQuery(message);

      // Add bot response to history
      const botMessage = await chatService.addMessage({
        message: aiResponse.response,
        role: 'assistant',
        sender: 'bot'
      });

      res.json({
        success: true,
        userMessage,
        botMessage
      });
    } catch (error) {
      console.error('Error in sendMessage:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process message',
        details: error.message
      });
    }
  }

  async getChatHistory(req, res) {
    try {
      const history = await chatService.getChatHistory();
      res.json({
        success: true,
        history
      });
    } catch (error) {
      console.error('Error in getChatHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch chat history',
        details: error.message
      });
    }
  }

  async clearChatHistory(req, res) {
    try {
      await chatService.clearChatHistory();
      res.json({
        success: true,
        message: 'Chat history cleared successfully'
      });
    } catch (error) {
      console.error('Error in clearChatHistory:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear chat history',
        details: error.message
      });
    }
  }
}

module.exports = new ChatController(); 