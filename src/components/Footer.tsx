export default function Footer() {
  return (
    <footer
      className="fixed bottom-0 left-0 md:left-64 right-0 z-20 text-center text-xs text-neutral-500 py-3 border-t"
      style={{
        background: "linear-gradient(180deg, #0d0d0d, #070707)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      © {new Date().getFullYear()} The Movement Coaching
    </footer>
  );
}
