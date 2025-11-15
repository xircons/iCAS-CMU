import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Checkbox } from "./ui/checkbox";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  GraduationCap, 
  Music, 
  Dumbbell, 
  Code, 
  Heart, 
  BookOpen, 
  Camera, 
  Users,
  CheckCircle2,
  Loader2,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import type { User } from "../App";

interface InterestSurveyViewProps {
  user: User;
  onComplete?: () => void;
}

interface InterestCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  subcategories: string[];
}

interface SurveyAnswers {
  categories: string[];
  preferredActivities: string[];
  timeCommitment: string;
  experienceLevel: string;
}

const interestCategories: InterestCategory[] = [
  {
    id: "sports",
    name: "กีฬาและการออกกำลังกาย",
    icon: Dumbbell,
    description: "บาสเกตบอล, ฟุตบอล, ว่ายน้ำ, วิ่ง, โยคะ",
    subcategories: ["บาสเกตบอล", "ฟุตบอล", "ว่ายน้ำ", "วิ่ง", "โยคะ", "แบดมินตัน", "เทนนิส", "วอลเลย์บอล"],
  },
  {
    id: "music",
    name: "ดนตรีและการแสดง",
    icon: Music,
    description: "ดนตรีสากล, ดนตรีไทย, ร้องเพลง, แจ๊ส",
    subcategories: ["ดนตรีสากล", "ดนตรีไทย", "ร้องเพลง", "แจ๊ส", "ร็อค", "คลาสสิก", "อคูสติก"],
  },
  {
    id: "technology",
    name: "เทคโนโลยีและนวัตกรรม",
    icon: Code,
    description: "โปรแกรมมิ่ง, AI, หุ่นยนต์, IoT",
    subcategories: ["โปรแกรมมิ่ง", "AI/ML", "หุ่นยนต์", "IoT", "Web Development", "Mobile App", "Game Development"],
  },
  {
    id: "volunteer",
    name: "จิตอาสาและสังคม",
    icon: Heart,
    description: "ช่วยเหลือชุมชน, สิ่งแวดล้อม, การศึกษา",
    subcategories: ["ช่วยเหลือชุมชน", "สิ่งแวดล้อม", "การศึกษา", "สุขภาพ", "สัตว์", "ผู้สูงอายุ"],
  },
  {
    id: "academic",
    name: "วิชาการและการศึกษา",
    icon: BookOpen,
    description: "วิจัย, อ่านหนังสือ, แลกเปลี่ยนความรู้",
    subcategories: ["วิจัย", "อ่านหนังสือ", "แลกเปลี่ยนความรู้", "แข่งขันวิชาการ", "ภาษา", "คณิตศาสตร์"],
  },
  {
    id: "arts",
    name: "ศิลปะและความคิดสร้างสรรค์",
    icon: Camera,
    description: "ภาพถ่าย, วาดรูป, ออกแบบ, ศิลปะ",
    subcategories: ["ภาพถ่าย", "วาดรูป", "ออกแบบ", "ศิลปะ", "กราฟิก", "แอนิเมชัน"],
  },
  {
    id: "social",
    name: "สังคมและการเข้าสังคม",
    icon: Users,
    description: "พบปะเพื่อน, กิจกรรมกลุ่ม, การพูด",
    subcategories: ["พบปะเพื่อน", "กิจกรรมกลุ่ม", "การพูด", "การเจรจา", "การเป็นผู้นำ"],
  },
];

