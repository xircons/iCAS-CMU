import api from '../../../config/api';

export interface MoodMatchingAnswers {
  [questionId: string]: string | string[];
}

export interface RecommendedClub {
  club: {
    id: number;
    name: string;
    description?: string;
    category?: string;
    memberCount?: number;
    meetingDay?: string;
    location?: string;
    logo?: string;
  };
  matchScore: number;
  matchPercentage: number;
  reasons: string[]; // Reasons why this club was recommended
}

export interface RecommendationResponse {
  clubs: RecommendedClub[];
  totalMatches: number;
}

export const recommendationApi = {
  // Submit mood matching answers and get recommendations
  submitMoodMatching: async (answers: MoodMatchingAnswers): Promise<RecommendationResponse> => {
    const response = await api.post('/recommendations/mood-matching', { answers });
    return response.data;
  },

  // Get recommended clubs based on user profile
  getRecommendedClubs: async (): Promise<RecommendedClub[]> => {
    const response = await api.get('/recommendations/clubs');
    return response.data.clubs;
  },

  // Get survey status
  getSurveyStatus: async (): Promise<{ completed: boolean; completedAt?: string }> => {
    const response = await api.get('/recommendations/survey-status');
    return response.data;
  },

  // Submit interest survey answers
  submitInterestSurvey: async (answers: {
    categories: string[];
    preferredActivities: string[];
    timeCommitment: string;
    experienceLevel: string;
  }): Promise<void> => {
    await api.post('/recommendations/interest-survey', { answers });
  },
};

