"use client";
import { useMemo } from "react";
import { extractCompareRows } from "@/lib/compare";

type Props = {
  vedastroOutput: unknown;
  panchangamOutput: unknown;
  jyotishganitOutput: unknown;
};

function CellValue({ value }: { value: unknown }) {
  if (value === null || value === undefined)
    return <span className="text-gray-300 italic text-xs">—</span>;
  if (typeof value === "object")
    return <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>;
  return <span className="text-sm">{String(value)}</span>;
}

export function ComparePanel({ vedastroOutput, panchangamOutput, jyotishganitOutput }: Props) {
  const rows = useMemo(
    () => extractCompareRows(vedastroOutput, panchangamOutput, jyotishganitOutput),
    [vedastroOutput, panchangamOutput, jyotishganitOutput]
  );

  if (rows.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        Fetch readings from at least two engines to see a comparison.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-semibold text-muted-foreground w-1/4">Field</th>
            <th className="text-left py-2 px-3 font-semibold text-blue-700 w-1/4">VedAstro</th>
            <th className="text-left py-2 px-3 font-semibold text-amber-700 w-1/4">Panchangam</th>
            <th className="text-left py-2 px-3 font-semibold text-green-700 w-1/4">Jyotishganit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b hover:bg-muted/30">
              <td className="py-2 px-3 font-medium text-xs text-muted-foreground align-top">{row.label}</td>
              <td className="py-2 px-3 align-top"><CellValue value={row.vedastro} /></td>
              <td className="py-2 px-3 align-top"><CellValue value={row.panchangam} /></td>
              <td className="py-2 px-3 align-top"><CellValue value={row.jyotishganit} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-muted-foreground mt-4">
        Only fields present in 2+ engines are shown. See individual engine tabs for complete output.
      </p>
    </div>
  );
}
