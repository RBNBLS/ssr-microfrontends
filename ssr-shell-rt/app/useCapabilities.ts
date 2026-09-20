import { loadRemote } from "@module-federation/enhanced/runtime";
import { useEffect, useState } from "react";
import type { MfeCapabilities, MfeName } from "./mfeCapabilities";

export type LoadedCapabilities = Partial<MfeCapabilities>;

export function useCapabilities(
  mfeRegistry: Record<string, string>,
): LoadedCapabilities {
  const [capabilities, setCapabilities] = useState<LoadedCapabilities>({});
  const stringifiedMfeNames = Object.keys(mfeRegistry).sort().join(",");

  useEffect(() => {
    let cancelled = false;
    const mfeNames = stringifiedMfeNames
      ? (stringifiedMfeNames.split(",") as Array<MfeName>)
      : [];

    async function loadCapabilities() {
      const results = await Promise.allSettled(
        mfeNames.map((name) => loadRemote<unknown>(`${name}/capabilities`)),
      );
      if (cancelled) return;

      const loadedCapabilities: LoadedCapabilities = {};
      results.forEach((result, i) => {
        const name = mfeNames[i];
        if (result.status === "rejected") {
          console.error(
            `[shell] ${name}/capabilities failed to load:`,
            result.reason,
          );
          return;
        }
        if (result.value == null) return;
        (loadedCapabilities as Record<string, unknown>)[name] = result.value;
      });
      setCapabilities(loadedCapabilities);
    }

    void loadCapabilities();

    return () => {
      cancelled = true;
    };
  }, [stringifiedMfeNames]);

  return capabilities;
}
