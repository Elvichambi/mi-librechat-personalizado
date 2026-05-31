export interface ModelInfo {
  description: string;
  contextWindow?: string;
  knowledgeCutoff?: string;
  releaseDate?: string;
}

export function getModelInfo(modelId: string): ModelInfo {
  const id = modelId.toLowerCase();

  // Gemini models
  if (id.includes('gemini-3.5-flash') || id.includes('gemini-3-flash')) {
    return {
      description: 'Our most intelligent model built for speed, combining frontier intelligence with superior search and grounding.',
      contextWindow: '1,000,000 tokens',
      knowledgeCutoff: 'Jan 2025',
      releaseDate: 'May 19, 2026',
    };
  }
  if (id.includes('gemini-3.5-pro')) {
    return {
      description: 'Our most capable model for complex reasoning, multimodal tasks, and extremely large context windows.',
      contextWindow: '2,000,000 tokens',
      knowledgeCutoff: 'Jan 2025',
      releaseDate: 'May 19, 2026',
    };
  }
  if (id.includes('gemini-1.5-flash') || id.includes('gemini-flash')) {
    return {
      description: 'Fast, cost-efficient, and highly performant multimodal model built for speed and high-frequency tasks.',
      contextWindow: '1,048,576 tokens',
      knowledgeCutoff: 'Nov 2024',
      releaseDate: 'May 14, 2024',
    };
  }
  if (id.includes('gemini-1.5-pro')) {
    return {
      description: 'Advanced multimodal model optimized for complex analysis, creative tasks, and rich structural reasoning.',
      contextWindow: '2,097,152 tokens',
      knowledgeCutoff: 'Nov 2024',
      releaseDate: 'May 14, 2024',
    };
  }

  // Claude models
  if (id.includes('claude-3-5-sonnet') || id.includes('claude-3.5-sonnet')) {
    return {
      description: 'State-of-the-art model from Anthropic, setting industry benchmarks for graduate-level reasoning and coding.',
      contextWindow: '200,000 tokens',
      knowledgeCutoff: 'Apr 2024',
      releaseDate: 'Jun 20, 2024',
    };
  }
  if (id.includes('claude-3-5-haiku') || id.includes('claude-3.5-haiku')) {
    return {
      description: 'Anthropic\'s fastest and most cost-effective model, offering near-instant responses with robust intelligence.',
      contextWindow: '200,000 tokens',
      knowledgeCutoff: 'Apr 2024',
      releaseDate: 'Nov 04, 2024',
    };
  }
  if (id.includes('claude-3-opus')) {
    return {
      description: 'Anthropic\'s most powerful model for highly complex analytical tasks, deep research, and math solving.',
      contextWindow: '200,000 tokens',
      knowledgeCutoff: 'Aug 2023',
      releaseDate: 'Mar 04, 2024',
    };
  }

  // OpenAI GPT models
  if (id.includes('gpt-4o-mini')) {
    return {
      description: 'OpenAI\'s fast, lightweight, and highly cost-effective model for high-speed multimodal interactions.',
      contextWindow: '128,000 tokens',
      knowledgeCutoff: 'Oct 2023',
      releaseDate: 'Jul 18, 2024',
    };
  }
  if (id.includes('gpt-4o')) {
    return {
      description: 'OpenAI\'s flagship multimodal model, offering high intelligence, speed, and real-time vision capabilities.',
      contextWindow: '128,000 tokens',
      knowledgeCutoff: 'Oct 2023',
      releaseDate: 'May 13, 2024',
    };
  }
  if (id.includes('gpt-4-turbo') || id.includes('gpt-4-1106') || id.includes('gpt-4-0125')) {
    return {
      description: 'High-capability GPT-4 model with a large context window, optimized for complex engineering and reasoning.',
      contextWindow: '128,000 tokens',
      knowledgeCutoff: 'Dec 2023',
      releaseDate: 'Nov 06, 2023',
    };
  }
  if (id.includes('gpt-4')) {
    return {
      description: 'Classic GPT-4 model, excellent at highly structured reasoning, logic, and broad creative intelligence.',
      contextWindow: '8,192 tokens',
      knowledgeCutoff: 'Sep 2021',
      releaseDate: 'Mar 14, 2023',
    };
  }
  if (id.includes('o1-mini')) {
    return {
      description: 'OpenAI\'s reasoning model optimized for coding, mathematics, and science, offering deep logical deductions.',
      contextWindow: '128,000 tokens',
      knowledgeCutoff: 'Oct 2023',
      releaseDate: 'Sep 12, 2024',
    };
  }
  if (id.includes('o1-preview') || id.includes('o1-')) {
    return {
      description: 'Advanced reasoning model that spends more time thinking to solve extremely complex multi-step problems.',
      contextWindow: '128,000 tokens',
      knowledgeCutoff: 'Oct 2023',
      releaseDate: 'Sep 12, 2024',
    };
  }

  // DeepSeek models
  if (id.includes('deepseek-reasoner') || id.includes('deepseek-r1')) {
    return {
      description: 'DeepSeek\'s state-of-the-art open-source reasoning model using advanced reinforcement learning for math and coding.',
      contextWindow: '64,000 tokens',
      knowledgeCutoff: 'Dec 2023',
      releaseDate: 'Jan 20, 2025',
    };
  }
  if (id.includes('deepseek-chat') || id.includes('deepseek-v3')) {
    return {
      description: 'Highly cost-effective general conversational model with excellent coding, translation, and general reasoning.',
      contextWindow: '64,000 tokens',
      knowledgeCutoff: 'Dec 2023',
      releaseDate: 'Dec 26, 2024',
    };
  }

  // Default fallback description
  return {
    description: 'Advanced large language model optimized for secure, responsive, and intelligent conversations.',
    contextWindow: '128,000 tokens',
    knowledgeCutoff: 'Dec 2023',
    releaseDate: 'N/A',
  };
}
