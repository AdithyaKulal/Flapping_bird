"use client";

type BirdProps = {
  y: number;
  rotation: number;
};

export const Bird = ({ y, rotation }: BirdProps) => {
  return (
    <div
      className="absolute bg-accent rounded-full transition-transform duration-100 ease-linear shadow-lg"
      style={{
        width: '40px',
        height: '40px',
        top: `${y}px`,
        left: '20%',
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        transformOrigin: 'center'
      }}
      aria-label="Game bird"
    >
        {/* Eye */}
        <div className="absolute top-1/3 left-2/3 w-3 h-3 bg-white rounded-full border-2 border-gray-700">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-black rounded-full" />
        </div>
        {/* Beak */}
        <div className="absolute top-1/2 -translate-y-[6px] right-0 translate-x-3/4 w-4 h-3 bg-orange-400 rounded-sm" style={{clipPath: 'polygon(0 0, 100% 50%, 0 100%)'}} />
    </div>
  );
};
