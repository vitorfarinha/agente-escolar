"use client";

import { useRouter, usePathname } from "next/navigation";

export function EscolaSelector({ schools, selectedId }: { schools: { id: string; name: string }[]; selectedId: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <label className="mb-6 flex items-center gap-2 text-sm">
      <span className="font-medium text-gray-700">Escola</span>
      <select
        value={selectedId}
        onChange={(event) => router.push(`${pathname}?escola_id=${event.target.value}`)}
        className="rounded border border-gray-300 px-3 py-2 text-sm"
      >
        {schools.map((school) => (
          <option key={school.id} value={school.id}>
            {school.name}
          </option>
        ))}
      </select>
    </label>
  );
}
