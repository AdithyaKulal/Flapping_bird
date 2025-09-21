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
const GRAVITY = 0.1;
const JUMP_STRENGTH = -3.5;
const BIRD_ROTATION_UP = -20;
const BIRD_ROTATION_DOWN = 40;
const COLLISION_BUFFER = 5; // A small buffer to make collision a little more forgiving

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
  const lastTimeRef = useRef<number>(0);
  const pipeTimerRef = useRef<number>(0);

  const { toast } = useToast();

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
      setGameDimensions({ width: window.innerWidth, height: window.innerHeight });
      if (gameState === 'waiting') {
        setBirdY(window.innerHeight / 2);
      }
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [gameState]);

  const startGame = useCallback(() => {
    setGameState('playing');
    setBirdY(gameDimensions.height / 2);
    setBirdVelocity(0);
    setPipes([]);
    setScore(0);
    // Give the bird an initial flap
    setBirdVelocity(JUMP_STRENGTH);
  }, [gameDimensions.height]);
  
  const flap = useCallback(() => {
    if (gameState === 'playing') {
      setBirdVelocity(JUMP_STRENGTH);
    }
  }, [gameState]);

  const stopGame = useCallback(() => {
    if (gameLoopRef.current) {
      cancelAnimationFrame(gameLoopRef.current);
      gameLoopRef.current = undefined;
    }
    lastTimeRef.current = 0;
    pipeTimerRef.current = 0;
  }, []);

  const handleGameOver = useCallback(async () => {
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

  }, [score, highScore, gamesPlayed, stopGame, toast]);

  const gameLoop = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
      gameLoopRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    let newY = 0;
    setBirdVelocity(v => {
      const newVelocity = v + GRAVITY;
      setBirdY(y => {
        newY = y + newVelocity;
        if (newY > gameDimensions.height - BIRD_SIZE / 2) {
          handleGameOver();
          return gameDimensions.height - BIRD_SIZE / 2;
        }
        if (newY < BIRD_SIZE / 2) {
          newY = BIRD_SIZE / 2;
          return newY;
        }
        return newY;
      });
      return newVelocity;
    });

    setBirdRotation((r) => {
        const newRotation = birdVelocity * 3;
        return Math.max(BIRD_ROTATION_UP, Math.min(BIRD_ROTATION_DOWN, newRotation));
    });

    if (gameState === 'playing') {
      pipeTimerRef.current += deltaTime;
      if (pipeTimerRef.current > gameSettings.pipeSpawnRate) {
          pipeTimerRef.current = 0;
          const minTop = gameDimensions.height * 0.1;
          const maxTop = gameDimensions.height * 0.9 - gameSettings.pipeGapSize;
          const topHeight = Math.floor(Math.random() * (maxTop - minTop) + minTop);
          
          setPipes(p => [...p, { x: gameDimensions.width, topHeight, passed: false }]);
      }
      
      let scoreUpdated = false;
      setPipes(currentPipes => {
        const birdXCenter = gameDimensions.width * 0.2;
        const birdLeft = birdXCenter - BIRD_SIZE / 2 + COLLISION_BUFFER;
        const birdRight = birdXCenter + BIRD_SIZE / 2 - COLLISION_BUFFER;
        const birdTop = newY - BIRD_SIZE / 2 + COLLISION_BUFFER;
        const birdBottom = newY + BIRD_SIZE / 2 - COLLISION_BUFFER;

        const newPipes = currentPipes.map(pipe => {
          const newPipeX = pipe.x - 2 * gameSettings.gameSpeedMultiplier;
          const pipeRight = newPipeX + gameSettings.pipeWidth;

          if (
              birdRight > newPipeX &&
              birdLeft < pipeRight &&
              (birdTop < pipe.topHeight || birdBottom > pipe.topHeight + gameSettings.pipeGapSize)
          ) {
              handleGameOver();
          }

          if (!pipe.passed && birdLeft > pipeRight) {
              pipe.passed = true;
              scoreUpdated = true;
          }

          return { ...pipe, x: newPipeX };
        }).filter(pipe => pipe.x > -gameSettings.pipeWidth);
        
        return newPipes;
      });
      
      if (scoreUpdated) {
          setScore(s => s + 1);
      }
    }
    
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [birdVelocity, gameDimensions, gameSettings, handleGameOver, gameState]);
  
  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);


  useEffect(() => {
    if (gameState === 'playing' && !gameLoopRef.current) {
        lastTimeRef.current = 0;
        gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else if (gameState !== 'playing') {
        stopGame();
    }
    
    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
        gameLoopRef.current = undefined;
      }
    };
  }, [gameState, gameLoop, stopGame]);

 useEffect(() => {
    const handleAction = () => {
        if (gameState === 'playing') {
            flap();
        } else if (gameState === 'waiting') {
            startGame();
        } else if (gameState === 'gameOver') {
            restartGame();
        }
    };
  
    const clickHandler = (e: MouseEvent) => {
        e.preventDefault();
        handleAction();
    };

    const keydownHandler = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
            e.preventDefault();
            handleAction();
        }
    };

    window.addEventListener('click', clickHandler);
    window.addEventListener('keydown', keydownHandler);
    window.addEventListener('touchend', handleAction);
  
    return () => {
      window.removeEventListener('click', clickHandler);
      window.removeEventListener('keydown', keydownHandler);
      window.removeEventListener('touchend', handleAction);
    };
  }, [gameState, flap, startGame, restartGame]);


  return (
    <main className="w-screen h-screen overflow-hidden relative bg-background select-none font-headline">
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
