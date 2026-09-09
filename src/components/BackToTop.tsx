"use client";
import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop({ containerRef }: { containerRef?: React.RefObject<HTMLElement> }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = containerRef?.current ?? window;
    function onScroll() {
      const y = containerRef?.current ? containerRef.current.scrollTop : window.scrollY;
      setVisible(y > 320);
    }
    target.addEventListener("scroll", onScroll);
    return () => target.removeEventListener("scroll", onScroll);
  }, [containerRef]);

  function scrollTop() {
    if (containerRef?.current) {
      containerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  if (!visible) return null;

  return (
    <button
      onClick={scrollTop}
      title="Back to top"
      className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full flex items-center justify-center text-base-950 transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "linear-gradient(135deg, #f2c94c 0%, #d4af37 55%, #a6871f 100%)",
        boxShadow: "0 1px 0 0 rgba(255,255,255,0.35) inset, 0 8px 22px -6px rgba(212,175,55,0.55)",
      }}
    >
      <ArrowUp size={18} />
    </button>
  );
}
