export default function Footer() {
  return (
    <footer
      className="fixed bottom-0 left-0 md:left-[17.5rem] right-0 z-20 flex items-center justify-between px-5 md:px-10 text-[11px] text-[#739084] py-3 border-t border-white/[0.08] bg-[#0a1714]/90 backdrop-blur-xl"
    >
      <span>© {new Date().getFullYear()} The Movement Coaching</span>
      <span className="hidden sm:inline uppercase tracking-[0.16em] text-[#567166]">Move well. Live fully.</span>
    </footer>
  );
}
