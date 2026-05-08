// Types for the authored content layer in `content/`. These mirror the
// frontmatter shape of each entry type. The `body` field is the raw
// markdown; rendering happens at the call site.

export type Source = {
  text: string;
  chapter?: number | string;
  sloka?: number | string;
  via?: string;
};

export type SectionEntry = {
  type: "section";
  key: string;
  title: string;
  /** Exact title string used by DashaflowView for this section. */
  section_in_view: string;
  /** One-sentence summary, rendered in the modal as a lede. */
  gist?: string;
  sources?: Source[];
  body: string;
};

export type PlanetInHouseEntry = {
  type: "planet-in-house";
  key: string;
  title: string;
  factors: { planet: string; house: number };
  sources?: Source[];
  body: string;
};

export type DashaPairEntry = {
  type: "dasha-pair";
  key: string;
  title: string;
  factors: { mahadasha: string; antardasha: string };
  sources?: Source[];
  rendering_status?: "pending" | "done";
  body: string;
};

export type NakshatraEntry = {
  type: "nakshatra";
  key: string;
  title: string;
  factors: { nakshatra: string; sequence?: number };
  sources?: Source[];
  rendering_status?: "pending" | "done";
  body: string;
};

export type AscendantEntry = {
  type: "ascendant";
  key: string;
  title: string;
  factors: { sign: string };
  sources?: Source[];
  rendering_status?: "pending" | "done";
  body: string;
};

export type HouseLordshipEntry = {
  type: "house-lordship";
  key: string;
  title: string;
  factors: { lord_of_house: number; placed_in_house: number };
  sources?: Source[];
  rendering_status?: "pending" | "done";
  body: string;
};

export type ContentEntry =
  | SectionEntry
  | PlanetInHouseEntry
  | DashaPairEntry
  | NakshatraEntry
  | AscendantEntry
  | HouseLordshipEntry;

export type ContentType = ContentEntry["type"];
