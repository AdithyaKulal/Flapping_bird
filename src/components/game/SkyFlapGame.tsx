"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
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
const PIPE_WIDTH = 80;
const BIRD_X = 80;

const INITIAL_GAME_SETTINGS = {
  gameSpeedMultiplier: 1.5,
  pipeGapSize: 220,
  pipeSpawnRate: 1400,
  difficultyLevel: 'easy' as 'easy' | 'medium' | 'hard',
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
  const pipeSpawnTimerRef = useRef<NodeJS.Timeout | null>(null);
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

  const resetGame = useCallback(async () => {
    const newGamesPlayed = gamesPlayed + 1;
    setGamesPlayed(newGamesPlayed);
    localStorage.setItem('skyFlapGamesPlayed', newGamesPlayed.toString());
    setGameSettings(INITIAL_GAME_SETTINGS);
    startGame();
  }, [gamesPlayed, startGame]);

  const handleUserAction = useCallback(() => {
    if (gameState === 'playing') {
      flap();
    } else if (gameState === 'waiting') {
      startGame();
    } else if (gameState === 'gameOver') {
      resetGame();
    }
  }, [gameState, flap, startGame, resetGame]);

  const handleGameOver = useCallback(() => {
    if (gameState === 'gameOver') return;

    setGameState('gameOver');
    if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    if (pipeSpawnTimerRef.current) clearTimeout(pipeSpawnTimerRef.current);

    const newHighScore = Math.max(score, highScore);
    setHighScore(newHighScore);
    localStorage.setItem('skyFlapHighScore', newHighScore.toString());
  }, [gameState, score, highScore]);
  
  const gameLoop = useCallback(() => {
    if (gameState !== 'playing') return;
  
    // All calculations are done first
    let newBirdVelocity = birdVelocity + GRAVITY;
    let newBirdY = birdY + newBirdVelocity;
    let newBirdRotation = Math.max(-30, Math.min(90, newBirdVelocity * 6));
    let newPipes = pipes.map(p => ({ ...p, x: p.x - 2 * gameSettings.gameSpeedMultiplier }));
    let shouldIncrementScore = false;
  
    const scorePipe = newPipes.find(p => !p.passed && p.x + PIPE_WIDTH < BIRD_X);
    if (scorePipe) {
      shouldIncrementScore = true;
      newPipes = newPipes.map(p =>
        p.x === scorePipe.x ? { ...p, passed: true } : p
      );
    }
  
    let isGameOver = false;
    const birdRadius = BIRD_SIZE / 2 - 5; // Reduced hitbox
    const birdLeft = BIRD_X - birdRadius;
    const birdRight = BIRD_X + birdRadius;
    const birdTop = newBirdY - birdRadius;
    const birdBottom = newBirdY + birdRadius;
  
    if (newBirdY + BIRD_SIZE / 2 > dimensions.height || newBirdY - BIRD_SIZE / 2 < 0) {
      isGameOver = true;
    }
  
    for (const pipe of newPipes) {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + PIPE_WIDTH;
      const gapTop = pipe.topHeight;
      const gapBottom = pipe.topHeight + gameSettings.pipeGapSize;
  
      if (
        birdRight > pipeLeft &&
        birdLeft < pipeRight &&
        (birdTop < gapTop || birdBottom > gapBottom)
      ) {
        isGameOver = true;
        break; 
      }
    }
  
    // State updates are batched here
    if (isGameOver) {
      handleGameOver();
    } else {
      setBirdY(newBirdY);
      setBirdVelocity(newBirdVelocity);
      setBirdRotation(newBirdRotation);
      setPipes(newPipes.filter(p => p.x > -PIPE_WIDTH));
      if (shouldIncrementScore) {
        setScore(s => s + 1);
      }
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    }
  }, [birdY, birdVelocity, pipes, gameState, dimensions.height, gameSettings.gameSpeedMultiplier, gameSettings.pipeGapSize, handleGameOver]);

  useEffect(() => {
    if (gameState !== 'playing') return;

    const spawnPipe = () => {
      const minTop = dimensions.height * 0.15;
      const maxTop = dimensions.height * 0.85 - gameSettings.pipeGapSize;
      const topHeight = Math.random() * (maxTop - minTop) + minTop;
      
      setPipes(prev => [...prev, { x: dimensions.width, topHeight, passed: false }]);
      pipeSpawnTimerRef.current = setTimeout(spawnPipe, gameSettings.pipeSpawnRate);
    };
    
    if (pipeSpawnTimerRef.current) clearTimeout(pipeSpawnTimerRef.current);
    pipeSpawnTimerRef.current = setTimeout(spawnPipe, gameSettings.pipeSpawnRate / gameSettings.gameSpeedMultiplier);

    return () => {
      if (pipeSpawnTimerRef.current) {
        clearTimeout(pipeSpawnTimerRef.current);
      }
    };
  }, [gameState, dimensions.width, dimensions.height, gameSettings.pipeGapSize, gameSettings.pipeSpawnRate, gameSettings.gameSpeedMultiplier]);

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
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

    setBirdY(window.innerHeight / 2);

    return () => window.removeEventListener('resize', handleResize);
  }, []); 


  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        handleUserAction();
      }
    };

    const handleInteraction = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      handleUserAction();
    }
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('click', handleInteraction);
    window.addEventListener('touchstart', handleInteraction);
    
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('click', handleInteraction);
        window.removeEventListener('touchstart', handleInteraction);
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
