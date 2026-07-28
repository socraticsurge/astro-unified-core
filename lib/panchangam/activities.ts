export const MUHURTAM_ACTIVITY_GROUPS = [
  {
    label: "Everyday decisions",
    items: [
      ["any", "Anything auspicious"],
      ["travel", "Travel / journey"],
      ["purchase", "General purchase"],
      ["vehicle", "Vehicle purchase"],
      ["gold", "Gold / jewellery"],
      ["job", "Starting employment"],
      ["borrowing_money", "Taking a loan"],
      ["lending_money", "Lending money"],
      ["pilgrimage", "Pilgrimage"],
    ],
  },
  {
    label: "Family & samskaras",
    items: [
      ["wedding", "Wedding"],
      ["engagement", "Engagement"],
      ["naming", "Naming ceremony"],
      ["annaprasana", "First feeding"],
      ["karnavedha", "Ear piercing"],
      ["mundana", "First head shave"],
      ["upanayana", "Sacred thread"],
      ["vidyarambha", "Education beginning"],
      ["seemantha", "Prenatal ceremony"],
      ["ceremony", "Shantika / Paushtika rite"],
      ["yajna", "Homa offering"],
    ],
  },
  {
    label: "Home & property",
    items: [
      ["gruhapravesha", "Gruhapravesha"],
      ["property", "Land purchase"],
      ["house_purchase", "House purchase"],
      ["bhumi_puja", "Bhumi Puja"],
      ["home_repair", "Home renovation"],
      ["construction_roof", "Roof laying"],
      ["well_digging", "Well digging"],
      ["wood_cutting", "Wood cutting"],
    ],
  },
  {
    label: "Work, public & special",
    items: [
      ["business", "Business investment"],
      ["business_inventory_purchase", "Trade inventory"],
      ["beginning", "Dharma-kriya beginning"],
      ["court", "Court filing"],
      ["litigation", "Litigation filing"],
      ["surgery", "Surgery"],
      ["cremation", "Deferred funeral rites"],
      ["coronation", "Title ceremony"],
    ],
  },
] as const;

export function muhurtamActivityLabel(value: string): string {
  for (const group of MUHURTAM_ACTIVITY_GROUPS) {
    const item = group.items.find(([id]) => id === value);
    if (item) return item[1];
  }
  return value;
}
