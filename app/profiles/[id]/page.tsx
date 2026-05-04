"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EnginePanel } from "@/components/EnginePanel";
import { ComparePanel } from "@/components/ComparePanel";
import { ChatPanel } from "@/components/ChatPanel";
import { Badge } from "@/components/ui/badge";
import type { Profile } from "@/lib/db";

type EngineState = { output: unknown; loading: boolean; error?: string };
const DEFAULT_ENGINE: EngineState = { output: null, loading: false };

export default function ProfileDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [engines, setEngines] = useState<Record<string, EngineState>>({
    vedastro: DEFAULT_ENGINE,
    panchangam: DEFAULT_ENGINE,
    jyotishganit: DEFAULT_ENGINE,
  });

  useEffect(() => {
    fetch(`/api/profiles/${id}`)
      .then((r) => r.json())
      .then(setProfile);
  }, [id]);

  const fetchEngine = useCallback(
    async (engine: "vedastro" | "panchangam" | "jyotishganit") => {
      setEngines((e) => ({ ...e, [engine]: { output: null, loading: true } }));
      try {
        const res = await fetch(`/api/readings/${engine}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ profile_id: id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Request failed");
        setEngines((e) => ({ ...e, [engine]: { output: data.output, loading: false } }));
      } catch (err) {
        setEngines((e) => ({
          ...e,
          [engine]: { output: null, loading: false, error: err instanceof Error ? err.message : "Unknown error" },
        }));
      }
    },
    [id]
  );

  if (!profile) return <div className="text-center py-16 text-muted-foreground">Loading…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{profile.name}</h1>
        <div className="flex gap-2 mt-2 flex-wrap">
          <Badge variant="outline">{profile.date_of_birth}</Badge>
          <Badge variant="outline">{profile.time_of_birth}</Badge>
          <Badge variant="outline">{profile.place_of_birth}</Badge>
          <Badge variant="secondary">{profile.timezone}</Badge>
        </div>
      </div>

      <Tabs defaultValue="engines">
        <TabsList className="mb-4">
          <TabsTrigger value="engines">Engine Outputs</TabsTrigger>
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="chat">Chat (Ollama)</TabsTrigger>
        </TabsList>

        <TabsContent value="engines">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(["vedastro", "panchangam", "jyotishganit"] as const).map((engine) => (
              <EnginePanel
                key={engine}
                engine={engine}
                profileId={id}
                output={engines[engine].output}
                loading={engines[engine].loading}
                error={engines[engine].error}
                onRefresh={() => fetchEngine(engine)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="compare">
          <ComparePanel
            vedastroOutput={engines.vedastro.output}
            panchangamOutput={engines.panchangam.output}
            jyotishganitOutput={engines.jyotishganit.output}
          />
        </TabsContent>

        <TabsContent value="chat">
          <ChatPanel profileId={id} profileName={profile.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
