"use client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { IdentityStrip }    from "./IdentityStrip";
import { HouseGrid }        from "./HouseGrid";
import { ChartTab }         from "./tabs/ChartTab";
import { PlanetsTab }       from "./tabs/PlanetsTab";
import { HousesVargasTab }  from "./tabs/HousesVargasTab";
import { PatternsTab }      from "./tabs/PatternsTab";
import { TimeTab }          from "./tabs/TimeTab";
import type { UnifiedViewProps } from "./types";

const TABS = [
  { value: "chart",    label: "Chart"           },
  { value: "planets",  label: "Planets"         },
  { value: "houses",   label: "Houses & Vargas" },
  { value: "patterns", label: "Patterns"        },
  { value: "time",     label: "Time"            },
];

export function UnifiedView({
  chartOutput,
  transitOutput,
  careerOutput,
  isTransitLoading,
  isCareerLoading,
  onFetchTransit,
  onFetchCareer,
}: UnifiedViewProps) {
  const data        = chartOutput?.data as Record<string, unknown> | undefined;
  const planets     = (data?.planets as Record<string, { house?: number; sign?: string; d9_sign?: string }> | undefined) ?? {};
  const lagna       = data?.lagna       as { sign?: string; d9_sign?: string } | undefined;
  const lagnaSign   = lagna?.sign   ?? "Aries";
  const d9LagnaSign = lagna?.d9_sign ?? lagnaSign;

  return (
    <div>
      {/* Experimental badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/15 text-purple-300 border border-purple-500/30">
          Experimental
        </span>
        <span className="text-xs text-muted-foreground">Unified view · feedback welcome</span>
      </div>

      {/* Identity strip */}
      <IdentityStrip chartOutput={chartOutput} transitOutput={transitOutput} />

      {/* Two-column layout */}
      <div className="flex gap-5 items-start">
        {/* Left: sticky house grid (desktop only) */}
        <div className="hidden lg:block w-56 flex-shrink-0 sticky top-20 self-start">
          <HouseGrid
            planets={planets}
            lagnaSign={lagnaSign}
            d9LagnaSign={d9LagnaSign}
          />
        </div>

        {/* Right: 5 tabs */}
        <div className="flex-1 min-w-0">
          <Tabs defaultValue="chart">
            <TabsList className="flex flex-wrap h-auto gap-1 mb-5 bg-[var(--color-surface-1)] p-1 rounded-lg border border-[var(--color-border)]">
              {TABS.map(t => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="text-xs px-3 py-1.5 data-[state=active]:bg-[var(--color-surface-active)] data-[state=active]:text-[var(--color-ink-1)] data-[state=active]:shadow-sm"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="chart">
              <ChartTab chartOutput={chartOutput} />
            </TabsContent>

            <TabsContent value="planets">
              <PlanetsTab chartOutput={chartOutput} />
            </TabsContent>

            <TabsContent value="houses">
              <HousesVargasTab chartOutput={chartOutput} lagnaSign={lagnaSign} />
            </TabsContent>

            <TabsContent value="patterns">
              <PatternsTab chartOutput={chartOutput} />
            </TabsContent>

            <TabsContent value="time">
              <TimeTab
                chartOutput={chartOutput}
                transitOutput={transitOutput}
                careerOutput={careerOutput}
                isTransitLoading={isTransitLoading}
                isCareerLoading={isCareerLoading}
                onFetchTransit={onFetchTransit}
                onFetchCareer={onFetchCareer}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
