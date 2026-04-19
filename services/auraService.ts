import { Chronotype, EnergyLevel } from './taskService';

// Determines the optimal energy level for a given chronotype and hour of the day.
export function getCurrentEnergyState(chronotype: Chronotype | undefined, date: Date = new Date()): EnergyLevel {
  const currentHour = date.getHours();
  // Default to third-bird if chronotype isn't set
  const ct = chronotype || 'third-bird';

  switch (ct) {
    case 'lark':
      // Larks peak early
      if (currentHour >= 5 && currentHour < 10) return 'force';   // 5 AM - 10 AM (Peak)
      if (currentHour >= 10 && currentHour < 15) return 'flow';   // 10 AM - 3 PM  (Steady)
      return 'fade';                                              // After 3 PM   (Low Energy)
      
    case 'owl':
      // Owls peak late
      if (currentHour >= 6 && currentHour < 11) return 'fade';    // 6 AM - 11 AM (Low Energy)
      if (currentHour >= 11 && currentHour < 17) return 'flow';   // 11 AM - 5 PM (Steady)
      if (currentHour >= 17 || currentHour < 2) return 'force';   // 5 PM - 2 AM  (Peak)
      return 'fade';

    case 'third-bird':
    default:
      // The standard 9-to-5 curve
      if (currentHour >= 8 && currentHour < 12) return 'force';   // 8 AM - 12 PM (Peak)
      if (currentHour >= 12 && currentHour < 17) return 'flow';   // 12 PM - 5 PM (Steady)
      return 'fade';                                              // After 5 PM   (Low Energy)
  }
}

// Gives a descriptive text of what the user is likely feeling
export function getEnergyDescription(state: EnergyLevel): string {
  switch (state) {
    case 'force': return "Peak Momentum. Tackle the hard stuff.";
    case 'flow': return "Flow State. Keep a steady pace.";
    case 'fade': return "Recharging. Do light work or rest.";
  }
}
