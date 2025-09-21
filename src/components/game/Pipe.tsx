"use client";

type PipeProps = {
  x: number;
  topHeight: number;
  gap: number;
  pipeWidth: number;
};

export const Pipe = ({ x, topHeight, gap, pipeWidth }: PipeProps) => {
  const bottomPipeTop = topHeight + gap;

  return (
    <div
      className="absolute h-full"
      style={{
        left: `${x}px`,
        width: `${pipeWidth}px`,
      }}
    >
      {/* Top Pipe */}
      <div
        className="absolute top-0 w-full bg-primary border-4 border-primary-foreground/20 shadow-lg"
        style={{
          height: `${topHeight}px`,
          borderTop: 'none',
          borderBottomLeftRadius: '10px',
          borderBottomRightRadius: '10px'
        }}
      >
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[110%] h-8 bg-primary border-4 border-primary-foreground/20 rounded-lg shadow-inner" />
      </div>

      {/* Bottom Pipe */}
      <div
        className="absolute w-full bg-primary border-4 border-primary-foreground/20 shadow-lg"
        style={{
          top: `${bottomPipeTop}px`,
          bottom: 0,
          borderBottom: 'none',
          borderTopLeftRadius: '10px',
          borderTopRightRadius: '10px'
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[110%] h-8 bg-primary border-4 border-primary-foreground/20 rounded-lg shadow-inner" />
      </div>
    </div>
  );
};
