"use client";
import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, Timer } from "lucide-react";
import Modal from "./ui/Modal";
import { toast } from "./ui/Toast";
/** Uses a wall-clock deadline, so background-tab throttling does not cause drift. No health data stored. */
export default function RestTimer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [duration, setDuration] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [deadline, setDeadline] = useState<number | null>(null);
  useEffect(() => {
    if (deadline === null) return;
    function tick() {
      const left = Math.max(0, Math.ceil((deadline! - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) { setDeadline(null); toast("Rest complete. Ready for your next set."); }
    }
    tick(); const timer = setInterval(tick, 250); return () => clearInterval(timer);
  }, [deadline]);
  if (!open) return null;
  const percent = Math.max(0, Math.min(100, remaining / duration * 100));
  return <Modal title="Rest timer" onClose={onClose}><div className="timer-content"><p className="muted">A little recovery. A stronger next set.</p><div className="timer-ring" style={{ background: `conic-gradient(#d4af37 ${percent}%, #252522 0)` }}><div><Timer size={20}/><strong role="timer" aria-label={`${remaining} seconds remaining`}>{Math.floor(remaining / 60).toString().padStart(2, "0")}:{(remaining % 60).toString().padStart(2, "0")}</strong><span>{remaining === 0 ? "READY WHEN YOU ARE" : deadline ? "TAKE A BREATHER" : "YOUR NEXT SET AWAITS"}</span></div></div><div className="timer-presets">{[30, 60, 90, 120, 180].map(s => <button key={s} className={duration === s ? "selected" : ""} onClick={() => { setDuration(s); setRemaining(s); setDeadline(null); }}>{s < 60 ? `${s}s` : `${s / 60}m`}</button>)}</div><div className="timer-actions"><button className="btn-secondary" onClick={() => { setDeadline(null); setRemaining(duration); }}><RotateCcw size={16}/> Reset</button><button className="btn-primary" onClick={() => { if (deadline) setDeadline(null); else { const value = remaining || duration; setRemaining(value); setDeadline(Date.now() + value * 1000); } }}>{deadline ? <Pause size={16}/> : <Play size={16}/>} {deadline ? "Pause" : "Start timer"}</button></div><p className="timer-note">Keeps running while you browse this dashboard. Refreshing resets it.</p></div></Modal>;
}
