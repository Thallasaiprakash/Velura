import AsyncStorage from '@react-native-async-storage/async-storage';

const SUGGESTIONS_STORAGE_KEY = 'velura_task_patterns';

export interface TaskPattern {
  text: string;
  count: number;
  lastSeen: number;
  weekday: number; // 0-6 (Sun-Sat)
}

/**
 * Records a task usage to learn patterns.
 */
export async function recordTaskUsage(text: string): Promise<void> {
  try {
    const rawData = await AsyncStorage.getItem(SUGGESTIONS_STORAGE_KEY);
    const patterns: TaskPattern[] = rawData ? JSON.parse(rawData) : [];
    
    const today = new Date();
    const weekday = today.getDay();
    const normalizedText = text.trim().toLowerCase();
    
    // Find if this task exists for this weekday
    const index = patterns.findIndex(p => 
      p.text.toLowerCase() === normalizedText && p.weekday === weekday
    );
    
    if (index > -1) {
      patterns[index].count += 1;
      patterns[index].lastSeen = Date.now();
    } else {
      patterns.push({
        text: text.trim(),
        count: 1,
        lastSeen: Date.now(),
        weekday
      });
    }
    
    // Sort by count (weighted by recency could be better, but count is a good start)
    await AsyncStorage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(patterns.slice(-500))); // Keep last 500 patterns
  } catch (error) {
    console.error('[suggestionService] Failed to record task usage:', error);
  }
}

/**
 * Gets suggested tasks for the current day.
 */
export async function getSuggestions(): Promise<string[]> {
  try {
    const rawData = await AsyncStorage.getItem(SUGGESTIONS_STORAGE_KEY);
    if (!rawData) return [];
    
    const patterns: TaskPattern[] = JSON.parse(rawData);
    const today = new Date();
    const weekday = today.getDay();
    
    // Find tasks that have been added at least twice on this weekday
    // and aren't too old
    const suggestions = patterns
      .filter(p => p.weekday === weekday && p.count >= 2)
      .sort((a, b) => b.count - a.count) // Most frequent first
      .map(p => p.text)
      .slice(0, 5); // Return top 5
      
    return suggestions;
  } catch (error) {
    console.error('[suggestionService] Failed to get suggestions:', error);
    return [];
  }
}
