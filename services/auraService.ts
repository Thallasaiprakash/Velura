import { Chronotype, EnergyLevel } from './taskService';

// Determines the optimal energy level for a given chronotype and hour of the day.
export function getCurrentEnergyState(chronotype: Chronotype | undefined, date: Date = new Date()): EnergyLevel {
  const currentHour = date.getHours();
  // Default to third-bird if chronotype isn't set
  const ct = chronotype || 'third-bird';

  switch (ct) {
    case 'lion': // Lark equivalent
      if (currentHour >= 5 && currentHour < 11) return 'force';   // Morning Peak
      if (currentHour >= 11 && currentHour < 16) return 'flow';   // Midday Steady
      return 'fade';                                              // Late Afternoon Dip
      
    case 'wolf': // Owl equivalent
      if (currentHour >= 17 || currentHour < 3) return 'force';   // Evening/Night Peak
      if (currentHour >= 11 && currentHour < 17) return 'flow';   // Afternoon Steady
      return 'fade';                                              // Morning Dip

    case 'bear': // Balanced
      if (currentHour >= 9 && currentHour < 12) return 'force';   // Morning Peak
      if (currentHour >= 14 && currentHour < 17) return 'flow';   // Afternoon Flow
      return 'fade';                                              // Early Morning/Night/Midday Dip

    case 'third-bird':
    default:
      if (currentHour >= 8 && currentHour < 12) return 'force';   // 8 AM - 12 PM (Peak)
      if (currentHour >= 12 && currentHour < 17) return 'flow';   // 12 PM - 5 PM (Steady)
      return 'fade';                                              // After 5 PM   (Low Energy)
  }
}

// Checks if a task scheduled at a specific time falls in a bio-dip period
export function isTimeInBioDip(chronotype: Chronotype | undefined, timeStr: string): boolean {
  if (!timeStr) return false;
  
  // Basic parser for "HH:MM AM/PM"
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return false;

  let h = parseInt(match[1]);
  const m = parseInt(match[2]);
  const ampm = match[3];

  if (ampm) {
    if (ampm.toUpperCase() === 'PM' && h < 12) h += 12;
    if (ampm.toUpperCase() === 'AM' && h === 12) h = 0;
  }

  const d = new Date();
  d.setHours(h, m, 0, 0);
  
  const state = getCurrentEnergyState(chronotype, d);
  return state === 'fade';
}

// Gives a descriptive text of what the user is likely feeling
export function getEnergyDescription(state: EnergyLevel): string {
  switch (state) {
    case 'force': return "Peak Momentum. Tackle the hard stuff.";
    case 'flow': return "Flow State. Keep a steady pace.";
    case 'fade': return "Recharging. Do light work or rest.";
  }
}
