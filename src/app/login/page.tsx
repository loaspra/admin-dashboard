'use client';

import { useState } from 'react';
import { useAuth } from '../../contexts/auth-context';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Label } from '@/app/components/ui/label';
import { toast } from 'sonner';
import { AuroraBackground } from '@/app/components/ui/aurora-background';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await login(email, password);
    } catch (error) {
      toast.error("Authentication failed", {
        description: "Please check your credentials and try again.",
      });
    }
  };

  return (
    <AuroraBackground className="min-h-screen">
      <div className="flex items-center justify-center h-screen">
        <Card className="w-[350px] border-none bg-white/10 backdrop-filter backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-white">Admin Dashboard</CardTitle>
            <CardDescription className="text-white/70">Login to access the dashboard</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-white/20 border-white/10 text-white placeholder:text-white/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-white">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white/20 border-white/10 text-white placeholder:text-white/50"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full bg-white/20 hover:bg-white/30 text-white" type="submit" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AuroraBackground>
  );
}