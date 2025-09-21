"use client";

import { Bird, Keyboard, Mouse } from 'lucide-react';

export const StartScreen = () => {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-40 text-center text-primary-foreground p-4">
      <h1 className="text-6xl sm:text-8xl font-headline font-bold drop-shadow-lg text-white">Sky Flap</h1>
      <p className="mt-4 text-lg sm:text-xl drop-shadow-md bg-black/20 px-4 py-2 rounded-md text-white">Press Space or Click/Tap to Start</p>
      <div className="flex items-center gap-4 mt-8 text-white drop-shadow-md">
        <Keyboard size={32} />
        <span className="text-2xl">or</span>
        <Mouse size={32} />
        <span className="text-2xl">or</span>
        <Bird size={32} />
      </div>
    </div>
  );
};
