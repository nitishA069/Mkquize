import { GoogleGenAI, Type } from '@google/genai';
import { Question, DifficultyLevel } from '../src/types';

export interface ExtractedQuizData {
  quizInfo: {
    title: string;
    subject: string;
    className: string;
    description: string;
  };
  questions: Omit<Question, 'id' | 'quizId'>[];
}

export interface AIProvider {
  extractQuizFromText(text: string): Promise<ExtractedQuizData>;
  extractQuizFromFile(base64Data: string, mimeType: string): Promise<ExtractedQuizData>;
}

// 1. GEMINI PROVIDER
export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }

  async extractQuizFromText(text: string): Promise<ExtractedQuizData> {
    const prompt = `
You are an expert examiner. Extract structured Multiple Choice Questions (MCQs) from the following exam text.
The text might be in English, Hindi, Hinglish, or mixed-languages.
Generate a suitable quiz title, subject, target student class, and description based on the content.

Each question must contain:
- questionText: The full text of the question (preserve Hindi/Devanagari characters fully if present).
- options: Exactly 4 or 5 distinct choice strings as presented.
- correctOption: 0-indexed integer (0 for Option 1, 1 for Option 2, etc.) indicating the correct answer. You must deduce the correct option by thoroughly analyzing the questions OR finding any embedded answer key in the text.
- explanation: Clear rationale explaining why that is the correct answer.
- marks: Estimated marks (default to 4 or 5).
- negativeMarks: Estimated penalty for wrong answer (default to 1 or 0).
- difficulty: Rate difficulty as one of "Easy", "Medium", "Hard" based on depth.
- tags: Array of 1-3 relevant subject/topic metadata tags.

Here is the document text:
-----------------------
${text}
-----------------------
`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quizInfo: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subject: { type: Type.STRING },
                className: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "subject", "className", "description"]
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionText: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctOption: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  marks: { type: Type.INTEGER },
                  negativeMarks: { type: Type.INTEGER },
                  difficulty: { type: Type.STRING },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["questionText", "options", "correctOption", "explanation", "marks", "negativeMarks", "difficulty", "tags"]
              }
            }
          },
          required: ["quizInfo", "questions"]
        }
      }
    });

    const outputText = response.text || '';
    return JSON.parse(outputText.trim()) as ExtractedQuizData;
  }

  async extractQuizFromFile(base64Data: string, mimeType: string): Promise<ExtractedQuizData> {
    const cleanBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
    const filePart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64
      }
    };

    const promptText = `
You are an expert examiner. Extract structured Multiple Choice Questions (MCQs) from this attached document/image.
The document might be in English, Hindi, Hinglish, or mixed-languages.
Generate a suitable quiz title, subject, target student class, and description based on the content.

Each question must contain:
- questionText: The full text of the question (preserve Hindi/Devanagari characters fully if present).
- options: Exactly 4 or 5 distinct choice strings as presented.
- correctOption: 0-indexed integer (0 for Option 1, 1 for Option 2, etc.) indicating the correct answer. You must deduce the correct option by thoroughly analyzing the questions OR finding any embedded answer key in the text.
- explanation: Clear rationale explaining why that is the correct answer.
- marks: Estimated marks (default to 4 or 5).
- negativeMarks: Estimated penalty for wrong answer (default to 1 or 0).
- difficulty: Rate difficulty as one of "Easy", "Medium", "Hard" based on depth.
- tags: Array of 1-3 relevant subject/topic metadata tags.
`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        filePart,
        { text: promptText }
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quizInfo: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                subject: { type: Type.STRING },
                className: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["title", "subject", "className", "description"]
            },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  questionText: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctOption: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  marks: { type: Type.INTEGER },
                  negativeMarks: { type: Type.INTEGER },
                  difficulty: { type: Type.STRING },
                  tags: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  }
                },
                required: ["questionText", "options", "correctOption", "explanation", "marks", "negativeMarks", "difficulty", "tags"]
              }
            }
          },
          required: ["quizInfo", "questions"]
        }
      }
    });

    const outputText = response.text || '';
    return JSON.parse(outputText.trim()) as ExtractedQuizData;
  }
}

