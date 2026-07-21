import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ListChecks, ArrowUpRight } from 'lucide-react';
import { EventService } from '../api';
import { TaskChecklistPanel } from '../components/TaskChecklistPanel';

export function TaskChecklist() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdParam = searchParams.get('event');

  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string>(eventIdParam || '');

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const res = await EventService.getAll();
        const list = res.data.results || res.data;
        setEvents(list);
        if (!selectedEventId && list.length > 0 && !eventIdParam) {
          // Leave unselected — force an explicit choice rather than guessing.
        }
      } catch (e) {
        console.error("Failed to fetch projects", e);
      } finally {
        setIsLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = (id: string) => {
    setSelectedEventId(id);
    if (id) {
      setSearchParams({ event: id });
    } else {
      setSearchParams({});
    }
  };

  const selectedEvent = events.find((e: any) => String(e.event_id) === String(selectedEventId));

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-main)]">Task Checklist</h1>
        <p className="text-[var(--text-muted)]">Pick a project to manage its pre-event, during-event, and post-event tasks.</p>
      </div>

      <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-soft)] p-6">
        <label className="block text-xs font-bold text-[var(--text-muted)] uppercase mb-2">Project / Event</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedEventId}
            onChange={e => handleSelect(e.target.value)}
            className="flex-1 h-11 px-3 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl outline-none focus:border-brand-primary text-sm font-medium text-[var(--text-main)]"
          >
            <option value="">{isLoading ? 'Loading projects...' : 'Select a project...'}</option>
            {events.map((ev: any) => (
              <option key={ev.event_id} value={ev.event_id}>{ev.name}</option>
            ))}
          </select>
          {selectedEventId && (
            <button
              onClick={() => navigate(`/events/${selectedEventId}`)}
              className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-[var(--bg-app)] border border-[var(--border-soft)] text-[var(--text-main)] font-bold rounded-xl hover:bg-[var(--border-soft)] transition-colors text-sm whitespace-nowrap"
            >
              View Project P&L <ArrowUpRight className="w-4 h-4" />
            </button>
          )}
        </div>
        {!isLoading && events.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] mt-3">No projects yet. Create one from the Projects page first.</p>
        )}
      </div>

      {selectedEventId ? (
        <TaskChecklistPanel eventId={selectedEventId} eventName={selectedEvent?.name} />
      ) : (
        <div className="bg-[var(--bg-app)] rounded-2xl border border-dashed border-[var(--border-soft)] p-12 text-center text-[var(--text-muted)] flex flex-col items-center gap-3">
          <ListChecks className="w-8 h-8" />
          Select a project above to view or build its task checklist.
        </div>
      )}
    </div>
  );
}
