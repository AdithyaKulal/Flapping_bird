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
  pipeSpawnRate: 1400,
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
  const pipeSpawnTimerRef = useRef<number | null>(null);
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
    // Initial flap
    setBirdVelocity(JUMP_STRENGTH);
  }, [dimensions.height]);

  const resetGame = useCallback(() => {
    setGameState('waiting');
    setBirdY(dimensions.height / 2);
    setBirdVelocity(0);
    setBirdRotation(0);
    setPipes([]);
    setScore(0);
  }, [dimensions.height]);


  const handleUserAction = useCallback(() => {
    if (gameState === 'playing') {
      flap();
    } else if (gameState === 'waiting') {
      startGame();
    } else if (gameState === 'gameOver') {
      resetGame();
      startGame();
    }
  }, [gameState, flap, startGame, resetGame]);

  const handleGameOver = useCallback(async () => {
    if (gameState === 'gameOver') return;

    setGameState('gameOver');
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (pipeSpawnTimerRef.current) clearTimeout(pipeSpawnTimerRef.current);


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
    // Bird physics
    setBirdVelocity(v => {
      const newVelocity = v + GRAVITY;
      setBirdY(y => y + newVelocity);
      setBirdRotation(Math.max(-30, Math.min(90, newVelocity * 6)));
      return newVelocity;
    });

    // Pipe movement
    setPipes(prevPipes =>
      prevPipes.map(p => ({ ...p, x: p.x - 2 * gameSettings.gameSpeedMultiplier }))
    );

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [gameSettings.gameSpeedMultiplier]);

  // Collision and Game Logic Effect
  useEffect(() => {
    if (gameState !== 'playing') return;

    // Floor and Ceiling collision
    if (birdY + BIRD_SIZE / 2 > dimensions.height || birdY - BIRD_SIZE / 2 < 0) {
      handleGameOver();
      return;
    }

    // Pipe collision
    const birdRadius = BIRD_SIZE / 2 - 2; // Tighter hitbox
    const birdLeft = BIRD_X - birdRadius;
    const birdRight = BIRD_X + birdRadius;
    const birdTop = birdY - birdRadius;
    const birdBottom = birdY + birdRadius;

    for (const pipe of pipes) {
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
        return;
      }
    }

    // Scoring
    const scorePipe = pipes.find(p => !p.passed && p.x + PIPE_WIDTH < BIRD_X);
    if (scorePipe) {
      setScore(s => s + 1);
      setPipes(prevPipes =>
        prevPipes.map(p =>
          p.x === scorePipe.x ? { ...p, passed: true } : p
        )
      );
    }
  }, [birdY, pipes, gameState, dimensions.height, gameSettings.pipeGapSize, handleGameOver]);

  // Pipe Generation Effect
  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawnPipe = () => {
      const minTop = dimensions.height * 0.15;
      const maxTop = dimensions.height * 0.85 - gameSettings.pipeGapSize;
      const topHeight = Math.random() * (maxTop - minTop) + minTop;
      
      setPipes(prev => [...prev.filter(p => p.x > -PIPE_WIDTH), { x: dimensions.width, topHeight, passed: false }]);

      pipeSpawnTimerRef.current = setTimeout(spawnPipe, gameSettings.pipeSpawnRate);
    };

    pipeSpawnTimerRef.current = setTimeout(spawnPipe, gameSettings.pipeSpawnRate);

    return () => {
      if (pipeSpawnTimerRef.current) {
        clearTimeout(pipeSpawnTimerRef.current);
      }
    };
  }, [gameState, dimensions.width, dimensions.height, gameSettings.pipeGapSize, gameSettings.pipeSpawnRate]);

  // Main Game Loop Controller
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

  // Setup and Cleanup
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
        <GameOverScreen score={score} highScore={highScore} onRestart={handleUserAction} />
      )}
    </main>
  );
}
