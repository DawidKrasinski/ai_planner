import { SettingsView } from "@/components/meridian/settings-view";
import { isGoogleConfigured, parseServerEnv } from "@/lib/env";
import { loadPage } from "@/lib/page-data";
import { getProfile, getSettings, listMemory } from "@/services/records";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ google?: string }>;
}) {
  const google = (await searchParams).google;
  const env = parseServerEnv(process.env);
  const loaded = await loadPage(async () => {
    const [settings, memory, profile] = await Promise.all([
      getSettings(),
      listMemory(),
      getProfile(),
    ]);
    return {
      settings,
      profile: {
        displayName: profile.displayName,
        timezone: profile.timezone,
        locale: profile.locale,
      },
      memory: memory.map((entry) => ({
        id: entry.id,
        type: entry.memoryType,
        text: readMemory(entry.content),
        source: entry.sourceType,
        confirmed: entry.isUserConfirmed,
      })),
      googleConfigured: isGoogleConfigured(env),
      googleStatus: google === "connected" ? ("connected" as const) : google === "error" ? ("error" as const) : ("idle" as const),
      aiProviderLabel:
        env.AI_PROVIDER === "mock"
          ? "Tryb lokalny (mock)"
          : env.AI_PROVIDER === "openai"
            ? "OpenAI"
            : "Anthropic",
    };
  });
  if (!loaded.ok) {
    return <SettingsView state={{ status: "error", message: loaded.message }} />;
  }
  return <SettingsView state={{ status: "success", data: loaded.data }} />;
}

function readMemory(content: unknown): string {
  if (content && typeof content === "object" && "text" in content && typeof content.text === "string") {
    return content.text;
  }
  return JSON.stringify(content);
}
