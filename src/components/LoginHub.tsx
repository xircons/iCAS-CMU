import React, { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../features/auth/hooks/useAuth";
import { MAJORS } from "../constants/majors";

export function LoginHub() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [major, setMajor] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [firstNameError, setFirstNameError] = useState(false);
  const [lastNameError, setLastNameError] = useState(false);
  const [confirmPasswordError, setConfirmPasswordError] = useState(false);
  const [phoneNumberError, setPhoneNumberError] = useState(false);
  const [majorError, setMajorError] = useState(false);
  const { signup, login, isLoading } = useAuth();

  // Validation functions
  const validateThaiOnly = (text: string): boolean => {
    const thaiOnlyRegex = /^[ก-๏\s]+$/;
    return thaiOnlyRegex.test(text.trim());
  };

  const validateThaiOnlyNoSpaces = (text: string): boolean => {
    const thaiOnlyNoSpacesRegex = /^[ก-๏]+$/;
    return thaiOnlyNoSpacesRegex.test(text.trim());
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true; // Optional field
    const phoneRegex = /^0\d{2}-\d{3}-\d{4}$/;
    return phoneRegex.test(phone);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isSignUp) {
      // Clear previous errors
      setFirstNameError(false);
      setLastNameError(false);
      setEmailError(false);
      setPasswordError(false);
      setConfirmPasswordError(false);
      setPhoneNumberError(false);
      setMajorError(false);

      // Validate all fields
      let hasErrors = false;
      let errorMessages: string[] = [];

      const trimmedFirstName = firstName.trim();
      const trimmedLastName = lastName.trim();

      if (!trimmedFirstName) {
        setFirstNameError(true);
        hasErrors = true;
        errorMessages.push('First name is required');
      } else if (!validateThaiOnlyNoSpaces(trimmedFirstName)) {
        setFirstNameError(true);
        hasErrors = true;
        errorMessages.push('First name must contain only Thai characters without spaces');
      }

      if (!trimmedLastName) {
        setLastNameError(true);
        hasErrors = true;
        errorMessages.push('Last name is required');
      } else if (!validateThaiOnlyNoSpaces(trimmedLastName)) {
        setLastNameError(true);
        hasErrors = true;
        errorMessages.push('Last name must contain only Thai characters without spaces');
      }

      if (!email) {
        setEmailError(true);
        hasErrors = true;
        errorMessages.push('Email is required');
      }

      if (!password || password.length < 6) {
        setPasswordError(true);
        hasErrors = true;
        if (!password) {
          errorMessages.push('Password is required');
        } else if (password.length < 6) {
          errorMessages.push('Password must be at least 6 characters');
        }
      }

      if (!confirmPassword || password !== confirmPassword) {
        setConfirmPasswordError(true);
        hasErrors = true;
        if (!confirmPassword) {
          errorMessages.push('Please confirm your password');
        } else if (password !== confirmPassword) {
          errorMessages.push('Passwords do not match');
        }
      }

      if (phoneNumber && !validatePhoneNumber(phoneNumber)) {
        setPhoneNumberError(true);
        hasErrors = true;
        errorMessages.push('Phone number must be in format 0XX-XXX-XXXX');
      }

      if (!major) {
        setMajorError(true);
        hasErrors = true;
        errorMessages.push('Please select your major');
      }

      if (hasErrors) {
        // Show toast with first error message
        const firstError = errorMessages[0] || 'Please fill in all required fields correctly';
        toast.error(firstError);
        console.log(firstError);
        return;
      }

      try {
        // Combine email prefix with @cmu.ac.th
        const fullEmail = `${email.trim()}@cmu.ac.th`;
        await signup(
          firstName.trim(),
          lastName.trim(),
          fullEmail,
          password,
          confirmPassword,
          phoneNumber.trim() || undefined,
          major
        );
        // Clear all errors on success
        setFirstNameError(false);
        setLastNameError(false);
        setEmailError(false);
        setPasswordError(false);
        setConfirmPasswordError(false);
        setPhoneNumberError(false);
        setMajorError(false);
      } catch (error: any) {
        // Error is handled by useAuth hook with toast
        // Show simple error message in console
        const errorMessage = error?.response?.data?.error?.message || 
                            error?.response?.data?.message ||
                            'Signup failed. Please try again';
        console.log(errorMessage);
        
        // Set error states based on error message
        if (errorMessage.includes('First name')) setFirstNameError(true);
        if (errorMessage.includes('Last name')) setLastNameError(true);
        if (errorMessage.includes('email') || errorMessage.includes('Email')) setEmailError(true);
        if (errorMessage.includes('password') || errorMessage.includes('Password')) {
          setPasswordError(true);
          setConfirmPasswordError(true);
        }
        if (errorMessage.includes('Phone')) setPhoneNumberError(true);
        if (errorMessage.includes('major') || errorMessage.includes('Major')) setMajorError(true);
      }
      return;
    }
    
    // Login flow
    // Clear previous errors
    setEmailError(false);
    setPasswordError(false);
    
    try {
      // Combine email prefix with @cmu.ac.th
      const fullEmail = `${email.trim()}@cmu.ac.th`;
      await login(fullEmail, password);
      // Clear errors on success
      setEmailError(false);
      setPasswordError(false);
    } catch (error: any) {
      // Prevent any default form behavior
      e.preventDefault();
      e.stopPropagation();
      
      // Set error states immediately to show red borders
      setEmailError(true);
      setPasswordError(true);
      
      // Show simple error message in console
      const errorMessage = error?.response?.data?.error?.message || 
                          error?.response?.data?.message ||
                          'Invalid email or password';
      console.log(errorMessage);
      
      // Note: Toast notification is already handled by useAuth hook
      // No need to show it here to avoid duplicates
      
      // Return false to prevent any form submission
      return false;
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleFirstNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFirstName(e.target.value);
    if (firstNameError) {
      setFirstNameError(false);
    }
  };

  const handleLastNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLastName(e.target.value);
    if (lastNameError) {
      setLastNameError(false);
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Remove @cmu.ac.th if user tries to type it
    value = value.replace('@cmu.ac.th', '');
    // Remove any @ symbols (user shouldn't type them)
    value = value.replace('@', '');
    setEmail(value);
    // Clear error when user starts typing
    if (emailError) {
      setEmailError(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    // Clear error when user starts typing
    if (passwordError) {
      setPasswordError(false);
    }
    // Also clear confirm password error if passwords now match
    if (confirmPassword && password === confirmPassword && confirmPasswordError) {
      setConfirmPasswordError(false);
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (confirmPasswordError) {
      setConfirmPasswordError(false);
    }
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    // Auto-format phone number as user types: 0XX-XXX-XXXX
    value = value.replace(/\D/g, ''); // Remove non-digits
    if (value.length > 0) {
      if (value.length <= 3) {
        value = value;
      } else if (value.length <= 6) {
        value = `${value.slice(0, 3)}-${value.slice(3)}`;
      } else {
        value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6, 10)}`;
      }
    }
    setPhoneNumber(value);
    if (phoneNumberError) {
      setPhoneNumberError(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-0 sm:p-4 md:p-6 lg:p-8" style={{ backgroundColor: '#fdfdfd' }}>
      {/* Centered Container - ~50% width with padding */}
      <div className="w-full max-w-6xl flex flex-col sm:flex-row bg-white sm:rounded-lg sm:shadow-lg overflow-hidden" style={{ minHeight: 'min(800px, 90vh)' }}>
        {/* Left Side - Hero Section (50%) */}
        <div className="w-full sm:w-1/2 flex items-center justify-center p-6 sm:p-8 md:p-12 relative overflow-hidden hidden sm:flex" style={{ minHeight: 'inherit', backgroundColor: '#fdfdfd' }}>
          {/* Background decorative elements */}
          <div className="absolute inset-0 opacity-10 overflow-hidden">
            <div className="absolute top-10 sm:top-20 left-10 sm:left-20 w-32 h-32 sm:w-64 sm:h-64 bg-primary rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 sm:bottom-20 right-10 sm:right-20 w-48 h-48 sm:w-96 sm:h-96 bg-purple-500 rounded-full blur-3xl"></div>
          </div>
          
          {/* Logo centered */}
          <div className="relative z-10 flex flex-col items-center justify-center overflow-hidden">
            <img 
              src="/logo/logopng.png"
              alt="iCAS-CMU HUB" 
              className="h-24 sm:h-32 md:h-40 lg:h-48 w-auto object-contain"
            />
          </div>
        </div>
        
        {/* Right Side - Form Section (50%) */}
        <div className="w-full sm:w-1/2 flex items-center justify-center p-8 sm:p-8 md:p-12 lg:p-16 relative sm:rounded-lg" style={{ minHeight: 'inherit', backgroundColor: '#fdfdfd' }}>
          <div className="w-full max-w-md space-y-4 sm:space-y-6">
          {/* Mobile Logo - Only visible on mobile */}
          <div className="flex justify-center mb-6 pb-4 sm:hidden" style={{ display: 'flex' }}>
            <style>{`
              @media (min-width: 640px) {
                .mobile-logo-only {
                  display: none !important;
                }
              }
            `}</style>
            <div className="mobile-logo-only">
              <img 
                src="/logo/logopng.png"
                alt="iCAS-CMU HUB" 
                className="h-[32px] w-auto object-contain"
              />
            </div>
          </div>
          
          {/* Title and Subtitle */}
          <div className="space-y-1 sm:space-y-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground">
              {isSignUp ? "Create account" : "Welcome back"}
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              {isSignUp
                ? "Enter your information to create your account"
                : "Enter your credentials to access your account"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4" noValidate>
            {/* First Name and Last Name (Two columns) - Only for Sign Up */}
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="firstName" className="text-sm sm:text-base mb-2">ชื่อ (Thai only)</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="ชื่อ"
                    value={firstName}
                    onChange={handleFirstNameChange}
                    required
                    disabled={isLoading}
                    aria-invalid={firstNameError}
                    style={firstNameError ? { border: '2px solid #ef4444', borderColor: '#ef4444' } : undefined}
                    className={`rounded-md text-sm sm:text-base ${
                      firstNameError 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500' 
                        : 'border-input focus:border-ring focus:ring-2 focus:ring-ring'
                    }`}
                  />
                </div>
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="lastName" className="text-sm sm:text-base mb-2">นามสกุล (Thai only)</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="นามสกุล"
                    value={lastName}
                    onChange={handleLastNameChange}
                    required
                    disabled={isLoading}
                    aria-invalid={lastNameError}
                    style={lastNameError ? { border: '2px solid #ef4444', borderColor: '#ef4444' } : undefined}
                    className={`rounded-md text-sm sm:text-base ${
                      lastNameError 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500' 
                        : 'border-input focus:border-ring focus:ring-2 focus:ring-ring'
                    }`}
                  />
                </div>
              </div>
            )}

            {/* Email Input (Full width) with @cmu.ac.th suffix */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="email" className="text-sm sm:text-base mb-2">Email</Label>
              <div className="relative flex items-center gap-2">
                <Input
                  id="email"
                  type="text"
                  placeholder="your.email"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  disabled={isLoading}
                  aria-invalid={emailError}
                  style={emailError ? { border: '2px solid #ef4444', borderColor: '#ef4444' } : { borderWidth: '2px' }}
                  className={`rounded-md text-sm sm:text-base flex-1 ${
                    emailError 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500' 
                      : 'border-input focus:border-ring focus:ring-2 focus:ring-ring'
                  }`}
                />
                <div className={`flex items-center h-9 px-3 text-sm sm:text-base border rounded-md select-none pointer-events-none ${
                  emailError 
                    ? 'border-red-500 bg-input-background' 
                    : 'border-input bg-input-background'
                }`}
                style={{ borderWidth: '2px' }}>
                  <span className="text-muted-foreground">@cmu.ac.th</span>
                </div>
              </div>
            </div>

            {/* Password Input with Show/Hide Eye Icon */}
            <div className="space-y-1.5 sm:space-y-2">
              <Label htmlFor="password" className="text-sm sm:text-base mb-2">Password</Label>
              <div className="relative">
                  <Input
                    id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                    value={password}
                    onChange={handlePasswordChange}
                    required
                  disabled={isLoading}
                  aria-invalid={passwordError}
                  style={passwordError ? { border: '2px solid #ef4444', borderColor: '#ef4444' } : undefined}
                  className={`rounded-md pr-10 text-sm sm:text-base ${
                    passwordError 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500' 
                      : 'border-input focus:border-ring focus:ring-2 focus:ring-ring'
                  }`}
                />
                <button
                  type="button"
                  onClick={togglePasswordVisibility}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoading}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                  ) : (
                    <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                  )}
                </button>
                  </div>
                </div>

            {/* Confirm Password Input - Only for Sign Up */}
            {isSignUp && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm sm:text-base mb-2">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={handleConfirmPasswordChange}
                    required
                    disabled={isLoading}
                    aria-invalid={confirmPasswordError}
                    style={confirmPasswordError ? { border: '2px solid #ef4444', borderColor: '#ef4444' } : undefined}
                    className={`rounded-md pr-10 text-sm sm:text-base ${
                      confirmPasswordError 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500' 
                        : 'border-input focus:border-ring focus:ring-2 focus:ring-ring'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isLoading}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" />
                    ) : (
                      <Eye className="h-4 w-4 sm:h-5 sm:w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Phone Number Input - Only for Sign Up */}
            {isSignUp && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="phoneNumber" className="text-sm sm:text-base mb-2">Phone Number (Optional)</Label>
                <Input
                  id="phoneNumber"
                  type="text"
                  placeholder="0XX-XXX-XXXX"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  disabled={isLoading}
                  aria-invalid={phoneNumberError}
                  style={phoneNumberError ? { border: '2px solid #ef4444', borderColor: '#ef4444' } : undefined}
                  className={`rounded-md text-sm sm:text-base ${
                    phoneNumberError 
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500 focus-visible:ring-red-500' 
                      : 'border-input focus:border-ring focus:ring-2 focus:ring-ring'
                  }`}
                />
              </div>
            )}

            {/* Major Select - Only for Sign Up */}
            {isSignUp && (
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="major" className="text-sm sm:text-base mb-2">Major</Label>
                <Select value={major} onValueChange={(value) => {
                  setMajor(value);
                  if (majorError) {
                    setMajorError(false);
                  }
                }} disabled={isLoading}>
                  <SelectTrigger
                    id="major"
                    aria-invalid={majorError}
                    className={`rounded-md text-sm sm:text-base ${
                      majorError 
                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
                        : 'border-input focus:border-ring focus:ring-2 focus:ring-ring'
                    }`}
                    style={majorError ? { border: '2px solid #ef4444', borderColor: '#ef4444' } : undefined}
                  >
                    <SelectValue placeholder="Select your major" />
                  </SelectTrigger>
                  <SelectContent>
                    {MAJORS.map((majorOption) => (
                      <SelectItem key={majorOption} value={majorOption}>
                        {majorOption}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Remember Me Checkbox */}
            {!isSignUp && (
              <div className="w-full flex justify-end mt-1">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                    disabled={isLoading}
                    className="cursor-pointer"
                  />
                  <Label
                    htmlFor="remember-me"
                    className="text-sm font-normal cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Remember me
                  </Label>
                </div>
              </div>
            )}

            {/* Primary Button */}
              <Button
              type="submit"
              className="w-full rounded-md text-sm sm:text-base h-10 sm:h-11"
              disabled={isLoading}
            >
              {isLoading
                ? isSignUp
                  ? "Creating account..."
                  : "Signing in..."
                : isSignUp
                ? "Create account"
                : "Sign in"}
            </Button>
          </form>

          {/* Divider with Text */}
          <div className="relative py-2 sm:py-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
                  </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="px-2 text-muted-foreground" style={{ backgroundColor: '#fdfdfd' }}>
                {isSignUp ? "Or register with" : "Or continue with"}
              </span>
            </div>
                </div>

          {/* Toggle between Sign In and Sign Up */}
          <div className="text-center text-xs sm:text-sm">
            <span className="text-muted-foreground">
              {isSignUp ? "Already have an account? " : "Don't have an account? "}
            </span>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setFirstName("");
                setLastName("");
                setEmail("");
                setPassword("");
                setConfirmPassword("");
                setPhoneNumber("");
                setMajor("");
                setRememberMe(false);
                setEmailError(false);
                setPasswordError(false);
                setFirstNameError(false);
                setLastNameError(false);
                setConfirmPasswordError(false);
                setPhoneNumberError(false);
                setMajorError(false);
              }}
              className="text-primary hover:underline font-medium"
            >
              {isSignUp ? "Sign in" : "Sign up"}
            </button>
                </div>
        </div>
        </div>
      </div>
    </div>
  );
}
