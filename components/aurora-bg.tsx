"use client";

/* Fond animé partagé : aurores floutées + grille fine + étoiles scintillantes.
   Même identité visuelle que la landing. */
export function AuroraBackground() {
  const stars = Array.from({ length: 32 }, (_, i) => ({
    left: `${(i * 41) % 100}%`,
    top: `${(i * 59) % 100}%`,
    size: (i % 3) + 1,
    dur: 3 + (i % 4),
    delay: `${(i % 10) * 0.4}s`,
  }));
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="aurora-blob absolute -top-40 -left-40 h-[42rem] w-[42rem] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, #2a4bff88, transparent 60%)", animation: "aurora 18s ease-in-out infinite" }}
      />
      <div
        className="aurora-blob absolute top-1/3 -right-40 h-[38rem] w-[38rem] rounded-full blur-[120px]"
        style={{ background: "radial-gradient(circle, #7b3bff77, transparent 60%)", animation: "aurora 22s ease-in-out infinite reverse" }}
      />
      <div
        className="aurora-blob absolute -bottom-20 left-1/4 h-[34rem] w-[34rem] rounded-full blur-[130px]"
        style={{ background: "radial-gradient(circle, #14e0e066, transparent 60%)", animation: "aurora 26s ease-in-out infinite" }}
      />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />
      {stars.map((s, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-white"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, animation: `twinkle ${s.dur}s ease-in-out ${s.delay} infinite` }}
        />
      ))}
    </div>
  );
}
