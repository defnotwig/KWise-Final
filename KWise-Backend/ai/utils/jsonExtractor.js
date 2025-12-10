/**
 * JSON Extractor Utility
 * Robust JSON extraction from AI responses that may contain thinking process or markdown
 * 
 * ROOT CAUSE FIX: DeepSeek R1 returns <think>...</think> tags before JSON
 * This utility extracts pure JSON from various response formats
 */

const logger = require('../../utils/logger');

class JSONExtractor {
  /**
   * Extract JSON from AI response with various formats
   * @param {string} response - AI response text
   * @param {Object} options - Extraction options
   * @returns {Object|null} Parsed JSON or null if failed
   */
  static extractJSON(response, options = {}) {
    if (!response || typeof response !== 'string') {
      logger.debug('Invalid response for JSON extraction', { response });
      return null;
    }

    const { allowPartial = false, strictMode = false } = options;

    try {
      // Strategy 1: Try direct JSON parse (fastest path)
      try {
        return JSON.parse(response);
      } catch (e) {
        // Continue to extraction strategies
      }

      // Strategy 2: Extract from <think>...</think> tags (DeepSeek R1)
      // Example: <think>reasoning...</think>\n{"result": "data"}
      // 🔥 FIX #1.1: Enhanced to handle multiple thinking blocks and edge cases
      let cleanedResponse = response;
      
      // Remove all <think>...</think> blocks (including multiline with greedy matching)
      cleanedResponse = cleanedResponse.replace(/<think>[\s\S]*?<\/think>/g, '');
      
      // Remove standalone <think> or </think> tags that might be malformed
      cleanedResponse = cleanedResponse.replace(/<\/?think>/g, '');
      
      // Try parsing cleaned response
      const trimmed = cleanedResponse.trim();
      if (trimmed && trimmed.length > 0) {
        try {
          return JSON.parse(trimmed);
        } catch (e) {
          // Continue to other strategies
        }
      }

      // Strategy 3: Extract from markdown code blocks
      // ```json\n{...}\n```
      const codeBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch && codeBlockMatch[1]) {
        try {
          return JSON.parse(codeBlockMatch[1].trim());
        } catch (e) {
          // Continue
        }
      }

      // Strategy 4: Find first { to last } (most common JSON extraction)
      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = response.substring(firstBrace, lastBrace + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          // Continue
        }
      }

      // Strategy 5: Find first [ to last ] (array JSON)
      const firstBracket = response.indexOf('[');
      const lastBracket = response.lastIndexOf(']');
      
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        const jsonStr = response.substring(firstBracket, lastBracket + 1);
        try {
          return JSON.parse(jsonStr);
        } catch (e) {
          // Continue
        }
      }

      // Strategy 6: Remove common prefix/suffix patterns
      const patterns = [
        /^Here'?s? (?:the|a) (?:JSON|response):?\s*/i,
        /^(?:Response|Result|Output):?\s*/i,
        /^```\s*/,
        /\s*```$/,
        /^`\s*/,
        /\s*`$/
      ];

      let cleaned = response;
      for (const pattern of patterns) {
        cleaned = cleaned.replace(pattern, '');
      }

      if (cleaned !== response) {
        try {
          return JSON.parse(cleaned.trim());
        } catch (e) {
          // Continue
        }
      }

      // Strategy 7: Multi-line JSON with text before/after
      const lines = response.split('\n');
      let jsonLines = [];
      let insideJSON = false;
      let braceCount = 0;

      for (const line of lines) {
        if (!insideJSON && (line.trim().startsWith('{') || line.trim().startsWith('['))) {
          insideJSON = true;
          braceCount = 0;
        }

        if (insideJSON) {
          jsonLines.push(line);
          
          // Count braces/brackets
          for (const char of line) {
            if (char === '{' || char === '[') braceCount++;
            if (char === '}' || char === ']') braceCount--;
          }

          // Complete JSON object/array found
          if (braceCount === 0 && (line.trim().endsWith('}') || line.trim().endsWith(']'))) {
            try {
              return JSON.parse(jsonLines.join('\n'));
            } catch (e) {
              // Reset and continue searching
              jsonLines = [];
              insideJSON = false;
            }
          }
        }
      }

      // Strategy 8: Partial JSON extraction (if allowed)
      if (allowPartial) {
        // Try to extract individual JSON fields
        const fieldMatch = response.match(/"(\w+)"\s*:\s*("(?:[^"\\]|\\.)*"|[\d.]+|true|false|null|\[.*?\]|\{.*?\})/g);
        if (fieldMatch && fieldMatch.length > 0) {
          try {
            const partialJSON = '{' + fieldMatch.join(',') + '}';
            return JSON.parse(partialJSON);
          } catch (e) {
            // Continue
          }
        }
      }

      // All strategies failed
      logger.warn('All JSON extraction strategies failed', {
        responsePreview: response.substring(0, 200),
        responseLength: response.length,
        strictMode
      });

      return null;

    } catch (error) {
      logger.error('JSON extraction error', {
        error: error.message,
        responsePreview: response?.substring(0, 200)
      });
      return null;
    }
  }

  /**
   * Extract JSON with validation
   * @param {string} response - AI response
   * @param {Object} schema - Expected schema structure (for validation)
   * @returns {Object|null} Validated JSON or null
   */
  static extractAndValidate(response, schema = {}) {
    const extracted = this.extractJSON(response);
    
    if (!extracted) {
      return null;
    }

    // Basic validation if schema provided
    if (Object.keys(schema).length > 0) {
      const requiredFields = Object.keys(schema).filter(key => schema[key].required);
      const missingFields = requiredFields.filter(field => !(field in extracted));

      if (missingFields.length > 0) {
        logger.warn('Extracted JSON missing required fields', {
          missingFields,
          extractedKeys: Object.keys(extracted)
        });
        // Return partial data instead of null (graceful degradation)
        return extracted;
      }
    }

    return extracted;
  }

  /**
   * Clean AI response text (remove thinking tags, markdown, etc.)
   * @param {string} response - AI response
   * @returns {string} Cleaned response
   */
  static cleanResponse(response) {
    if (!response || typeof response !== 'string') {
      return '';
    }

    let cleaned = response;

    // Remove DeepSeek R1 thinking tags
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '');

    // Remove markdown code blocks
    cleaned = cleaned.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1');

    // Remove common prefixes
    cleaned = cleaned.replace(/^Here'?s? (?:the|a) (?:JSON|response):?\s*/i, '');
    cleaned = cleaned.replace(/^(?:Response|Result|Output):?\s*/i, '');

    // Trim whitespace
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Check if response contains valid JSON
   * @param {string} response - AI response
   * @returns {boolean} True if contains valid JSON
   */
  static hasJSON(response) {
    return this.extractJSON(response) !== null;
  }

  /**
   * Extract multiple JSON objects from response
   * @param {string} response - AI response
   * @returns {Array<Object>} Array of parsed JSON objects
   */
  static extractAllJSON(response) {
    if (!response || typeof response !== 'string') {
      return [];
    }

    const results = [];
    const regex = /\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g;
    let match;

    while ((match = regex.exec(response)) !== null) {
      try {
        const parsed = JSON.parse(match[0]);
        results.push(parsed);
      } catch (e) {
        // Skip invalid JSON
        continue;
      }
    }

    return results;
  }
}

module.exports = JSONExtractor;
