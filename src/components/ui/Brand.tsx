import Link from "next/link";

export default function Brand({ compact = false, href = "/dashboard" }: { compact?: boolean; href?: string }) {
  return <Link href={href} className="brand" aria-label="The Movement Coaching home">
    <span className="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" fill="none"><path d="M5 24V8h5l6 10 6-10h5v16h-5V16l-6 9-6-9v8H5Z" fill="currentColor"/></svg></span>
    {!compact && <span className="brand-wordmark">THE MOVEMENT<span>COACHING</span></span>}
  </Link>;
}
