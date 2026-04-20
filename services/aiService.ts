// aiService.ts
// Uses OpenAI to deconstruct complex tasks into atomic, manageable sub-tasks to eliminate procrastination.

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export interface DeconstructedSubtask {
  text: string;
  timeTag: string; // e.g., '10m', '5m'
}

export async function deconstructTask(taskText: string): Promise<DeconstructedSubtask[]> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
    throw new Error('OpenAI API Key is missing. Please add it to your .env file.');
  }

  const prompt = `You are a productivity expert for a futuristic app called VELURA.
Your goal is to eliminate procrastination. The user has a task: "${taskText}".
Break this task down into 2 to 4 tiny, strictly actionable "atomic" sub-tasks. 
Each sub-task should feel incredibly easy and take 5-15 minutes max.

Respond ONLY with a valid JSON array of objects. Do not include markdown formatting or extra text.
Format: [{"text": "subtask description", "timeTag": "5m"}, ... ]
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Or 'gpt-4o-mini' for fast/cheap deconstruction
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch from OpenAI');
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Attempt to parse JSON
    const parsedSubtasks: DeconstructedSubtask[] = JSON.parse(content);
    return parsedSubtasks;
  } catch (error) {
    console.error('[aiService] Task Deconstruction Failed:', error);
    throw error;
  }
}

export interface NeuralVentedTask {
  text: string;
  priority: 'High' | 'Medium' | 'Low';
  energyCost: 'High' | 'Low'; // Guessed from tone
}

export async function parseNeuralVenting(ventText: string): Promise<NeuralVentedTask[]> {
  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'YOUR_OPENAI_API_KEY_HERE') {
    throw new Error('OpenAI API Key is missing. Please add it to your .env file.');
  }

  const VENT_SYSTEM_PROMPT = `You are the VELURA Neural Engine. The user is doing a "Neural Vent" - dumping their chaotic thoughts, anxieties, and scattered to-dos in raw stream-of-consciousness.
Your job is to extract actionable tasks from this emotional dump. 
For each task, infer:
1. priority ('High', 'Medium', 'Low') based on urgency/stress in their words.
2. energyCost ('High', 'Low') based on how draining the task sounds.

Respond ONLY with a valid JSON array of objects. Format: [{"text": "clean task description", "priority": "High", "energyCost": "High"}, ... ]`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: VENT_SYSTEM_PROMPT },
          { role: 'user', content: ventText }
        ],
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Failed to fetch from OpenAI');
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Attempt to parse JSON
    const parsedTasks: NeuralVentedTask[] = JSON.parse(content);
    return parsedTasks;
  } catch (error) {
    console.error('[aiService] Neural Venting Parse Failed:', error);
    throw error;
  }
}
