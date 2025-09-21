"use client";

import { Cloud } from 'lucide-react';

const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden -z-10">
      <Cloud className="absolute text-white/50 animate-[move-clouds_20s_linear_infinite] top-[10%]" style={{ animationDelay: '0s' }} size={64} />
      <Cloud className="absolute text-white/50 animate-[move-clouds_25s_linear_infinite] top-[25%]" style={{ animationDelay: '-5s' }} size={80} />
      <Cloud className="absolute text-white/50 animate-[move-clouds_18s_linear_infinite] top-[50%]" style={{ animationDelay: '-10s' }} size={50} />
      <Cloud className="absolute text-white/50 animate-[move-clouds_30s_linear_infinite] top-[70%]" style={{ animationDelay: '-15s' }} size={96} />
      <Cloud className="absolute text-white/50 animate-[move-clouds_22s_linear_infinite] top-[85%]" style={{ animationDelay: '-2s' }} size={72} />
    </div>
  );
};

export default AnimatedBackground;
