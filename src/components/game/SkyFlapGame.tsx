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
const GRAVITY = 0.2;
const JUMP_STRENGTH = -4.5;
const BIRD_SIZE = 40;
const PIPE_WIDTH = 80;

const INITIAL_GAME_SETTINGS = {
  gameSpeedMultiplier: 1.5,
  pipeGapSize: 200,
  pipeSpawnRate: 1800,
  difficultyLevel: 'easy',
};

type PipeState = {
  x: number;
  topHeight: number;
  passed: boolean;
};

export function SkyFlapGame() {
  const [gameState, setGameState] = useState<'waiting' | 'playing' | 'gameOver'>('waiting');
  const [birdY, setBirdY] = useState(0);
  const [birdVelocity, setBirdVelocity] = useState(0);
  const [birdRotation, setBirdRotation] = useState(0);
  const [pipes, setPipes] = useState<PipeState[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [gameSettings, setGameSettings] = useState(INITIAL_GAME_SETTINGS);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  const gameLoopRef = useRef<number | null>(null);
  const pipeTimerRef = useRef(0);

  const { toast } = useToast();

  const flap = useCallback(() => {
    setBirdVelocity(JUMP_STRENGTH);
  }, []);

  const startGame = useCallback(() => {
    setGameState('playing');
    flap();
  }, [flap]);

  const resetGame = useCallback(() => {
    setBirdY(dimensions.height / 2);
    setBirdVelocity(0);
    setBirdRotation(0);
    setPipes([]);
    setScore(0);
    pipeTimerRef.current = 0;
    setGameState('playing');
    flap();
  }, [dimensions.height, flap]);

  const handleUserAction = useCallback(() => {
    if (gameState === 'playing') {
      flap();
    } else if (gameState === 'waiting') {
      startGame();
    }
  }, [gameState, flap, startGame]);


  const handleGameOver = useCallback(async () => {
    if (gameState === 'gameOver') return;

    setGameState('gameOver');
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
        description: "Could not fetch new difficulty. Using previous settings.",
        variant: "destructive",
      });
    }
  }, [gameState, score, highScore, gamesPlayed, toast]);


  const gameLoop = useCallback((deltaTime: number) => {
    // Bird physics
    let newVelocity = birdVelocity + GRAVITY;
    let newY = birdY + newVelocity;
    
    // Bird rotation
    let rotation = Math.max(-30, Math.min(90, newVelocity * 5));
    
    // Pipe management
    let newPipes = [...pipes];
    pipeTimerRef.current += deltaTime;
    if (pipeTimerRef.current > gameSettings.pipeSpawnRate / gameSettings.gameSpeedMultiplier) {
      pipeTimerRef.current = 0;
      const minTop = dimensions.height * 0.1;
      const maxTop = dimensions.height * 0.9 - gameSettings.pipeGapSize;
      const topHeight = Math.random() * (maxTop - minTop) + minTop;
      newPipes.push({ x: dimensions.width, topHeight, passed: false });
    }
    
    let scoreHasUpdated = false;
    newPipes = newPipes
      .map(pipe => {
        const newPipeX = pipe.x - 2 * gameSettings.gameSpeedMultiplier;
        if (!pipe.passed && newPipeX + PIPE_WIDTH < dimensions.width * 0.2) {
            scoreHasUpdated = true;
            return { ...pipe, x: newPipeX, passed: true };
        }
        return { ...pipe, x: newPipeX };
      })
      .filter(pipe => pipe.x > -PIPE_WIDTH);

    // Collision detection
    const birdLeft = dimensions.width * 0.2 - BIRD_SIZE / 2;
    const birdRight = birdLeft + BIRD_SIZE;
    const birdTop = newY - BIRD_SIZE / 2;
    const birdBottom = newY + BIRD_SIZE / 2;
    
    let isGameOver = false;
    if (birdBottom > dimensions.height || birdTop < 0) {
      isGameOver = true;
    }

    for (const pipe of newPipes) {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + PIPE_WIDTH;
      const gapTop = pipe.topHeight;
      const gapBottom = pipe.topHeight + gameSettings.pipeGapSize;

      if (birdRight > pipeLeft && birdLeft < pipeRight && (birdTop < gapTop || birdBottom > gapBottom)) {
        isGameOver = true;
        break;
      }
    }

    if (isGameOver) {
      handleGameOver();
    } else {
        setBirdY(newY);
        setBirdVelocity(newVelocity);
        setBirdRotation(rotation);
        setPipes(newPipes);
        if (scoreHasUpdated) {
            setScore(s => s + 1);
        }
    }

  }, [birdY, birdVelocity, pipes, dimensions, gameSettings, handleGameOver, score]);
  
  useEffect(() => {
    let lastTime = 0;
    const loop = (time: number) => {
        if(lastTime > 0) {
            const deltaTime = time - lastTime;
            if(gameState === 'playing') {
                gameLoop(deltaTime);
            }
        }
        lastTime = time;
        gameLoopRef.current = requestAnimationFrame(loop);
    };
    gameLoopRef.current = requestAnimationFrame(loop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, gameLoop]);


  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      if (gameState === 'waiting') {
        setBirdY(window.innerHeight / 2);
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
      if (e.code === 'Space') {
        e.preventDefault();
        handleUserAction();
      }
    };

    window.addEventListener('click', handleUserAction);
    window.addEventListener('touchstart', handleUserAction);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', handleUserAction);
      window.removeEventListener('touchstart', handleUserAction);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleUserAction]);

  return (
    <main className="w-screen h-screen overflow-hidden relative bg-background select-none font-headline">
      <AnimatedBackground />

      {pipes.map((pipe, index) => (
        <Pipe
          key={index}
          x={pipe.x}
          topHeight={pipe.topHeight}
          gap={gameSettings.pipeGapSize}
          pipeWidth={PIPE_WIDTH}
        />
      ))}
      
      <Bird y={birdY} rotation={birdRotation} />

      {gameState === 'playing' && <Score score={score} />}
      {gameState === 'waiting' && <StartScreen />}
      {gameState === 'gameOver' && (
        <GameOverScreen score={score} highScore={highScore} onRestart={resetGame} />
      )}
    </main>
  );
}
