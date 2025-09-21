"use client";

type ScoreProps = {
  score: number;
};

export const Score = ({ score }: ScoreProps) => {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 text-5xl font-bold text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)] z-40 font-headline">
      {score}
    </div>
  );
};
