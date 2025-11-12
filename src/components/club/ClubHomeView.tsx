import React, { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { useClub } from "../../contexts/ClubContext";
import { Users, Calendar, MapPin, FileText, Edit } from "lucide-react";
import { Badge } from "../ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { RichTextEditor } from "../ui/rich-text-editor";
import { clubApi } from "../../features/club/api/clubApi";
import { useUser } from "../../App";
import { toast } from "sonner";
import { useClubSocket } from "../../features/club/hooks/useClubSocket";

export function ClubHomeView() {
  const { club, isLoading, clubId, refreshClub } = useClub();
  const { user } = useUser();
  const [isEditMode, setIsEditMode] = useState(false);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('Announcements');
  const [isSaving, setIsSaving] = useState(false);
  const isEditingRef = useRef(false);

  // Check if user is leader/admin
  const isLeaderOrAdmin = useMemo(() => {
    if (!user || !clubId) return false;
    if (user.role === 'admin') return true;
    const membership = user.memberships?.find(m => 
      String(m.clubId) === String(clubId) && m.status === 'approved'
    );
    return membership?.role === 'leader' || club?.presidentId === user.id;
  }, [user, clubId, club?.presidentId]);

  // Initialize content and title from club data
  useEffect(() => {
    if (club?.homeContent) {
      setContent(club.homeContent);
    }
    if (club?.homeTitle) {
      setTitle(club.homeTitle);
    }
  }, [club?.homeContent, club?.homeTitle]);

  // Update edit mode ref
  useEffect(() => {
    isEditingRef.current = isEditMode;
  }, [isEditMode]);

  // WebSocket for real-time updates
  useClubSocket({
    clubId: clubId || null,
    onHomeContentUpdated: (data) => {
      // Only update if user is not currently editing
      if (!isEditingRef.current && data.club) {
        if (data.club.homeContent !== undefined) {
          setContent(data.club.homeContent || '');
        }
        if (data.club.homeTitle !== undefined) {
          setTitle(data.club.homeTitle || 'Announcements');
        }
        // Refresh club data to get all updates
        refreshClub();
      }
    },
  });

  const handleSave = async () => {
    if (!clubId) return;
    
    setIsSaving(true);
    try {
      await clubApi.updateClubHomeContent(clubId, content, title);
      toast.success('Content saved successfully');
      setIsEditMode(false);
      refreshClub();
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setContent(club?.homeContent || '');
    setTitle(club?.homeTitle || 'Announcements');
    setIsEditMode(false);
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading club information...</p>
        </div>
      </div>
    );
  }

  if (!club) {
    return (
      <div className="p-4 md:p-8">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Club not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Club Info Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {club.meetingDay && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Meeting Day</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{club.meetingDay}</div>
              <p className="text-xs text-muted-foreground">Regular meetings</p>
            </CardContent>
          </Card>
        )}

        {club.location && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Location</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold truncate">{club.location}</div>
              <p className="text-xs text-muted-foreground">Meeting location</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Club Details */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={club.logo} />
                <AvatarFallback>{club.name.substring(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-semibold">{club.name}</h3>
                {club.category && (
                  <Badge variant="outline" className="mt-1">{club.category}</Badge>
                )}
              </div>
            </div>
            <Badge 
              className={
                club.status === 'active' 
                  ? 'bg-green-100 text-green-700' 
                  : club.status === 'pending'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }
            >
              {club.status}
            </Badge>
          </div>

          {club.description && (
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground">{club.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Announcements Section with Rich Text Editor */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="flex-1 min-w-0">
            {isEditMode && isLeaderOrAdmin ? (
              <Input 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base md:text-lg font-semibold max-w-full md:max-w-md"
                placeholder="Section Title"
              />
            ) : (
              <CardTitle className="text-lg md:text-xl truncate">{title}</CardTitle>
            )}
          </div>
          {isLeaderOrAdmin && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (isEditMode) {
                  handleDiscard();
                } else {
                  setIsEditMode(true);
                }
              }}
              className="ml-2 shrink-0"
            >
              <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 mr-2" />
              {isEditMode ? 'Cancel' : 'Edit'}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isEditMode ? (
            <>
              <RichTextEditor 
                content={content}
                onChange={setContent}
                editable={true}
              />
              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button variant="outline" onClick={handleDiscard} disabled={isSaving} className="w-full sm:w-auto">
                  Discard
                </Button>
              </div>
            </>
          ) : (
            <div className="min-h-[100px]">
              {content ? (
                <RichTextEditor content={content} editable={false} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No announcements yet</p>
                  {isLeaderOrAdmin && (
                    <p className="text-sm mt-2">Click Edit to add announcements</p>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

