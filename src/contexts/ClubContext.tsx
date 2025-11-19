import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { clubApi, type Club } from '../features/club/api/clubApi';
import { useUser } from '../App';
import { toast } from 'sonner';

interface ClubContextType {
  clubId: number | null;
  club: Club | null;
  isLoading: boolean;
  error: Error | null;
  refreshClub: () => Promise<void>;
}

const ClubContext = createContext<ClubContextType | undefined>(undefined);

export const useClub = () => {
  const context = useContext(ClubContext);
  if (!context) {
    throw new Error('useClub must be used within a ClubProvider');
  }
  return context;
};

// Safe version that returns null if not in a ClubProvider
export const useClubSafe = () => {
  const context = useContext(ClubContext);
  return context || { clubId: null, club: null, isLoading: false, error: null, refreshClub: async () => {} };
};

interface ClubProviderProps {
  children?: ReactNode;
}

export function ClubProvider({ children = null }: ClubProviderProps) {
  const { clubId: clubIdParam } = useParams<{ clubId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [club, setClub] = useState<Club | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Try to get clubId from params first, then from location pathname
  const clubId = useMemo(() => {
    if (clubIdParam) {
      return parseInt(clubIdParam, 10);
    }
    // Extract clubId from pathname if params not available (e.g., when sidebar is outside Routes)
    const match = location.pathname.match(/\/club\/(\d+)/);
    if (match) {
      return parseInt(match[1], 10);
    }
    return null;
  }, [clubIdParam, location.pathname]);

  // Check if user is a member of this club
  const isMemberOfClub = useMemo(() => {
    if (!user || !clubId) return false;
    // Admin can access all clubs
    if (user.role === 'admin') return true;
    // Check if user has an approved membership in this club
    const membership = user.memberships?.find(m => 
      String(m.clubId) === String(clubId) && m.status === 'approved'
    );
    return !!membership;
  }, [user, clubId]);

  const fetchClub = async () => {
    if (!clubId) {
      setClub(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const clubData = await clubApi.getClubById(clubId);
      setClub(clubData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch club'));
      setClub(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClub();
  }, [clubId, location.pathname]);

  // Redirect non-members to dashboard
  useEffect(() => {
    // Wait for loading to complete and user to be available
    if (isLoading || !user || !clubId) return;

    // Check if user is a member of this club
    if (!isMemberOfClub) {
      console.log(`User is not a member of club ${clubId}, redirecting to dashboard`);
      toast.error('คุณไม่ได้เป็นสมาชิกของชมรมนี้');
      navigate('/dashboard', { replace: true });
    }
  }, [isMemberOfClub, isLoading, user, clubId, navigate]);

  const refreshClub = async () => {
    await fetchClub();
  };

  const value: ClubContextType = {
    clubId,
    club,
    isLoading,
    error,
    refreshClub,
  };

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
}

