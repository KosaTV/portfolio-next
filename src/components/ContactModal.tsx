"use client";

import { useEffect, useRef, useState } from "react";

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ContactModal({ open, onClose }: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [visible, setVisible] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Animate in
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => setVisible(true));
      setTimeout(() => nameRef.current?.focus(), 300);
    } else {
      setVisible(false);
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    if (open) window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    // Simulate send
    setTimeout(() => {
      setSending(false);
      setSent(true);
      setTimeout(() => {
        setSent(false);
        setName("");
        setEmail("");
        setMessage("");
        handleClose();
      }, 2000);
    }, 1500);
  };

  if (!open) return null;

  return (
    <div
      ref={backdropRef}
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onClick={(e) => {
        if (e.target === backdropRef.current) handleClose();
      }}
      style={{ background: "rgba(2, 2, 2, 0.85)", backdropFilter: "blur(8px)" }}
    >
      <div
        className={`relative w-full max-w-lg transition-all duration-300 ${
          visible ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
        }`}
        style={{ fontFamily: "'JetBrains Mono', monospace" }}
      >
        {/* Terminal window */}
        <div className="border border-[#1a1a1a] bg-[#0a0a0a] overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center gap-2 px-4 py-2.5 bg-[#0f0f0f] border-b border-[#1a1a1a]">
            <button
              onClick={handleClose}
              className="w-2.5 h-2.5 rounded-full bg-[#ff5f57] hover:brightness-125 transition-all cursor-pointer"
            />
            <span className="w-2.5 h-2.5 rounded-full bg-[#febc2e]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[10px] text-[#444] tracking-wider">
              jc@portfolio — compose_message.sh
            </span>
          </div>

          {sent ? (
            /* Success state */
            <div className="p-8 flex flex-col items-center gap-4">
              <div
                className="text-4xl"
                style={{ animation: "fadeInUp 0.4s ease forwards" }}
              >
                ✓
              </div>
              <div className="text-sm text-[#00f0d4]" style={{ textShadow: "0 0 10px rgba(0,240,212,0.4)" }}>
                Message transmitted successfully.
              </div>
              <div className="text-[10px] text-[#555]">
                Closing connection...
              </div>
            </div>
          ) : (
            /* Form */
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Header */}
              <div className="text-[10px] text-[#555] tracking-wider mb-6">
                <span className="text-[#00f0d4]">$</span> compose_message --to jacob
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#444] uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="text-[#f0a500]">→</span> identity
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Connor // the one who fights machines"
                  className="w-full bg-[#0f0f0f] border border-[#1a1a1a] px-4 py-3 text-xs text-[#e8e8e8] placeholder-[#2a2a2a] outline-none focus:border-[#00f0d4] transition-colors caret-[#00f0d4]"
                  style={{ fontFamily: "inherit" }}
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#444] uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="text-[#f0a500]">→</span> return_address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="human@not-a-robot.com"
                  className="w-full bg-[#0f0f0f] border border-[#1a1a1a] px-4 py-3 text-xs text-[#e8e8e8] placeholder-[#2a2a2a] outline-none focus:border-[#00f0d4] transition-colors caret-[#00f0d4]"
                  style={{ fontFamily: "inherit" }}
                />
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-[#444] uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="text-[#f0a500]">→</span> payload
                </label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={"Hey Jacob, I saw your portfolio and...\n\n// don't be shy, write whatever you want\n// worst case scenario I'll mass email you cat pics"}
                  rows={5}
                  className="w-full bg-[#0f0f0f] border border-[#1a1a1a] px-4 py-3 text-xs text-[#e8e8e8] placeholder-[#2a2a2a] outline-none focus:border-[#00f0d4] transition-colors resize-none caret-[#00f0d4]"
                  style={{ fontFamily: "inherit" }}
                />
              </div>

              {/* Submit */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-[#333]">
                  esc to abort
                </span>
                <button
                  type="submit"
                  disabled={sending}
                  className="group relative px-6 py-2.5 border border-[#00f0d4] text-[#00f0d4] text-[11px] tracking-[0.15em] overflow-hidden hover:text-[#020202] transition-colors duration-300 cursor-pointer disabled:opacity-50 disabled:cursor-wait"
                >
                  <span className="absolute inset-0 bg-[#00f0d4] translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                  <span className="relative">
                    {sending ? "transmitting..." : "send_message()"}
                  </span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Corner decorations */}
        <div className="absolute -top-1 -left-1 w-3 h-3 border-t border-l border-[#00f0d4] opacity-40" />
        <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b border-r border-[#00f0d4] opacity-40" />
      </div>
    </div>
  );
}
