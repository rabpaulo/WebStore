import { DashboardSummary } from '../lib/types';
export function SalesChart({ days }: { days: DashboardSummary['salesByDay'] }) {
  const maximum = Math.max(4, Math.ceil(Math.max(...days.map((day) => day.orders)) / 4) * 4);
  return (
    <>
      <div
        className="chart"
        role="img"
        aria-label={`Pedidos pagos por dia: ${days.map((day) => `${day.date}: ${day.orders}`).join('; ')}`}
      >
        <div className="chart-grid">
          {[maximum, maximum * 0.75, maximum * 0.5, maximum * 0.25, 0].map((tick) => (
            <div key={tick}>
              <span>{tick}</span>
            </div>
          ))}
        </div>
        <div className="chart-bars">
          {days.map((day) => (
            <div
              tabIndex={day.orders ? 0 : undefined}
              className="chart-bar"
              key={day.date}
              style={{ height: `${(day.orders / maximum) * 100}%`, opacity: day.orders ? 1 : 0 }}
            >
              <span className="chart-tooltip">
                Dia {day.date.slice(-2)} · {day.orders} pedidos pagos
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="chart-axis">
        {[
          1,
          Math.round(days.length * 0.25),
          Math.round(days.length * 0.5),
          Math.round(days.length * 0.75),
          days.length,
        ].map((day) => (
          <span key={day}>{String(day).padStart(2, '0')}</span>
        ))}
      </div>
    </>
  );
}
