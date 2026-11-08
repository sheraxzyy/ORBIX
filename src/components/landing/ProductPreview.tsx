import React from 'react';
import { Shield, Users, Radio, CheckCheck, Send } from 'lucide-react';

export const ProductPreview: React.FC = () => {
  return (
    <section id="preview" className="py-12 md:py-20 relative">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text mb-3">
            Architected for High-Frequency Flow
          </h2>
          <p className="text-text-muted text-sm sm:text-base max-w-xl mx-auto">
            Experience an interface optimized for clarity, speed, and uncompromising data sovereignty.
          </p>
        </div>

        {/* Futuristic App Preview Frame */}
        <div className="relative rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
          {/* Mock Window Title Bar */}
          <div className="h-10 bg-card border-b border-border flex items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
              <span className="ml-3 text-xs font-mono text-text-muted">ORBIX Studio — Dark Mode Default</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-text-muted">
              <span className="w-2 h-2 rounded-full bg-success inline-block" />
              <span>Realtime Connected</span>
            </div>
          </div>

          {/* 3-Pane Desktop Mockup Preview */}
          <div className="grid grid-cols-1 md:grid-cols-12 min-h-[460px] bg-background">
            {/* Left Column: Channels & Contacts */}
            <div className="hidden md:block md:col-span-4 lg:col-span-3 border-r border-border bg-surface/50 p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-mono font-bold tracking-wider uppercase text-text-muted">
                  Conversations
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary">
                  12 Active
                </span>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-lg bg-card border border-primary/30 flex items-center gap-3">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                      NX
                    </div>
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-text truncate">Nova Syndicate</span>
                      <span className="text-[10px] text-text-muted">Just now</span>
                    </div>
                    <p className="text-xs text-text-muted truncate">Sequence locked for deployment</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg hover:bg-card/60 transition-colors flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-text-muted">
                    ER
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text truncate">Elena Rostova</span>
                      <span className="text-[10px] text-text-muted">14:02</span>
                    </div>
                    <p className="text-xs text-text-muted truncate">RLS policy migration verified.</p>
                  </div>
                </div>

                <div className="p-3 rounded-lg hover:bg-card/60 transition-colors flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center font-bold text-text-muted">
                    AP
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-text truncate">Apex Core</span>
                      <span className="text-[10px] text-text-muted">Yesterday</span>
                    </div>
                    <p className="text-xs text-text-muted truncate">Cursor pagination benchmark: 18ms</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Center Column: Active Conversation */}
            <div className="col-span-12 md:col-span-8 lg:col-span-6 flex flex-col justify-between p-4 md:p-6 bg-background">
              {/* Chat View Header */}
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                    NX
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text">Nova Syndicate</h3>
                    <p className="text-[11px] text-success flex items-center gap-1 font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-success" />
                      Encrypted in transit & at rest
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface border border-border text-text-muted">
                    Group: 4 Members
                  </span>
                </div>
              </div>

              {/* Message History Mock */}
              <div className="py-6 space-y-4">
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm p-3.5 bg-card border border-border text-text text-sm">
                    <p className="font-semibold text-xs text-primary mb-1">Elena Rostova</p>
                    <p>Confirmed PostgreSQL RLS policies pass all adversarial leak tests.</p>
                    <span className="text-[10px] text-text-muted block text-right mt-1">14:21</span>
                  </div>
                </div>

                <div className="flex justify-end">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm p-3.5 bg-primary text-white text-sm shadow-crimson-sm">
                    <p>Excellent. Cursor pagination and monotonically increasing sequences are active.</p>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-white/80">
                      <span>14:22</span>
                      <CheckCheck className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-2xl rounded-tl-sm p-3.5 bg-card border border-border text-text text-sm">
                    <p className="font-semibold text-xs text-primary mb-1">Kaelen Voss</p>
                    <p>Streaming channel ready. Zero client-side message spoofing possible.</p>
                    <span className="text-[10px] text-text-muted block text-right mt-1">14:23</span>
                  </div>
                </div>
              </div>

              {/* Message Composer Mock */}
              <div className="pt-2 border-t border-border">
                <div className="flex items-center gap-2 p-2 rounded-xl bg-surface border border-border">
                  <input
                    type="text"
                    disabled
                    placeholder="Write a message to Nova Syndicate..."
                    className="flex-1 bg-transparent border-0 px-2 text-xs text-text placeholder:text-text-muted focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled
                    aria-label="Send message preview"
                    className="p-2 rounded-lg bg-primary text-white hover:bg-primary-deep"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column: Info Panel */}
            <div className="hidden lg:block lg:col-span-3 border-l border-border bg-surface/50 p-4">
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-text-muted mb-4 block">
                Channel Intel
              </span>
              <div className="text-center py-4 border-b border-border">
                <div className="w-16 h-16 rounded-full bg-primary/20 border border-primary/40 mx-auto mb-2 flex items-center justify-center font-bold text-xl text-primary">
                  NX
                </div>
                <h4 className="text-sm font-bold text-text">Nova Syndicate</h4>
                <p className="text-xs text-text-muted mt-1">Quantum Network Operations</p>
              </div>

              <div className="py-4 space-y-3 text-xs">
                <div className="flex items-center justify-between text-text-muted">
                  <span className="flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    Security
                  </span>
                  <span className="font-mono text-text">RLS Strict</span>
                </div>
                <div className="flex items-center justify-between text-text-muted">
                  <span className="flex items-center gap-2">
                    <Radio className="w-3.5 h-3.5 text-primary" />
                    Presence
                  </span>
                  <span className="font-mono text-success">Active</span>
                </div>
                <div className="flex items-center justify-between text-text-muted">
                  <span className="flex items-center gap-2">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Admins
                  </span>
                  <span className="font-mono text-text">2 Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
