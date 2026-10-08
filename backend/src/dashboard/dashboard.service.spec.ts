import { currentMonth, monthBounds } from './dashboard.service';
describe('Dashboard: período de São Paulo', () => {
  it('meia-noite UTC ainda pertence ao mês anterior no Brasil', () =>
    expect(currentMonth(new Date('2026-11-01T01:00:00Z'))).toBe('2026-10'));
  it('limites usam intervalo aberto no fim e offset brasileiro', () => {
    const bounds = monthBounds('2026-10');
    expect(bounds.start.toISOString()).toBe('2026-10-01T03:00:00.000Z');
    expect(bounds.end.toISOString()).toBe('2026-11-01T03:00:00.000Z');
    expect(bounds.days).toBe(31);
  });
  it('ano bissexto tem 29 dias em fevereiro', () => expect(monthBounds('2028-02').days).toBe(29));
});
