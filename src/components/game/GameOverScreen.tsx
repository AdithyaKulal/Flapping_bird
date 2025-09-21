"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';

type GameOverScreenProps = {
  score: number;
  highScore: number;
  onRestart: () => void;
};

export const GameOverScreen = ({ score, highScore, onRestart }: GameOverScreenProps) => {
  return (
    <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle className="font-headline text-4xl">Game Over</CardTitle>
          <CardDescription>Better luck next time!</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-around items-center">
            <div>
              <p className="text-muted-foreground text-sm">Score</p>
              <p className="font-headline text-3xl">{score}</p>
            </div>
            <div className="flex items-center gap-2">
              <Award className="text-accent" size={24}/>
              <div>
                <p className="text-muted-foreground text-sm">High Score</p>
                <p className="font-headline text-3xl">{highScore}</p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={onRestart} className="w-full font-headline" size="lg">
            Restart
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
