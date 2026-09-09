"use client";

export default function Avatar({
  url,
  name,
  size = 28,
}: {
  url?: string | null;
  name?: string | null;
  size?: number;
}) {
  const initials = (name || "?")
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={name ?? "avatar"}
        className="rounded-full object-cover border border-white/10 shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-semibold text-gold-300"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: "rgba(212,175,55,0.12)",
        border: "1px solid rgba(212,175,55,0.3)",
      }}
    >
      {initials}
    </div>
  );
}
