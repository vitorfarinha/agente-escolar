import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Badge, Card, PageHeader } from "@/components/ui";

export default async function LembretesPage() {
  const supabase = await createServerSupabaseClient();
  const { data: reminders } = await supabase.from("reminders").select("*").order("due_date");

  return (
    <div>
      <PageHeader title="Lembretes agendados" />

      {!reminders || reminders.length === 0 ? (
        <p className="text-sm text-secondary">Ainda não há lembretes agendados.</p>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-subtle text-left text-secondary">
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Âmbito</th>
                <th className="px-4 py-3 font-medium">Enviado</th>
              </tr>
            </thead>
            <tbody>
              {reminders.map((reminder) => (
                <tr key={reminder.id} className="border-t border-subtle">
                  <td className="px-4 py-3 text-primary">{reminder.title}</td>
                  <td className="px-4 py-3 text-primary">{reminder.due_date}</td>
                  <td className="px-4 py-3 text-secondary">{reminder.scope_type}</td>
                  <td className="px-4 py-3">
                    <Badge tone={reminder.sent_at ? "success" : "neutral"}>{reminder.sent_at ? "sim" : "não"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
