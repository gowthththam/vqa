import React, { useEffect, useRef, useState } from "react";
import { FileText, X, Send, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BACKEND_URL } from "@/hooks/useVoiceAnalysis";

interface Message {
  id: number;
  sender: "Agent" | "Employee";
  text: string;
  timestamp: string;
}

interface TranscriptPanelProps {
  messages: Message[];
  selectedTicket?: { number: string } | null;
}

const TranscriptPanel: React.FC<TranscriptPanelProps> = ({ messages, selectedTicket }) => {
  const [quickSuggestions, setQuickSuggestions] = useState<string[]>([]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [lastCustomerContext, setLastCustomerContext] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState("");
  const [workNotes, setWorkNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [simplifiedMap, setSimplifiedMap] = useState<{ [id: number]: string }>({});
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Helper: get last N customer (Employee) messages for context
  const getLastCustomerMessages = (N = 3) => {
    const customerMsgs = messages.filter(m => m.sender === "Employee" && m.text && m.text.length > 3);
    return customerMsgs.slice(-N).map(m => `Employee: ${m.text}`).join("\n");
  };
  // Helper: basic trigger for when to show quick response (question, request, etc)
  const shouldShowQuickResponse = () => {
    if (messages.length === 0) return false;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.sender !== "Employee") return false;
    // Trigger if last message contains a question mark, or starts with "can", "how", "what", "why", "please", "could", "would"
    const triggers = ["?", "can ", "how ", "what ", "why ", "please", "could ", "would ", "need ", "help", "issue", "problem", "unable", "not working"];
    const txt = lastMsg.text.toLowerCase();
    return triggers.some(t => txt.includes(t));
  };
  // Auto-fetch quick response when needed
  useEffect(() => {
    if (!shouldShowQuickResponse()) {
      setQuickSuggestions([]);
      setLastCustomerContext("");
      setQuickLoading(false);
      return;
    }
    const context = getLastCustomerMessages(3);
    if (context === lastCustomerContext) return; // Only fetch if context changed
    setQuickLoading(true);
    setLastCustomerContext(context);
    fetch(`${BACKEND_URL}/api/quick_response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context })
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.suggestions)) {
          setQuickSuggestions(data.suggestions);
        } else {
          setQuickSuggestions(["Could not generate quick responses."]);
        }
      })
      .catch(() => setQuickSuggestions(["Could not generate quick responses."]))
      .finally(() => setQuickLoading(false));
  }, [messages]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  // Reset summary/work notes when ticket changes
  setSummary("");
  setWorkNotes("");
  setShowSummary(false);
  setUpdateStatus(null);
  setSummaryLoading(false);
  console.log('[TranscriptPanel] Ticket changed - clearing summary and work notes');
}, [selectedTicket?.number]); // Reset when ticket number changes


  // Extract timestamp from the formatted timestamp string
  const extractTimeFromTimestamp = (timestamp: string) => {
    // Your original format: "Agent - 14:30:25 - message text" or "Employee - 14:30:25 - message text"
    const timeMatch = timestamp.match(/(\d{1,2}:\d{2}:\d{2})/);
    if (timeMatch) {
      return timeMatch[1];
    }

    // Fallback: try to parse as ISO date
    try {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-GB', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    } catch (e) {
      // Ignore parsing errors
    }

    // Last fallback
    return "--:--:--";
  };

  // auto-scroll when new messages arrive
  useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [messages]);

  const handleSimplifyClick = async (id: number, text: string) => {
    setLoadingId(id);
    try {
      const res = await fetch(`${BACKEND_URL}/api/simplify_transcript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      if (data && typeof data.simplified === 'string' && data.simplified.trim() && !data.simplified.toLowerCase().includes('error')) {
        setSimplifiedMap((prev) => ({ ...prev, [id]: data.simplified }));
      } else {
        setSimplifiedMap((prev) => ({ ...prev, [id]: "Could not simplify this message." }));
      }
    } catch {
      setSimplifiedMap((prev) => ({ ...prev, [id]: "Could not simplify this message." }));
    }
    setLoadingId(null);
  };

const handleSummaryClick = async () => {
  if (!selectedTicket?.number) {
    alert("Please select an incident first");
    return;
  }
  if (!summary) {
    setSummaryLoading(true);
    try {
      // Create conversation text from current messages
      const conversationText = messages
        .map(msg => `${msg.sender}: ${msg.text}`)
        .join('\n');
      
      // Send conversation directly to summary generation
      const res = await fetch(`${BACKEND_URL}/api/generate_summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation: conversationText })
      });
      
      const data = await res.json();
      const summaryText = data.summary || "No summary available";
      setSummary(summaryText);
      setWorkNotes(summaryText);
    } catch (error) {
      console.error("Error fetching summary:", error);
      setSummary("Error fetching summary");
      setWorkNotes("Error fetching summary");
    } finally {
      setSummaryLoading(false);
    }
  }
  setShowSummary(true);
};


  const handleCloseIncident = async () => {
    if (!selectedTicket?.number || !workNotes.trim()) {
      setUpdateStatus({
        type: 'error',
        message: 'Incident number and work notes are required'
      });
      return;
    }
    setIsUpdating(true);
    setUpdateStatus(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/close-incident`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incident_number: selectedTicket.number,
          work_notes: workNotes.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUpdateStatus({
          type: 'success',
          message: data.message || 'Incident updated successfully'
        });
        setTimeout(() => {
          setShowSummary(false);
          setUpdateStatus(null);
        }, 2000);
      } else {
        setUpdateStatus({
          type: 'error',
          message: data.error || 'Failed to update incident'
        });
      }
    } catch (error) {
      setUpdateStatus({
        type: 'error',
        message: 'Network error occurred while updating incident'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const closeSummaryPopup = () => {
    setShowSummary(false);
    setUpdateStatus(null);
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white rounded-md border border-gray-200">
        {/* --- HEADER --- */}
        <div className="flex-shrink-0 p-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-medium">Conversation</h3>
          <button
            onClick={handleSummaryClick}
            disabled={summaryLoading}
            className="ml-2 flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white font-semibold shadow-md transition hover:from-violet-600 hover:to-fuchsia-700 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-fuchsia-300 text-sm disabled:opacity-50"
            style={{ minWidth: 120 }}
          >
            {summaryLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" />
                Show Summary
              </>
            )}
          </button>
        </div>

        {/* --- SCROLLABLE MIDDLE --- */}
        <div className="flex-1 min-h-0 overflow-hidden relative" ref={scrollAreaRef}>
          <ScrollArea className="h-full w-full">
            <div className="p-4 space-y-2">
              {messages.map((m) => {
                const isAgent = m.sender === "Agent";
                const timeString = extractTimeFromTimestamp(m.timestamp);
                return (
                  <div key={m.id} className={isAgent ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={`
                        max-w-[80%] rounded-lg p-2 cursor-pointer transition border border-transparent hover:border-blue-400
                        ${isAgent
                          ? "bg-blue-500 text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-900 rounded-bl-sm"}
                      `}
                      title="Click for options"
                      onClick={() => handleSimplifyClick(m.id, m.text)}
                    >
                      <div className="text-sm mb-1">
                        {m.text}
                        {loadingId === m.id && (
                          <span className="ml-2 text-xs text-blue-300">Simplifying...</span>
                        )}
                        {simplifiedMap[m.id] && (
                          <div className="mt-2 p-2 bg-blue-50 text-blue-900 rounded text-xs border border-blue-200">
                            <strong>Simplified:</strong> {simplifiedMap[m.id]}
                          </div>
                        )}
                      </div>
                      <div
                        className={`
                          text-xs flex items-center gap-1
                          ${isAgent ? "text-blue-100" : "text-gray-500"}
                        `}
                      >
                        <span>{m.sender}</span>
                        <span>•</span>
                        <span>{timeString}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Full Screen Summary Popup */}
      {showSummary && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Incident Summary & Work Notes</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Incident: <span className="font-medium text-blue-600">{selectedTicket?.number}</span>
                </p>
              </div>
              <button
                onClick={closeSummaryPopup}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-hidden p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Conversation Summary</h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 max-h-40 overflow-y-auto">
                  {summaryLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                      <span className="text-gray-600">Generating summary...</span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{summary}</p>
                  )}
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                <label htmlFor="workNotes" className="text-lg font-semibold text-gray-900 mb-3">
                  Work Notes
                </label>
                <textarea
                  id="workNotes"
                  value={workNotes}
                  onChange={(e) => setWorkNotes(e.target.value)}
                  placeholder="Enter work notes to update the incident..."
                  className="flex-1 min-h-[200px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                />
              </div>
              {updateStatus && (
                <div className={`p-4 rounded-lg border ${updateStatus.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
                  }`}>
                  <p className="text-sm font-medium">{updateStatus.message}</p>
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={closeSummaryPopup}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleCloseIncident}
                disabled={isUpdating || !workNotes.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Update Incident
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TranscriptPanel;