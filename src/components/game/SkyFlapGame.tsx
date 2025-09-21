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
const BIRD_SIZE = 40;
const GRAVITY = 0.08;
const JUMP_STRENGTH = -2.5;
const BIRD_ROTATION_UP = -20;
const BIRD_ROTATION_DOWN = 40;

const INITIAL_GAME_SETTINGS = {
  gameSpeedMultiplier: 1.2,
  pipeGapSize: 220,
  pipeSpawnRate: 1800, // ms
  pipeWidth: 80,
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
  const [gameSettings, setGameSettings] = useState(INITIAL_GAME_SETTINGS);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  
  const [gameDimensions, setGameDimensions] = useState({ width: 0, height: 0 });

  const gameLoopRef = useRef<number>();
  const pipeTimerRef = useRef(0);
  const lastTimestampRef = useRef(0);


  const { toast } = useToast();

  const flap = useCallback(() => {
    if (gameState === 'playing') {
      setBirdVelocity(JUMP_STRENGTH);
    }
  }, [gameState]);

  const startGame = useCallback(() => {
    setGameState('playing');
    setBirdY(gameDimensions.height / 2);
    setBirdVelocity(0);
    setPipes([]);
    setScore(0);
    pipeTimerRef.current = gameSettings.pipeSpawnRate; // Spawn first pipe immediately
    flap(); // Start with a flap
  }, [gameDimensions.height, flap, gameSettings.pipeSpawnRate]);
  
  const restartGame = useCallback(() => {
    setGameState('waiting');
  }, []);

  const stopGame = useCallback(() => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = undefined;
    }
    pipeTimerRef.current = 0;
    lastTimestampRef.current = 0;
  }, []);
  
  const handleGameOver = useCallback(async () => {
    if (gameState === 'gameOver') return; // Prevent multiple calls
    stopGame();
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
      setGameSettings(prev => ({ ...prev, ...nextDifficulty, pipeWidth: INITIAL_GAME_SETTINGS.pipeWidth }));
    } catch (error) {
      console.error("Failed to adjust difficulty:", error);
      toast({
        title: "AI Error",
        description: "Could not get new difficulty from AI. Using previous settings.",
        variant: "destructive",
      });
    }
  }, [score, highScore, gamesPlayed, stopGame, toast, gameState]);

 const gameLoop = useCallback((timestamp: number) => {
    if (!lastTimestampRef.current) {
      lastTimestampRef.current = timestamp;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = timestamp - lastTimestampRef.current;
    lastTimestampRef.current = timestamp;

    // Bird physics
    const newVelocity = birdVelocity + GRAVITY * (deltaTime / 16);
    const newY = birdY + newVelocity * (deltaTime / 16);
    setBirdVelocity(newVelocity);
    setBirdY(newY);
    setBirdRotation(Math.max(BIRD_ROTATION_UP, Math.min(BIRD_ROTATION_DOWN, newVelocity * 5)));
    
    // Pipe management
    pipeTimerRef.current += deltaTime;
    let newPipes = [...pipes];
    let scoreUpdatedThisFrame = false;

    if (pipeTimerRef.current > gameSettings.pipeSpawnRate) {
        pipeTimerRef.current = 0;
        const minTop = gameDimensions.height * 0.15;
        const maxTop = gameDimensions.height * 0.85 - gameSettings.pipeGapSize;
        const topHeight = Math.floor(Math.random() * (maxTop - minTop) + minTop);
        newPipes.push({ x: gameDimensions.width, topHeight, passed: false });
    }
    
    newPipes = newPipes.map(pipe => {
      const newPipeX = pipe.x - (2 * gameSettings.gameSpeedMultiplier * (deltaTime / 16));
      if (!pipe.passed && newPipeX + gameSettings.pipeWidth < (gameDimensions.width * 0.2)) {
          scoreUpdatedThisFrame = true;
          return { ...pipe, x: newPipeX, passed: true };
      }
      return { ...pipe, x: newPipeX };
    }).filter(pipe => pipe.x > -gameSettings.pipeWidth);

    setPipes(newPipes);

    if (scoreUpdatedThisFrame) {
      setScore(s => s + 1);
    }
    
    // Collision Detection
    const birdLeft = gameDimensions.width * 0.2 - BIRD_SIZE / 2;
    const birdRight = gameDimensions.width * 0.2 + BIRD_SIZE / 2;
    const birdTop = newY - BIRD_SIZE / 2;
    const birdBottom = newY + BIRD_SIZE / 2;
    
    // Ground and ceiling collision
    if (birdBottom > gameDimensions.height || birdTop < 0) {
      handleGameOver();
      return;
    }

    // Pipe collision
    for (const pipe of newPipes) {
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + gameSettings.pipeWidth;
        const pipeTopHeight = pipe.topHeight;
        const pipeBottomY = pipe.topHeight + gameSettings.pipeGapSize;

        const isCollidingX = birdRight > pipeLeft && birdLeft < pipeRight;
        const isCollidingY = birdTop < pipeTopHeight || birdBottom > pipeBottomY;

        if (isCollidingX && isCollidingY) {
            handleGameOver();
            return;
        }
    }
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [birdY, birdVelocity, pipes, gameDimensions, gameSettings, handleGameOver]);

  useEffect(() => {
    const storedHighScore = localStorage.getItem('skyFlapHighScore');
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10));
    }
    const storedGamesPlayed = localStorage.getItem('skyFlapGamesPlayed');
    if (storedGamesPlayed) {
      setGamesPlayed(parseInt(storedGamesPlayed, 10));
    }
  }, []);

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setGameDimensions({ width, height });
      if (gameState === 'waiting') {
        setBirdY(height / 2);
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [gameState]);
  

  useEffect(() => {
    if (gameState === 'playing' && !gameLoopRef.current) {
        gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else if (gameState !== 'playing') {
      stopGame();
    }
    
    return () => {
      stopGame();
    };
  }, [gameState, gameLoop, stopGame]);

 useEffect(() => {
    const handleAction = (e: Event) => {
        e.preventDefault();
        if (gameState === 'playing') {
            flap();
        }
    };
  
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            handleAction(e);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleAction);
    window.addEventListener('touchend', handleAction);
  
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('click', handleAction);
      window.removeEventListener('touchend', handleAction);
    };
  }, [gameState, flap]);

  const handleStartOrRestart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (gameState === 'waiting') {
      startGame();
    } else if (gameState === 'gameOver') {
      restartGame();
    }
  };


  return (
    <main 
      className="w-screen h-screen overflow-hidden relative bg-background select-none font-headline"
      onClick={gameState !== 'playing' ? handleStartOrRestart : undefined}
      onTouchEnd={gameState !== 'playing' ? handleStartOrRestart : undefined}
    >
      <AnimatedBackground />

      {pipes.map((pipe, index) => (
        <Pipe
          key={index}
          x={pipe.x}
          topHeight={pipe.topHeight}
          gap={gameSettings.pipeGapSize}
          pipeWidth={gameSettings.pipeWidth}
        />
      ))}
      
      <Bird y={birdY} rotation={birdRotation} />

      {gameState === 'playing' && <Score score={score} />}
      {gameState === 'waiting' && <StartScreen />}
      {gameState === 'gameOver' && (
        <GameOverScreen score={score} highScore={highScore} onRestart={restartGame} />
      )}
    </main>
  );
}
