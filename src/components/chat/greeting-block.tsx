"use client";

function greetingForHour(hour: number): string {
  if (hour < 6) return "Boa noite";
  if (hour < 13) return "Bom dia";
  if (hour < 20) return "Boa tarde";
  return "Boa noite";
}

export function GreetingBlock({ firstName }: { firstName: string }) {
  // Calculado na hora local do browser a cada render — pode divergir da
  // versão gerada no servidor (SSR usa a hora do servidor), por isso o
  // texto tem suppressHydrationWarning em vez de forçar um estado/efeito
  // só para adiar o cálculo até montar.
  const greeting = greetingForHour(new Date().getHours());

  return (
    <div className="mx-auto mb-6 max-w-2xl px-4 text-center">
      <h2 className="text-2xl font-bold text-primary" suppressHydrationWarning>
        {greeting}, {firstName}
      </h2>
      <p className="mt-1 text-sm text-secondary">
        Pergunta o que quiseres sobre a escola do teu educando — horários, circulares, atividades...
      </p>
    </div>
  );
}
