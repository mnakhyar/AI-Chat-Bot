// AI Configuration - Internal settings
export const AI_CONFIG = {
  // Gemini AI Configuration
  GEMINI: {
    API_KEY: 'YOUR_GEMINI_API_KEY_HERE', // Replace with your actual Gemini API key
    MODEL: 'gemini-1.5-flash',
  },
  
  // Deepseek AI Configuration
  DEEPSEEK: {
    URL: 'http://127.0.0.1:11434', // Default local Ollama URL
    MODEL: 'deepseek-coder:6.7b',
    EMBED_MODEL: 'deepseek-embed',
  },
  
  // Default model selection
  DEFAULT_MODEL: 'gemini' as 'gemini' | 'deepseek',
};

// Helper function to get current model configuration
export const getCurrentModelConfig = (model: 'gemini' | 'deepseek') => {
  return model === 'gemini' ? AI_CONFIG.GEMINI : AI_CONFIG.DEEPSEEK;
}; 