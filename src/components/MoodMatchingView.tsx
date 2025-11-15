import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Heart, 
  Sparkles, 
  CheckCircle2, 
  Loader2,
  ArrowRight,
  ArrowLeft,
  TrendingUp,
  Users,
  Calendar,
  MapPin
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { User } from "../App";
import { clubApi, type Club } from "../features/club/api/clubApi";
import { recommendationApi, type MoodMatchingAnswers } from "../features/recommendation/api/recommendationApi";

interface MoodMatchingViewProps {
  user: User;
  onComplete?: () => void;
}

interface MoodQuestion {
  id: string;
  type: 'single' | 'multiple' | 'scale';
  question: string;
  description?: string;
  options: {
    id: string;
    label: string;
    icon?: string;
    value: string;
    tags?: string[]; // Tags for matching with clubs
  }[];
}

interface MoodAnswers {
  [questionId: string]: string | string[];
}

const moodQuestions: MoodQuestion[] = [
  {
    id: "personality",
    type: "single",
    question: "คุณเป็นคนแบบไหน?",
    description: "เลือกคำอธิบายที่ตรงกับคุณมากที่สุด",
    options: [
      {
        id: "outgoing",
        label: "ชอบเข้าสังคม ชอบพบปะผู้คน",
        value: "outgoing",
        tags: ["social", "networking", "leadership"]
      },
      {
        id: "creative",
        label: "ชอบสร้างสรรค์และแสดงออก",
        value: "creative",
        tags: ["arts", "design", "music", "photography"]
      },
      {
        id: "analytical",
        label: "ชอบคิดวิเคราะห์และแก้ปัญหา",
        value: "analytical",
        tags: ["technology", "academic", "research"]
      },
      {
        id: "active",
        label: "ชอบเคลื่อนไหวและออกกำลังกาย",
        value: "active",
        tags: ["sports", "fitness", "outdoor"]
      },
      {
        id: "caring",
        label: "ชอบช่วยเหลือผู้อื่น",
        value: "caring",
        tags: ["volunteer", "community", "social-service"]
      }
    ]
  },
  {
    id: "weekend",
    type: "single",
    question: "วันหยุดคุณชอบทำอะไร?",
    description: "เลือกกิจกรรมที่คุณชอบทำในวันหยุด",
    options: [
      {
        id: "sports",
        label: "เล่นกีฬาหรือออกกำลังกาย",
        value: "sports",
        tags: ["sports", "fitness", "basketball", "football", "badminton"]
      },
      {
        id: "music",
        label: "ฟังเพลงหรือเล่นดนตรี",
        value: "music",
        tags: ["music", "performance", "jazz", "rock", "classical"]
      },
      {
        id: "tech",
        label: "เขียนโค้ดหรือทำโปรเจค",
        value: "tech",
        tags: ["technology", "programming", "ai", "robotics", "web-dev"]
      },
      {
        id: "volunteer",
        label: "ทำกิจกรรมจิตอาสา",
        value: "volunteer",
        tags: ["volunteer", "community", "environment", "education"]
      },
      {
        id: "arts",
        label: "วาดรูป ถ่ายภาพ หรือทำศิลปะ",
        value: "arts",
        tags: ["arts", "photography", "design", "graphic"]
      },
      {
        id: "social",
        label: "พบปะเพื่อนหรือทำกิจกรรมกลุ่ม",
        value: "social",
        tags: ["social", "networking", "events", "meetup"]
      }
    ]
  },
  {
    id: "learning",
    type: "single",
    question: "คุณอยากเรียนรู้หรือพัฒนาอะไร?",
    description: "เลือกสิ่งที่คุณสนใจอยากเรียนรู้",
    options: [
      {
        id: "new-skill",
        label: "ทักษะใหม่ๆ เช่น ภาษา โปรแกรมมิ่ง",
        value: "new-skill",
        tags: ["academic", "language", "technology", "programming"]
      },
      {
        id: "creative",
        label: "ทักษะสร้างสรรค์ เช่น ดนตรี ศิลปะ",
        value: "creative",
        tags: ["arts", "music", "design", "photography"]
      },
      {
        id: "leadership",
        label: "ทักษะการเป็นผู้นำและการจัดการ",
        value: "leadership",
        tags: ["leadership", "management", "social", "networking"]
      },
      {
        id: "sports",
        label: "ทักษะกีฬาและการออกกำลังกาย",
        value: "sports",
        tags: ["sports", "fitness", "basketball", "football"]
      },
      {
        id: "social-impact",
        label: "การสร้างผลกระทบทางสังคม",
        value: "social-impact",
        tags: ["volunteer", "community", "environment", "social-service"]
      }
    ]
  },
  {
    id: "time",
    type: "single",
    question: "คุณมีเวลาเข้าร่วมกิจกรรมเท่าไหร่?",
    description: "เลือกเวลาที่คุณสามารถเข้าร่วมได้จริง",
    options: [
      {
        id: "flexible",
        label: "ยืดหยุ่นได้ ตามตารางของชมรม",
        value: "flexible",
        tags: []
      },
      {
        id: "weekend-only",
        label: "เฉพาะวันหยุดสุดสัปดาห์",
        value: "weekend-only",
        tags: []
      },
      {
        id: "evening",
        label: "ช่วงเย็นหลังเลิกเรียน",
        value: "evening",
        tags: []
      },
      {
        id: "limited",
        label: "มีเวลาจำกัด 1-2 ชั่วโมง/สัปดาห์",
        value: "limited",
        tags: []
      }
    ]
  },
  {
    id: "experience",
    type: "single",
    question: "คุณมีประสบการณ์ในกิจกรรมเหล่านี้แค่ไหน?",
    description: "เลือกระดับประสบการณ์ของคุณ",
    options: [
      {
        id: "beginner",
        label: "เริ่มต้น - อยากเรียนรู้ใหม่",
        value: "beginner",
        tags: []
      },
      {
        id: "some",
        label: "มีบ้าง - ต้องการพัฒนาต่อ",
        value: "some",
        tags: []
      },
      {
        id: "experienced",
        label: "มีประสบการณ์ - พร้อมช่วยสอน",
        value: "experienced",
        tags: []
      }
    ]
  },
  {
    id: "language",
    type: "multiple",
    question: "คุณใช้ภาษาใดได้บ้าง?",
    description: "เลือกภาษาที่คุณใช้ได้ (เลือกได้หลายข้อ)",
    options: [
      {
        id: "thai",
        label: "ภาษาไทย",
        value: "thai",
        tags: []
      },
      {
        id: "english",
        label: "ภาษาอังกฤษ",
        value: "english",
        tags: []
      },
      {
        id: "chinese",
        label: "ภาษาจีน",
        value: "chinese",
        tags: []
      },
      {
        id: "japanese",
        label: "ภาษาญี่ปุ่น",
        value: "japanese",
        tags: []
      },
      {
        id: "korean",
        label: "ภาษาเกาหลี",
        value: "korean",
        tags: []
      },
      {
        id: "other",
        label: "ภาษาอื่นๆ",
        value: "other",
        tags: []
      }
    ]
  },
  {
    id: "gender",
    type: "single",
    question: "คุณต้องการเข้าร่วมชมรมที่เปิดรับเพศใด?",
    description: "เลือกตามความสะดวกของคุณ",
    options: [
      {
        id: "any",
        label: "ไม่จำกัด",
        value: "any",
        tags: []
      },
      {
        id: "same",
        label: "เพศเดียวกัน",
        value: "same",
        tags: []
      },
      {
        id: "mixed",
        label: "ผสม",
        value: "mixed",
        tags: []
      }
    ]
  }
];

