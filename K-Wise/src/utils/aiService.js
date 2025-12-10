// src/utils/aiService.js
import { GPT4All } from 'gpt4all';
import { formatSpecifications } from './categoryHelpers';

const model = new GPT4All('orca-mini-3b-gguf2-q4_0.gguf', {
  verbose: true,
});

export const getAIUpgradeRecommendation = async (currentItem, allProducts) => {
  const formatSpec = (spec) => typeof spec === 'string' ? spec : formatSpecifications(spec);
  
  const prompt = `
  As a PC hardware expert, analyze this upgrade scenario:
  
  Current Component:
  - Name: ${currentItem.name}
  - Specs: ${formatSpec(currentItem.specifications)}
  
  Available Upgrades:
  ${allProducts.map(p => `- ${p.name}: ${formatSpec(p.specifications)}`).join('\n')}

  Provide recommendations in this JSON format:
  {
    "recommendations": [{
      "component": "string",
      "improvement": "string",
      "rationale": "string",
      "timeframe": "string"
    }]
  }
  `;

  try {
    const response = await model.generate(prompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch (error) {
    console.error("AI Error:", error);
    return null;
  }
};