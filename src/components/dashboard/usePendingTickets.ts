import { useEffect, useState } from "react";

export interface Ticket {
  id: string;
  description: string;
  status: string;
  urgency?: string;
  assignedTo?: string;
  openedDate?: string;
  priority?: string;
  category?: string;
}

export function usePendingTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch("/api/pending-tickets")
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data) => {
        // Map backend fields to frontend Ticket type
        // ServiceNow field mappings and value translations
        const priorityMap: Record<string, string> = { "1": "P1", "2": "P2", "3": "P3", "4": "P4" };
        const urgencyMap: Record<string, string> = { "1": "High", "2": "Moderate", "3": "Low" };
        const stateMap: Record<string, string> = { "1": "pending", "2": "in progress", "3": "on hold", "6": "resolved", "7": "closed" };

        setTickets(
          (data.result || data.tickets || []).map((t: any) => {
            console.log("[DEBUG] ServiceNow Ticket:", t); // 👈 See what’s coming in

            return {
              id: t.number || t.id,
              description: t.short_description || t.description || "No description",
              status: stateMap[t.state] || t.state || "Unknown",
              urgency: urgencyMap[t.urgency] || t.urgency || "N/A",
              assignedTo: t.assigned_to?.display_value || t.assignedTo || "Unassigned",
              openedDate: t.opened_at || t.openedDate || t.sys_created_on || t.created_on || t.sys_created_on_display || "N/A",
              priority: priorityMap[t.priority] || t.priority || t.priority_label || t.severity || "N/A",
              category: t.category || t.u_category || t.category_name || t.cmdb_ci?.display_value || t.cmdb_ci || "Uncategorized",
            };
          })
        );
        setError(null);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return { tickets, loading, error };
}