export function MoodMatchingView({ user, onComplete }: MoodMatchingViewProps) {
  const navigate = useNavigate();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<MoodAnswers>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [matchedClubs, setMatchedClubs] = useState<Club[]>([]);
  const [matchScore, setMatchScore] = useState<{ [clubId: number]: number }>({});

  const currentQuestion = moodQuestions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / moodQuestions.length) * 100;
  const isLastQuestion = currentQuestionIndex === moodQuestions.length - 1;

  const handleAnswer = (value: string) => {
    if (currentQuestion.type === 'multiple') {
      const currentAnswers = (answers[currentQuestion.id] as string[]) || [];
      const newAnswers = currentAnswers.includes(value)
        ? currentAnswers.filter(a => a !== value)
        : [...currentAnswers, value];
      setAnswers({ ...answers, [currentQuestion.id]: newAnswers });
    } else {
      setAnswers({ ...answers, [currentQuestion.id]: value });
    }
  };

  const handleNext = () => {
    const currentAnswer = answers[currentQuestion.id];
    
    if (!currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0)) {
      toast.error('กรุณาเลือกคำตอบก่อน');
      return;
    }

    if (isLastQuestion) {
      handleSubmit();
    } else {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleBack = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const calculateMatchScore = (club: Club, answers: MoodAnswers): number => {
    let score = 0;
    const allTags: string[] = [];

    // Collect all tags from answers
    moodQuestions.forEach(question => {
      const answer = answers[question.id];
      if (answer) {
        const selectedOptions = Array.isArray(answer) ? answer : [answer];
        selectedOptions.forEach(optionValue => {
          const option = question.options.find(opt => opt.value === optionValue);
          if (option?.tags) {
            allTags.push(...option.tags);
          }
        });
      }
    });

    // Match with club category and description
    const clubText = `${club.category || ''} ${club.description || ''} ${club.name}`.toLowerCase();
    
    allTags.forEach(tag => {
      if (clubText.includes(tag.toLowerCase())) {
        score += 10;
      }
    });

    // Boost score for popular clubs
    if (club.memberCount && club.memberCount > 20) {
      score += 5;
    }

    return score;
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Try API call first, fallback to local calculation if API not available
      try {
        const response = await recommendationApi.submitMoodMatching(answers as MoodMatchingAnswers);
        const clubs = response.clubs.map(item => item.club);
        const scores: { [clubId: number]: number } = {};
        response.clubs.forEach(item => {
          scores[item.club.id] = item.matchScore;
        });
        
        setMatchedClubs(clubs);
        setMatchScore(scores);
        setIsCompleted(true);
        toast.success('พบชมรมที่เหมาะกับคุณแล้ว!');
      } catch (apiError: any) {
        // Fallback to local calculation if API is not available
        console.log('API not available, using local calculation');
        
        const allClubs = await clubApi.getAllClubs();
        
        // Calculate match scores
        const scores: { [clubId: number]: number } = {};
        allClubs.forEach(club => {
          scores[club.id] = calculateMatchScore(club, answers);
        });

        // Sort clubs by match score
        const sortedClubs = allClubs
          .map(club => ({
            club,
            score: scores[club.id]
          }))
          .sort((a, b) => b.score - a.score)
          .filter(item => item.score > 0) // Only show clubs with positive match score
          .slice(0, 12) // Top 12 matches
          .map(item => item.club);

        setMatchedClubs(sortedClubs);
        setMatchScore(scores);
        setIsCompleted(true);
        toast.success('พบชมรมที่เหมาะกับคุณแล้ว!');
      }
      
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('Error submitting mood matching:', error);
      toast.error('ไม่สามารถประมวลผลได้ กรุณาลองอีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAnswerLabel = (questionId: string): string => {
    const answer = answers[questionId];
    if (!answer) return '';
    
    const question = moodQuestions.find(q => q.id === questionId);
    if (!question) return '';

    if (Array.isArray(answer)) {
      return answer.map(val => {
        const option = question.options.find(opt => opt.value === val);
        return option?.label || val;
      }).join(', ');
    } else {
      const option = question.options.find(opt => opt.value === answer);
      return option?.label || answer;
    }
  };

  if (isCompleted) {
    return (
      <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
              <h2 className="text-2xl font-bold">พบชมรมที่เหมาะกับคุณ!</h2>
              <p className="text-muted-foreground">
                เราพบ {matchedClubs.length} ชมรมที่ตรงกับความสนใจของคุณ
              </p>
            </div>
          </CardContent>
        </Card>

        {matchedClubs.length > 0 && (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  ชมรมที่แนะนำสำหรับคุณ
                </CardTitle>
                <CardDescription>
                  เรียงตามความเหมาะสมกับคุณ
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {matchedClubs.map((club, index) => {
                const score = matchScore[club.id] || 0;
                const matchPercentage = Math.min(100, Math.round((score / 100) * 100));
                
                return (
                  <Card key={club.id} className="hover:shadow-lg transition-shadow border-primary/20">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="default" className="bg-primary">
                              #{index + 1}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {matchPercentage}% Match
                            </Badge>
                          </div>
                          <CardTitle className="text-base">{club.name}</CardTitle>
                          {club.category && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {club.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {club.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {club.description}
                        </p>
                      )}
                      <div className="space-y-2 text-sm text-muted-foreground">
                        {club.memberCount !== undefined && (
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            <span>{club.memberCount} สมาชิก</span>
                          </div>
                        )}
                        {club.meetingDay && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3" />
                            <span>{club.meetingDay}</span>
                          </div>
                        )}
                        {club.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3" />
                            <span>{club.location}</span>
                          </div>
                        )}
                      </div>
                      <Button
                        className="w-full mt-2"
                        onClick={() => navigate(`/clubs`)}
                      >
                        ดูรายละเอียด
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-center gap-4">
              <Button variant="outline" onClick={() => navigate('/clubs')}>
                ดูชมรมทั้งหมด
              </Button>
              <Button onClick={() => {
                setCurrentQuestionIndex(0);
                setAnswers({});
                setIsCompleted(false);
                setMatchedClubs([]);
                setMatchScore({});
              }}>
                ทำใหม่
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  const currentAnswer = answers[currentQuestion.id];
  const isAnswerSelected = currentQuestion.type === 'multiple'
    ? Array.isArray(currentAnswer) && currentAnswer.length > 0
    : !!currentAnswer;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Heart className="h-6 w-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">Match Club</h1>
        </div>
        <p className="text-muted-foreground">
          ตอบคำถามสั้นๆ เพื่อค้นหาชมรมที่เหมาะกับคุณ
        </p>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>คำถาม {currentQuestionIndex + 1} จาก {moodQuestions.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{currentQuestion.question}</CardTitle>
          {currentQuestion.description && (
            <CardDescription>{currentQuestion.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={currentQuestion.type === 'multiple' ? undefined : (currentAnswer as string)}
            onValueChange={handleAnswer}
            className="space-y-3"
          >
            {currentQuestion.options.map((option) => {
              const isSelected = currentQuestion.type === 'multiple'
                ? Array.isArray(currentAnswer) && currentAnswer.includes(option.value)
                : currentAnswer === option.value;

              return (
                <div
                  key={option.id}
                  className={`flex items-center space-x-2 p-4 border rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'hover:bg-muted/50 hover:border-primary/50'
                  }`}
                  onClick={() => handleAnswer(option.value)}
                >
                  {currentQuestion.type === 'multiple' ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleAnswer(option.value)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  ) : (
                    <RadioGroupItem value={option.value} id={option.id} />
                  )}
                  <Label
                    htmlFor={option.id}
                    className="flex-1 cursor-pointer font-normal"
                  >
                    {option.label}
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentQuestionIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          ย้อนกลับ
        </Button>
        <Button
          onClick={handleNext}
          disabled={!isAnswerSelected || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              กำลังประมวลผล...
            </>
          ) : isLastQuestion ? (
            <>
              เสร็จสิ้น
              <CheckCircle2 className="h-4 w-4 ml-2" />
            </>
          ) : (
            <>
              ถัดไป
              <ArrowRight className="h-4 w-4 ml-2" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

