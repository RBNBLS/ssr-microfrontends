import { useParams } from "react-router";
import { MfeMount } from "../components/MfeMount";
import { mfe2Base } from "../mfeConfig";

// MFE2 is client-rendered only: no loader, no fragment, no server markup. The
// shell mounts it through the same `MfeMount` as MFE1; MFE2 then runs its own
// loaders in the browser. What that costs: its content isn't in the server's
// HTML (no SEO), and an unknown path inside it can't make the document a 404.

export function meta() {
  return [{ title: "MFE2" }];
}

export default function Mfe2Route() {
  // Validated by the parent layout (routes/locale.tsx).
  const locale = useParams().locale!;
  return <MfeMount remote="mfe2" basePath={mfe2Base(locale)} locale={locale} />;
}
