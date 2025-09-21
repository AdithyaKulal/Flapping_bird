"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { adjustDifficulty } from '@/ai/flows/dynamic-difficulty-adjustment';
import { useToast } from "@/hooks/use-toast";
import AnimatedBackground from './AnimatedBackground';
import { Bird } from './Bird';
import { Pipe } from './Pipe';
import { Score } from './Score';
import { StartScreen } from './StartScreen';
import { GameOverScreen } from './GameOverScreen';

// Game Constants
const GRAVITY = 0.17;
const JUMP_STRENGTH = -4.0;
const BIRD_SIZE = 40;
const BIRD_X = 80;
const PIPE_WIDTH = 80;

const INITIAL_GAME_SETTINGS = {
  gameSpeedMultiplier: 1.5,
  pipeGapSize: 220,
  pipeSpawnRate: 1400, // Decreased from 1800 to make pipes closer
  difficultyLevel: 'easy',
};

type PipeState = {
  x: number;
  topHeight: number;
  passed: boolean;
};

export function SkyFlapGame() {
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'gameOver'>('waiting');
  const [birdY, setBirdY] = useState(300);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [birdRotation, setBirdRotation] = useState(0);
  const [pipes, setPipes] = useState<PipeState[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [gameSettings, setGameSettings] = useState(INITIAL_GAME_SETTINGS);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const gameLoopRef = useRef<number | null>(null);
  const { toast } = useToast();

  const flap = useCallback(() => {
    if (gameState === 'playing') {
      setBirdVelocity(JUMP_STRENGTH);
    }
  }, [gameState]);

  const startGame = useCallback(() => {
    setGameState('playing');
    setBirdY(dimensions.height / 2);
    setBirdVelocity(0);
    setBirdRotation(0);
    setPipes([]);
    setScore(0);
    flap();
  }, [dimensions.height, flap]);

  const handleUserAction = useCallback(() => {
    if (gameState === 'playing') {
      flap();
    } else if (gameState === 'waiting') {
      startGame();
    }
  }, [gameState, flap, startGame]);

  const resetGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const handleGameOver = useCallback(async () => {
    if (gameState === 'gameOver') return;

    setGameState('gameOver');
    cancelAnimationFrame(gameLoopRef.current!);

    const newHighScore = Math.max(score, highScore);
    setHighScore(newHighScore);
    localStorage.setItem('skyFlapHighScore', newHighScore.toString());
    
    const newGamesPlayed = gamesPlayed + 1;
    setGamesPlayed(newGamesPlayed);
    localStorage.setItem('skyFlapGamesPlayed', newGamesPlayed.toString());

    try {
      const nextDifficulty = await adjustDifficulty({
        score,
        pipesPassed: score,
        gamesPlayed: newGamesPlayed,
        highScore: newHighScore,
      });
      setGameSettings(prev => ({ ...prev, ...nextDifficulty }));
    } catch (error) {
      console.error("Failed to adjust difficulty:", error);
      toast({
        title: "AI Error",
        description: "Could not fetch new difficulty settings.",
        variant: "destructive",
      });
    }
  }, [gameState, score, highScore, gamesPlayed, toast]);
  
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;

    // Bird physics
    setBirdVelocity(v => {
      const newVelocity = v + GRAVITY;
      setBirdY(y => {
        const newY = y + newVelocity;
        setBirdRotation(Math.max(-30, Math.min(90, newVelocity * 6)));

        // Floor collision
        if (newY + BIRD_SIZE / 2 > dimensions.height) {
          handleGameOver();
          return y;
        }
        // Ceiling collision
        if (newY - BIRD_SIZE / 2 < 0) {
          handleGameOver();
          return y;
        }

        return newY;
      });
      return newVelocity;
    });

    // Pipe management
    setPipes(prevPipes => {
      let newScore = score;
      const newPipes = prevPipes
        .map(p => ({ ...p, x: p.x - 2 * gameSettings.gameSpeedMultiplier }))
        .filter(p => p.x > -PIPE_WIDTH);
      
      const scorePipe = newPipes.find(p => !p.passed && p.x + PIPE_WIDTH < BIRD_X);
      if (scorePipe) {
        scorePipe.passed = true;
        newScore++;
        setScore(newScore);
      }

      if (
        newPipes.length === 0 ||
        newPipes[newPipes.length - 1].x <
          dimensions.width -
            gameSettings.pipeSpawnRate * 0.5 * gameSettings.gameSpeedMultiplier
      ) {
        const minTop = dimensions.height * 0.15;
        const maxTop = dimensions.height * 0.85 - gameSettings.pipeGapSize;
        const topHeight = Math.random() * (maxTop - minTop) + minTop;
        newPipes.push({ x: dimensions.width, topHeight, passed: false });
      }

      // Pipe collision
      const birdRadius = BIRD_SIZE / 2 - 12; // Tighter hitbox
      const birdLeft = BIRD_X - birdRadius;
      const birdRight = BIRD_X + birdRadius;

      for (const pipe of newPipes) {
         const birdTop = birdY - birdRadius;
         const birdBottom = birdY + birdRadius;

        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + PIPE_WIDTH;
        const gapTop = pipe.topHeight;
        const gapBottom = pipe.topHeight + gameSettings.pipeGapSize;

        if (
          birdRight > pipeLeft &&
          birdLeft < pipeRight &&
          (birdTop < gapTop || birdBottom > gapBottom)
        ) {
          handleGameOver();
          break;
        }
      }

      return newPipes;
    });

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, score, dimensions, gameSettings, handleGameOver, birdY]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop]);

  useEffect(() => {
    const handleResize = () => {
      const newDimensions = { width: window.innerWidth, height: window.innerHeight };
      setDimensions(newDimensions);
      if (gameState === 'waiting') {
        setBirdY(newDimensions.height / 2);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const storedHighScore = localStorage.getItem('skyFlapHighScore');
    if (storedHighScore) setHighScore(parseInt(storedHighScore, 10));
    const storedGamesPlayed = localStorage.getItem('skyFlapGamesPlayed');
    if (storedGamesPlayed) setGamesPlayed(parseInt(storedGamesPlayed, 10));

    return () => window.removeEventListener('resize', handleResize);
  }, [gameState]);


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleUserAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleUserAction);
    window.addEventListener('touchstart', handleUserAction);
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('click', handleUserAction);
        window.removeEventListener('touchstart', handleUserAction);
    };
  }, [handleUserAction]);

  return (
    <main className="w-screen h-screen overflow-hidden relative bg-background select-none font-headline">
      <AnimatedBackground />

      <Bird y={birdY} rotation={birdRotation} />

      {pipes.map((pipe, index) => (
        <Pipe
          key={index}
          x={pipe.x}
          topHeight={pipe.topHeight}
          gap={gameSettings.pipeGapSize}
          pipeWidth={PIPE_WIDTH}
        />
      ))}
      
      {gameState === 'playing' && <Score score={score} />}
      {gameState === 'waiting' && <StartScreen />}
      {gameState === 'gameOver' && (
        <GameOverScreen score={score} highScore={highScore} onRestart={resetGame} />
      )}
    </main>
  );
}
