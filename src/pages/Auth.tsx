import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { ArrowLeftRight, KeyRound, Mail, ArrowLeft } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const emailSchema = z.string().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");

const DEVICE_TOKEN_KEY = "madani_device_token";

const generateDeviceToken = () => {
  return crypto.randomUUID() + "-" + Date.now().toString(36);
};

const getDeviceName = () => {
  const ua = navigator.userAgent;
  if (ua.includes("Android")) return "Android Device";
  if (ua.includes("iPhone")) return "iPhone";
  if (ua.includes("iPad")) return "iPad";
  if (ua.includes("Windows")) return "Windows PC";
  if (ua.includes("Mac")) return "Mac";
  if (ua.includes("Linux")) return "Linux PC";
  return "Unknown Device";
};

const Auth = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Login/Register mode
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFullName, setRegisterFullName] = useState("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);

  // OTP state
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [pendingOtpLogin, setPendingOtpLogin] = useState(false);

  // Password reset state
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);

  // Redirect if already logged in (but not during OTP flow)
  useEffect(() => {
    if (user && !pendingOtpLogin) {
      navigate("/dashboard");
    }
  }, [user, navigate, pendingOtpLogin]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        // On native: use Browser plugin so it can redirect back to the app
        const { Browser } = await import('@capacitor/browser');
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
            skipBrowserRedirect: true,
          },
        });
        if (error) throw error;
        if (data?.url) {
          await Browser.open({ url: data.url, windowName: '_self' });
        }
      } else {
        // On web: normal OAuth flow
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${window.location.origin}/dashboard`,
          },
        });
        if (error) throw error;
      }
    } catch (error: any) {
      toast({
        title: "Google Login Failed",
        description: error.message,
        variant: "destructive",
      });
      setGoogleLoading(false);
    }
  };

  if (user && !pendingOtpLogin) {
    return null;
  }

  const checkRememberedDevice = async (userId: string): Promise<boolean> => {
    const storedToken = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!storedToken) return false;

    const { data, error } = await supabase
      .from("remembered_devices")
      .select("*")
      .eq("user_id", userId)
      .eq("device_token", storedToken)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (error || !data || data.length === 0) {
      localStorage.removeItem(DEVICE_TOKEN_KEY);
      return false;
    }

    // Update last used time
    await supabase.from("remembered_devices").update({ last_used_at: new Date().toISOString() }).eq("id", data[0].id);

    return true;
  };

  const saveRememberedDevice = async (userId: string) => {
    const token = generateDeviceToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    const { error } = await supabase.from("remembered_devices").insert({
      user_id: userId,
      device_token: token,
      device_name: getDeviceName(),
      expires_at: expiresAt.toISOString(),
    });

    if (!error) {
      localStorage.setItem(DEVICE_TOKEN_KEY, token);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: err.errors[0].message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
    }

    // Set pending OTP flag BEFORE signing in to prevent redirect race condition
    setPendingOtpLogin(true);

    // First verify credentials by attempting sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (signInError) {
      toast({
        title: "Login Failed",
        description:
          signInError.message === "Invalid login credentials"
            ? "Invalid email or password. Please try again."
            : signInError.message,
        variant: "destructive",
      });
      setLoading(false);
      setPendingOtpLogin(false);
      return;
    }

    // Check user's role - owners and managers don't need OTP
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", signInData.user.id)
      .single();

    const userRole = roleData?.role;

    // Owners and managers can login directly without OTP
    if (userRole === "owner" || userRole === "manager") {
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      setLoading(false);
      setPendingOtpLogin(false);
      navigate("/dashboard");
      return;
    }

    // Check if this device is remembered
    const isDeviceRemembered = await checkRememberedDevice(signInData.user.id);
    if (isDeviceRemembered) {
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
      setLoading(false);
      setPendingOtpLogin(false);
      navigate("/dashboard");
      return;
    }

    // For staff and pending users, require OTP - sign out to require OTP verification
    await supabase.auth.signOut();

    // Check if user has a valid OTP
    const { data: otpData, error: otpError } = await supabase
      .from("login_otps")
      .select("*")
      .eq("email", loginEmail.toLowerCase())
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (otpError || !otpData || otpData.length === 0) {
      toast({
        title: "Access Denied",
        description: "No valid login code found for this email. Please contact your admin for a login code.",
        variant: "destructive",
      });
      setLoading(false);
      setPendingOtpLogin(false);
      return;
    }

    // Show OTP step
    setShowOtpStep(true);
    setLoading(false);
  };

  const handleOtpVerify = async () => {
    if (otpCode.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit login code provided by your admin.",
        variant: "destructive",
      });
      return;
    }

    setVerifyingOtp(true);

    // Verify OTP
    const { data: otpData, error: otpError } = await supabase
      .from("login_otps")
      .select("*")
      .eq("email", loginEmail.toLowerCase())
      .eq("otp_code", otpCode)
      .eq("is_used", false)
      .gt("expires_at", new Date().toISOString())
      .limit(1);

    if (otpError || !otpData || otpData.length === 0) {
      toast({
        title: "Invalid Code",
        description: "The login code is invalid or has expired. Please contact your admin for a new code.",
        variant: "destructive",
      });
      setVerifyingOtp(false);
      return;
    }

    // OTP is valid, now complete login
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (signInError || !signInData.user) {
      toast({
        title: "Login Failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
      setVerifyingOtp(false);
      return;
    }

    // Mark OTP as used
    await supabase
      .from("login_otps")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("id", otpData[0].id);

    // Save device if remember is checked
    if (rememberDevice) {
      await saveRememberedDevice(signInData.user.id);
    }

    toast({
      title: "Welcome back!",
      description: "You have successfully logged in.",
    });
    
    // Reset OTP flag and navigate
    setPendingOtpLogin(false);
    setVerifyingOtp(false);
    navigate("/dashboard");
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      emailSchema.parse(resetEmail);
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: err.errors[0].message,
          variant: "destructive",
        });
        return;
      }
    }

    setSendingReset(true);

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });

    setSendingReset(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setResetSent(true);
    toast({
      title: "Email Sent",
      description: "Check your email for the password reset link.",
    });
  };

  const handleBack = () => {
    setShowOtpStep(false);
    setOtpCode("");
    setPendingOtpLogin(false);
  };

  const handleBackToLogin = () => {
    setShowResetPassword(false);
    setResetEmail("");
    setResetSent(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      emailSchema.parse(registerEmail);
      passwordSchema.parse(registerPassword);
      if (!registerFullName.trim()) {
        throw new Error("Full name is required");
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: err.errors[0].message,
          variant: "destructive",
        });
      } else if (err instanceof Error) {
        toast({
          title: "Validation Error",
          description: err.message,
          variant: "destructive",
        });
      }
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: registerEmail,
      password: registerPassword,
      options: {
        data: { full_name: registerFullName },
      },
    });

    if (error) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    toast({
      title: "Registration Successful",
      description: "Your account is pending approval. Please wait for an admin to approve your access.",
    });
    setIsRegisterMode(false);
    setRegisterEmail("");
    setRegisterPassword("");
    setRegisterFullName("");
    setLoading(false);
  };

  // Password Reset View
  if (showResetPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-2 mb-4">
              <div className="p-3 rounded-full bg-primary text-primary-foreground">
                <Mail className="h-8 w-8" />
              </div>
            </div>
            <h1 className="text-2xl font-bold">Reset Password</h1>
            <p className="text-muted-foreground">We'll send you a reset link</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Forgot Password?</CardTitle>
              <CardDescription>
                {resetSent
                  ? "Check your email for the reset link"
                  : "Enter your email to receive a password reset link"}
              </CardDescription>
            </CardHeader>

            {!resetSent ? (
              <form onSubmit={handlePasswordReset}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button type="submit" className="w-full" disabled={sendingReset}>
                    {sendingReset ? "Sending..." : "Send Reset Link"}
                  </Button>
                  <Button type="button" variant="ghost" className="w-full" onClick={handleBackToLogin}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Login
                  </Button>
                </CardFooter>
              </form>
            ) : (
              <CardContent className="space-y-4">
                <div className="text-center py-4">
                  <div className="text-green-500 mb-2">✓</div>
                  <p className="text-sm text-muted-foreground">
                    We've sent a password reset link to <strong>{resetEmail}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Didn't receive it? Check your spam folder or try again.
                  </p>
                </div>
                <Button variant="outline" className="w-full" onClick={handleBackToLogin}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Login
                </Button>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    );
  }

  // Register View
  if (isRegisterMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center gap-2 mb-4">
              <img src="/favicon.png" alt="Madani Money Exchange" className="h-16 w-16" />
            </div>
            <h1 className="text-2xl font-bold">Madani Money Exchange</h1>
            <p className="text-muted-foreground">NPR ⇄ INR Currency Exchange</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create Account</CardTitle>
              <CardDescription>
                Register for a new account. Your account will need admin approval.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleRegister}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-name">Full Name</Label>
                  <Input
                    id="register-name"
                    type="text"
                    placeholder="Your full name"
                    value={registerFullName}
                    onChange={(e) => setRegisterFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-email">Email</Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="you@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password">Password</Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Registering..." : "Register"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsRegisterMode(false)}
                >
                  Already have an account? Login
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <img src="/favicon.png" alt="Madani Money Exchange" className="h-16 w-16 " />
          </div>
          <h1 className="text-2xl font-bold">Madani Money Exchange</h1>
          <p className="text-muted-foreground">NPR ⇄ INR Currency Exchange</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {showOtpStep && <KeyRound className="h-5 w-5" />}
              {showOtpStep ? "Enter Login Code" : "Staff Login"}
            </CardTitle>
            <CardDescription>
              {showOtpStep
                ? "Enter the 6-digit code provided by your admin"
                : "Enter your credentials to access your account"}
            </CardDescription>
          </CardHeader>

          {!showOtpStep ? (
            <form onSubmit={handleCredentialsSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="link"
                    className="px-0 text-sm"
                    onClick={() => setShowResetPassword(true)}
                  >
                    Forgot password?
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Verifying..." : "Login"}
                </Button>

                <div className="relative w-full">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">or</span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleLogin}
                  disabled={googleLoading}
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {googleLoading ? "Connecting..." : "Continue with Google"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => setIsRegisterMode(true)}
                >
                  Don't have an account? Register
                </Button>
              </CardFooter>
            </form>
          ) : (
            <div>
              <CardContent className="space-y-4">
                <div className="flex flex-col items-center space-y-4">
                  <p className="text-sm text-muted-foreground text-center">
                    Enter your login code for <strong>{loginEmail}</strong>
                  </p>
                  <InputOTP maxLength={6} value={otpCode} onChange={(value) => setOtpCode(value)}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>

                  <div className="flex items-center space-x-2 w-full">
                    <Checkbox
                      id="remember-device"
                      checked={rememberDevice}
                      onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
                    />
                    <label htmlFor="remember-device" className="text-sm text-muted-foreground cursor-pointer">
                      Remember this device for 30 days
                    </label>
                  </div>

                  <p className="text-xs text-muted-foreground text-center">
                    Don't have a code? Contact your admin to generate one.
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2">
                <Button className="w-full" onClick={handleOtpVerify} disabled={verifyingOtp || otpCode.length !== 6}>
                  {verifyingOtp ? "Logging in..." : "Verify & Login"}
                </Button>
                <Button variant="ghost" className="w-full" onClick={handleBack}>
                  Back
                </Button>
              </CardFooter>
            </div>
          )}
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Admins login directly. Staff need a login code from admin.
        </p>
      </div>
    </div>
  );
};

export default Auth;
