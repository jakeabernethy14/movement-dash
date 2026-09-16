"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";
export function toast(message: string, type: "success" | "error" = "success") {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("movement:toast", { detail: { message, type } }));
}
export default function ToastHost() {
  const [item, setItem] = useState<{ message: string; type: string } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const listener = (event: Event) => { setItem((event as CustomEvent).detail); clearTimeout(timer); timer = setTimeout(() => setItem(null), 5500); };
    window.addEventListener("movement:toast", listener);
    return () => { window.removeEventListener("movement:toast", listener); clearTimeout(timer); };
  }, []);
  if (!item) return null;
  return <div className={`toast ${item.type}`} role={item.type === "error" ? "alert" : "status"}>{item.type === "error" ? <AlertCircle size={19}/> : <CheckCircle2 size={19}/>}<span>{item.message}</span><button onClick={() => setItem(null)} aria-label="Dismiss notification"><X size={17}/></button></div>;
}
