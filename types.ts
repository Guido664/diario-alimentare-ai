export interface UserProfile {
  age?: number;
  gender?: 'male' | 'female' | 'other';
  height?: number; // in cm
  weight?: number; // in kg
  lifestyle?: 'sedentary' | 'moderately_active' | 'active';
  goal?: 'lose_weight' | 'gain_muscle' | 'maintain_weight' | 'improve_performance' | 'eat_healthier' | 'identify_issues';
  conditions?: string; // Allergies, intolerances, medical conditions, diet choices
}

export interface NutrientAnalysis {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  summary: string;
  micronutrients?: string[];
}

export interface DailyEntry {
  date: string; // YYYY-MM-DD
  meals: string;
  activity: string;
  analysis?: NutrientAnalysis;
  isNonWorkingDay?: boolean;
}

export type ViewMode = 'daily' | 'weekly' | 'monthly' | 'annual';