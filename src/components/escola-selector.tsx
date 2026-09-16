"use client";

import { useRouter, usePathname } from "next/navigation";
import { Select, FieldLabel } from "@/components/admin/ui";

export function EscolaSelector({ schools, selectedId }: { schools: { id: string; name: string }[]; selectedId: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="mb-6 inline-block">
      <FieldLabel>Escola</FieldLabel>
      <Select value={selectedId} onChange={(event) => router.push(`${pathname}?escola_id=${event.target.value}`)}>
        {schools.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
      </Select>
    </label>
  );
}
