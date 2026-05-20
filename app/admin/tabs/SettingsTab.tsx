"use client";
import { useState } from "react";
import type { AppSettings, ConsultationSlot } from "@/lib/db";
import { PAYMENT_FLOW_ENABLED } from "@/lib/constants";

interface SettingsTabProps {
  appSettings: AppSettings;
  initialSlots: ConsultationSlot[];
}

export function SettingsTab({ appSettings, initialSlots }: SettingsTabProps) {
  const [writtenConsultation, setWrittenConsultation] = useState(appSettings.written_consultation_enabled);
  const [liveConsultation, setLiveConsultation] = useState(appSettings.live_consultation_enabled);
  const [settingSaving, setSettingSaving] = useState(false);
  const [writtenFeeRs, setWrittenFeeRs] = useState(Math.round(appSettings.written_fee_paise / 100));
  const [liveFeeRs, setLiveFeeRs] = useState(Math.round(appSettings.live_fee_paise / 100));
  const [feeSaving, setFeeSaving] = useState(false);

  const [slots, setSlots] = useState<ConsultationSlot[]>(initialSlots);
  const [newSlotInput, setNewSlotInput] = useState("");
  const [slotAdding, setSlotAdding] = useState(false);
  const [slotDeletingId, setSlotDeletingId] = useState<string | null>(null);

  const saveFees = async () => {
    setFeeSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          written_fee_paise: writtenFeeRs * 100,
          live_fee_paise: liveFeeRs * 100,
        }),
      });
    } finally {
      setFeeSaving(false);
    }
  };

  const toggleSetting = async (key: "written_consultation_enabled" | "live_consultation_enabled") => {
    setSettingSaving(true);
    const current = key === "written_consultation_enabled" ? writtenConsultation : liveConsultation;
    const next = !current;
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (key === "written_consultation_enabled") setWrittenConsultation(next);
      else setLiveConsultation(next);
    } finally {
      setSettingSaving(false);
    }
  };

  const addSlot = async () => {
    if (!newSlotInput) return;
    setSlotAdding(true);
    try {
      const startsAt = new Date(newSlotInput + ":00+05:30").toISOString();
      const res = await fetch("/api/admin/consultation-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ starts_at: startsAt }),
      });
      if (res.ok) {
        const slot = (await res.json()) as ConsultationSlot;
        setSlots((prev) => [...prev, slot].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
        setNewSlotInput("");
      }
    } finally {
      setSlotAdding(false);
    }
  };

  const deleteSlot = async (id: string) => {
    setSlotDeletingId(id);
    try {
      const res = await fetch(`/api/admin/consultation-slots?id=${id}`, { method: "DELETE" });
      if (res.ok) setSlots((prev) => prev.filter((s) => s.id !== id));
    } finally {
      setSlotDeletingId(null);
    }
  };

  return (
    <div className="max-w-md space-y-6">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">App Settings</h2>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-1)] p-4 space-y-5">
        <p className="text-sm font-medium">Consultation</p>

        <div className="space-y-3">
          <Toggle
            label="Written Response"
            description="Users can submit questions for a written answer."
            enabled={writtenConsultation}
            onToggle={() => toggleSetting("written_consultation_enabled")}
            disabled={settingSaving}
          />
          <Toggle
            label="Live Session"
            description="Users can book a 25-minute live consultation slot."
            enabled={liveConsultation}
            onToggle={() => toggleSetting("live_consultation_enabled")}
            disabled={settingSaving}
          />
        </div>

        {/* Pricing section is dormant until PAYMENT_FLOW_ENABLED is flipped on.
            Payment is currently handled out-of-band (email reply). */}
        {PAYMENT_FLOW_ENABLED && (
          <>
            <div className="border-t border-[var(--color-border-subtle)]" />

            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pricing</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Written Response (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={writtenFeeRs}
                    onChange={(e) => setWrittenFeeRs(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Live Session (₹)</label>
                  <input
                    type="number"
                    min={0}
                    value={liveFeeRs}
                    onChange={(e) => setLiveFeeRs(parseInt(e.target.value, 10) || 0)}
                    className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/50"
                  />
                </div>
              </div>
              <button
                disabled={feeSaving}
                onClick={saveFees}
                className="text-xs bg-[var(--color-accent-faint)] hover:bg-[var(--color-accent-faint)]/80 border border-[var(--color-accent-dim)] text-[var(--color-accent)] px-3 py-1.5 rounded-md transition-colors disabled:opacity-50"
              >
                {feeSaving ? "Saving…" : "Save Pricing"}
              </button>
            </div>
          </>
        )}

        <div className="border-t border-[var(--color-border-subtle)]" />

        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Live Session Slots</p>
          <p className="text-xs text-muted-foreground">
            Enter date and time in IST. Users only see slots at least 5 days away that are not yet booked.
          </p>
          <div className="flex gap-2 items-end">
            <div className="space-y-1 flex-1">
              <label className="text-xs text-muted-foreground">Date &amp; Time (IST)</label>
              <input
                type="datetime-local"
                value={newSlotInput}
                onChange={(e) => setNewSlotInput(e.target.value)}
                className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-1)] px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]/50"
              />
            </div>
            <button
              disabled={!newSlotInput || slotAdding}
              onClick={addSlot}
              className="text-xs bg-[var(--color-accent-faint)] hover:bg-[var(--color-accent-faint)]/80 border border-[var(--color-accent-dim)] text-[var(--color-accent)] px-3 py-2 rounded-md transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {slotAdding ? "Adding…" : "Add Slot"}
            </button>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {slots.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">No slots created yet.</p>
            )}
            {slots.map((slot) => {
              const isPast = new Date(slot.starts_at) < new Date();
              const label = new Date(slot.starts_at).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });
              return (
                <div
                  key={slot.id}
                  className={`flex items-center justify-between px-3 py-1.5 rounded-md border ${
                    isPast ? "border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] opacity-50" : "border-[var(--color-border)] bg-[var(--color-surface-1)]"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs">{label} IST</span>
                    {slot.is_booked ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-success-faint)] text-[var(--color-success)]">Booked</span>
                    ) : isPast ? (
                      <span className="text-[10px] text-muted-foreground">Past</span>
                    ) : (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-accent-faint)] text-[var(--color-accent)]">Available</span>
                    )}
                  </div>
                  {!slot.is_booked && (
                    <button
                      disabled={slotDeletingId === slot.id}
                      onClick={() => deleteSlot(slot.id)}
                      className="text-[10px] text-[var(--color-danger)]/70 hover:text-[var(--color-danger)] transition-colors disabled:opacity-50 ml-3"
                    >
                      {slotDeletingId === slot.id ? "…" : "Delete"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Toggle({ label, description, enabled, onToggle, disabled }: {
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        disabled={disabled}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none disabled:opacity-50 ${enabled ? "bg-[var(--color-accent)]" : "bg-[var(--color-surface-hover)]"}`}
      >
        <span className={`inline-block h-5 w-5 transform rounded-full bg-[var(--color-ink-1)] shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0"}`} />
      </button>
    </div>
  );
}
