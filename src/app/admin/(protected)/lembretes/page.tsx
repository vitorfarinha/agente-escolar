import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function LembretesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: reminders } = await supabase.from("reminders").select("*").order("due_date");

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Lembretes agendados</h1>

      {!reminders || reminders.length === 0 ? (
        <p className="text-sm text-gray-600">Ainda não há lembretes agendados.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-gray-600">
              <th className="py-2">Título</th>
              <th className="py-2">Data</th>
              <th className="py-2">Âmbito</th>
              <th className="py-2">Enviado</th>
            </tr>
          </thead>
          <tbody>
            {reminders.map((reminder) => (
              <tr key={reminder.id} className="border-t border-gray-200">
                <td className="py-2">{reminder.title}</td>
                <td className="py-2">{reminder.due_date}</td>
                <td className="py-2">{reminder.scope_type}</td>
                <td className="py-2">{reminder.sent_at ? "sim" : "não"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