export function InterestSurveyView({ user, onComplete }: InterestSurveyViewProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [answers, setAnswers] = useState<SurveyAnswers>({
    categories: [],
    preferredActivities: [],
    timeCommitment: "",
    experienceLevel: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Check if user has already completed survey
  useEffect(() => {
    // TODO: Check if user has completed survey
    // const checkSurveyStatus = async () => {
    //   const status = await surveyApi.getSurveyStatus();
    //   if (status.completed) {
    //     setIsCompleted(true);
    //   }
    // };
    // checkSurveyStatus();
  }, []);

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const handleCategoryToggle = (categoryId: string) => {
    setAnswers((prev) => ({
      ...prev,
      categories: prev.categories.includes(categoryId)
        ? prev.categories.filter((id) => id !== categoryId)
        : [...prev.categories, categoryId],
    }));
  };

  const handleActivityToggle = (activity: string) => {
    setAnswers((prev) => ({
      ...prev,
      preferredActivities: prev.preferredActivities.includes(activity)
        ? prev.preferredActivities.filter((a) => a !== activity)
        : [...prev.preferredActivities, activity],
    }));
  };

  const handleNext = () => {
    if (currentStep === 1 && answers.categories.length === 0) {
      toast.error('กรุณาเลือกอย่างน้อย 1 หมวดหมู่ที่สนใจ');
      return;
    }
    if (currentStep === 2 && answers.preferredActivities.length === 0) {
      toast.error('กรุณาเลือกอย่างน้อย 1 กิจกรรมที่สนใจ');
      return;
    }
    if (currentStep === 3 && !answers.timeCommitment) {
      toast.error('กรุณาเลือกเวลาที่สามารถเข้าร่วมกิจกรรมได้');
      return;
    }
    if (currentStep === 4 && !answers.experienceLevel) {
      toast.error('กรุณาเลือกระดับประสบการณ์');
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // TODO: Replace with actual API call
      // await surveyApi.submitSurvey(answers);
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsCompleted(true);
      toast.success('บันทึกข้อมูลความสนใจสำเร็จ! ระบบจะแนะนำชมรมที่เหมาะสมให้คุณ');
      
      if (onComplete) {
        onComplete();
      }
    } catch (error: any) {
      console.error('Error submitting survey:', error);
      toast.error('ไม่สามารถบันทึกข้อมูลได้ กรุณาลองอีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-16 w-16 mx-auto text-green-600" />
              <h2 className="text-2xl font-bold">สำเร็จ!</h2>
              <p className="text-muted-foreground">
                เราได้บันทึกข้อมูลความสนใจของคุณแล้ว
              </p>
              <p className="text-sm text-muted-foreground">
                ระบบจะแนะนำชมรมที่เหมาะสมกับคุณในหน้า Join Clubs
              </p>
              <Button onClick={() => window.location.href = '/clubs'}>
                ไปที่หน้า Join Clubs
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          <h1 className="text-2xl md:text-3xl font-bold">แบบสอบถามความสนใจ</h1>
        </div>
        <p className="text-muted-foreground">
          ช่วยเราค้นหาชมรมที่เหมาะสมกับคุณ
        </p>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>ขั้นตอน {currentStep} จาก {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Select Interest Categories */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>คุณสนใจในหมวดหมู่ใดบ้าง?</CardTitle>
            <CardDescription>
              เลือกหมวดหมู่ที่คุณสนใจ (สามารถเลือกได้หลายหมวดหมู่)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {interestCategories.map((category) => {
                const Icon = category.icon;
                const isSelected = answers.categories.includes(category.id);
                return (
                  <Card
                    key={category.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => handleCategoryToggle(category.id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-lg ${
                          isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold mb-1">{category.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {category.description}
                          </p>
                        </div>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleCategoryToggle(category.id)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Preferred Activities */}
      {currentStep === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>กิจกรรมใดที่คุณสนใจ?</CardTitle>
            <CardDescription>
              เลือกกิจกรรมที่คุณอยากเข้าร่วม (สามารถเลือกได้หลายกิจกรรม)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {interestCategories
              .filter((cat) => answers.categories.includes(cat.id))
              .map((category) => (
                <div key={category.id} className="space-y-2">
                  <h3 className="font-semibold text-sm">{category.name}</h3>
                  <div className="flex flex-wrap gap-2">
                    {category.subcategories.map((activity) => {
                      const isSelected = answers.preferredActivities.includes(activity);
                      return (
                        <Badge
                          key={activity}
                          variant={isSelected ? "default" : "outline"}
                          className="cursor-pointer px-3 py-1"
                          onClick={() => handleActivityToggle(activity)}
                        >
                          {activity}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Time Commitment */}
      {currentStep === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>คุณสามารถเข้าร่วมกิจกรรมได้เท่าไหร่?</CardTitle>
            <CardDescription>
              เลือกเวลาที่คุณสามารถเข้าร่วมกิจกรรมชมรมได้
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers.timeCommitment}
              onValueChange={(value) =>
                setAnswers((prev) => ({ ...prev, timeCommitment: value }))
              }
              className="space-y-3"
            >
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="low" id="low" />
                <Label htmlFor="low" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">น้อย (1-2 ชั่วโมง/สัปดาห์)</div>
                    <div className="text-sm text-muted-foreground">
                      เหมาะสำหรับผู้ที่ต้องการเข้าร่วมกิจกรรมเป็นครั้งคราว
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="medium" id="medium" />
                <Label htmlFor="medium" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">ปานกลาง (3-5 ชั่วโมง/สัปดาห์)</div>
                    <div className="text-sm text-muted-foreground">
                      เหมาะสำหรับผู้ที่ต้องการเข้าร่วมกิจกรรมเป็นประจำ
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="high" id="high" />
                <Label htmlFor="high" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">มาก (6+ ชั่วโมง/สัปดาห์)</div>
                    <div className="text-sm text-muted-foreground">
                      เหมาะสำหรับผู้ที่ต้องการมีส่วนร่วมอย่างเต็มที่
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Experience Level */}
      {currentStep === 4 && (
        <Card>
          <CardHeader>
            <CardTitle>คุณมีประสบการณ์ในกิจกรรมเหล่านี้มากแค่ไหน?</CardTitle>
            <CardDescription>
              เลือกระดับประสบการณ์ของคุณ
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers.experienceLevel}
              onValueChange={(value) =>
                setAnswers((prev) => ({ ...prev, experienceLevel: value }))
              }
              className="space-y-3"
            >
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="beginner" id="beginner" />
                <Label htmlFor="beginner" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">เริ่มต้น</div>
                    <div className="text-sm text-muted-foreground">
                      ยังไม่มีประสบการณ์ แต่สนใจอยากเรียนรู้
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="intermediate" id="intermediate" />
                <Label htmlFor="intermediate" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">ปานกลาง</div>
                    <div className="text-sm text-muted-foreground">
                      มีประสบการณ์บ้าง แต่ยังต้องการพัฒนาต่อ
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                <RadioGroupItem value="advanced" id="advanced" />
                <Label htmlFor="advanced" className="flex-1 cursor-pointer">
                  <div>
                    <div className="font-medium">ขั้นสูง</div>
                    <div className="text-sm text-muted-foreground">
                      มีประสบการณ์มากและพร้อมช่วยสอนผู้อื่น
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between gap-4">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1}
        >
          ย้อนกลับ
        </Button>
        {currentStep < totalSteps ? (
          <Button onClick={handleNext}>
            ถัดไป
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                กำลังบันทึก...
              </>
            ) : (
              'บันทึกและเสร็จสิ้น'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