// 2. OPENROUTER PROVIDER
export class OpenRouterProvider implements AIProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extractQuizFromText(text: string): Promise<ExtractedQuizData> {
    const prompt = `
Extract structured Multiple Choice Questions (MCQs) from this text and return ONLY a valid JSON object matching the schema.
Schema:
{
  "quizInfo": {
    "title": "string",
    "subject": "string",
    "className": "string",
    "description": "string"
  },
  "questions": [
    {
      "questionText": "string",
      "options": ["string"],
      "correctOption": number (0-indexed),
      "explanation": "string",
      "marks": number,
      "negativeMarks": number,
      "difficulty": "Easy" | "Medium" | "Hard",
      "tags": ["string"]
    }
  ]
}

Text:
${text}
`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API responded with status ${response.status}`);
      }

      const raw = await response.json();
      const content = raw.choices?.[0]?.message?.content;
      return JSON.parse(content) as ExtractedQuizData;
    } catch (error) {
      console.error('OpenRouter Extraction failed, falling back to RuleBased:', error);
      const fallback = new RuleBasedProvider();
      return fallback.extractQuizFromText(text);
    }
  }

  async extractQuizFromFile(base64Data: string, mimeType: string): Promise<ExtractedQuizData> {
    throw new Error('Direct file/image scanning is only supported when the primary Google Gemini model is active. Please add a GEMINI_API_KEY to Settings or use the Copy-Paste Text tab instead.');
  }
}

// 3. RULE-BASED REGEX PROVIDER
export class RuleBasedProvider implements AIProvider {
  async extractQuizFromText(text: string): Promise<ExtractedQuizData> {
    console.log('Running rule-based parsing engine on text length:', text.length);

    const questions: Omit<Question, 'id' | 'quizId'>[] = [];
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

    // Let's search if there's any answer key section in the full text
    // Example: "1-B, 2-A, 3-C, 4-A" or "1. B, 2. A"
    const answerKeyMap: Record<number, string> = {};
    const keyRegex = /(?:^|\s|,)((?:q|question)?\s*\d+)\s*[:-]\s*([a-eA-ExXकखगघङ1-5]|\([a-eA-ExX]\))/gi;
    let match;
    while ((match = keyRegex.exec(text)) !== null) {
      const numPart = match[1].replace(/\D/g, '');
      const num = parseInt(numPart, 10);
      let val = match[2].toUpperCase().replace(/[()]/g, '');
      if (num && val) {
        answerKeyMap[num] = val;
      }
    }

    // Secondary line-by-line block builder
    let currentQuestionText = '';
    let currentOptions: string[] = [];
    let detectedAnswerStr = '';
    let questionNum = 1;

    const saveCurrent = () => {
      if (currentQuestionText && currentOptions.length >= 2) {
        // Map option characters to indices
        let correctIdx = 0;
        let explanation = 'Deduced from text pattern.';

        // Look for answer in answerKeyMap first
        const mapKey = answerKeyMap[questionNum];
        const answerToSearch = mapKey || detectedAnswerStr;

        if (answerToSearch) {
          const char = answerToSearch.trim().toUpperCase().replace(/[).\]\s]/g, '');
          if (['A', '1', 'क', 'A.','A)'].includes(char)) correctIdx = 0;
          else if (['B', '2', 'ख'].includes(char)) correctIdx = 1;
          else if (['C', '3', 'ग'].includes(char)) correctIdx = 2;
          else if (['D', '4', 'घ'].includes(char)) correctIdx = 3;
          else if (['E', '5', 'ङ'].includes(char)) correctIdx = 4;
          else {
            // Check if any of options contains correct answer
            const foundIdx = currentOptions.findIndex(opt => opt.toUpperCase().includes(char));
            if (foundIdx !== -1) correctIdx = foundIdx;
          }
          explanation = `Auto-extracted answer: ${answerToSearch}.`;
        } else {
          explanation = 'Verification key not found in document. Please review correct answer option.';
        }

        // Difficulty classification from keywords
        let difficulty: DifficultyLevel = 'Medium';
        const fullBlock = (currentQuestionText + ' ' + currentOptions.join(' ')).toLowerCase();
        if (fullBlock.includes('calculate') || fullBlock.includes('explain') || fullBlock.includes('prove') || fullBlock.includes('कठिन')) {
          difficulty = 'Hard';
        } else if (fullBlock.includes('what') || fullBlock.includes('who') || fullBlock.includes('नाम') || fullBlock.includes('सरल')) {
          difficulty = 'Easy';
        }

        questions.push({
          questionText: currentQuestionText,
          options: currentOptions.slice(0, 5), // max 5
          correctOption: correctIdx,
          explanation,
          marks: 4,
          negativeMarks: 1,
          difficulty,
          tags: ['General']
        });
        questionNum++;
      }
      currentQuestionText = '';
      currentOptions = [];
      detectedAnswerStr = '';
    };

    // Parse loop
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Detect question boundary (Q. 1, 1., Q1, प्रश्न 1)
      const isQuestionStart = /^(?:Q|q|Question|प्रश्न)?\s*(\d+)[\.\s\-:]+\s*(.*)/i.test(line);

      if (isQuestionStart) {
        saveCurrent();
        const m = line.match(/^(?:Q|q|Question|प्रश्न)?\s*(\d+)[\.\s\-:]+\s*(.*)/i);
        if (m) {
          questionNum = parseInt(m[1], 10) || questionNum;
          currentQuestionText = m[2];
        } else {
          currentQuestionText = line;
        }
        continue;
      }

      // Detect options
      // Forms: A), A., [A], (A), (a), (क), क)
      const optionMatch = line.match(/^([a-eA-ExXकखगघङ])[\.\)\]\s]+(.*)/i) || line.match(/^\(([a-eA-ExXकखगघङ])\)\s*(.*)/i);
      if (optionMatch && currentQuestionText) {
        currentOptions.push(optionMatch[2].trim());
        continue;
      }

      // Detect inline answer labels inside or after
      // Forms: "Answer: B", "उत्तर: ख", "Correct Option: 3", "Ans. C"
      const answerMatch = line.match(/^(?:Ans|Answer|Key|Correct|उत्तर|Ans\.)\s*[:\-=]?\s*([a-eA-Eक-ह0-9])/i);
      if (answerMatch && currentQuestionText) {
        detectedAnswerStr = answerMatch[1];
        continue;
      }

      // Accumulate multi-line questions
      if (currentQuestionText && currentOptions.length === 0) {
        currentQuestionText += ' ' + line;
      } else if (currentOptions.length > 0) {
        // Appends to last option
        currentOptions[currentOptions.length - 1] += ' ' + line;
      }
    }

    // Clear residuals
    saveCurrent();

    // Make mock header
    const sampleHeaders = ['Science', 'History', 'Math', 'Language', 'GK'];
    const heading = lines[0] ? lines[0].slice(0, 50) : 'Generated Quick Quiz';

    return {
      quizInfo: {
        title: heading,
        subject: sampleHeaders.find(sh => text.toLowerCase().includes(sh.toLowerCase())) || 'General Studies',
        className: 'Class ' + (text.match(/class\s*(\d+)/i)?.[1] || '10'),
        description: `Automated assessment comprising ${questions.length} questions parsed from PDF material.`
      },
      questions: questions.length > 0 ? questions : [
        // Minimum placeholder so parsing is never blank
        {
          questionText: "Sample Question (Automated fallback: please copy/paste your questions here)",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctOption: 0,
          explanation: "Standard placeholder created due to text extraction limits.",
          marks: 4,
          negativeMarks: 1,
          difficulty: "Easy",
          tags: ["Practice"]
        }
      ]
    };
  }

  async extractQuizFromFile(base64Data: string, mimeType: string): Promise<ExtractedQuizData> {
    throw new Error('Direct file/image scanning is only supported when the primary Google Gemini model is active. Please add a GEMINI_API_KEY to Settings or use the Copy-Paste Text tab instead.');
  }
}

// 4. FACTORY SELECTOR
export function getAIProvider(): AIProvider {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (geminiKey && geminiKey !== 'MY_GEMINI_API_KEY' && geminiKey.trim() !== '') {
    console.log('Activating Gemini Engine...');
    return new GeminiProvider(geminiKey);
  } else if (openRouterKey && openRouterKey !== 'MY_OPENROUTER_API_KEY' && openRouterKey.trim() !== '') {
    console.log('Activating OpenRouter Backup Engine...');
    return new OpenRouterProvider(openRouterKey);
  } else {
    console.log('API keys unavailable or placeholders. Activating RuleBased Engine...');
    return new RuleBasedProvider();
  }
}
