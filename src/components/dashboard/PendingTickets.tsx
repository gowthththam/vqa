import React, { useState, useMemo } from "react";
import { FileText, X } from "lucide-react";

interface Ticket {
  category: string;
  number: string;
  opened_at: string;
  priority: string;
  short_description: string;
  state: string;
  urgency: string;
}

interface PendingTicketsProps {
  tickets: Ticket[];
  loading?: boolean;
  error?: string | null;
  onSelectTicket?: (ticket: Ticket | null) => void;
  selectedTicketId?: string | null;
  onSelectKbArticles?: (ticket: Ticket) => void;
  articles?: Array<{
    id: number;
    title: string;
    content: string;
    category: string;
  }>;
  onCopyLink?: (id: number) => void;
}

const PendingTickets: React.FC<PendingTicketsProps> = ({
  tickets,
  loading = false,
  error = null,
  onSelectTicket,
  selectedTicketId,
  onSelectKbArticles,
  articles = [],
  onCopyLink = () => {}
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showKbPopup, setShowKbPopup] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<any>(null);

  // Filter tickets based on search term
  const filteredTickets = useMemo(() => {
    if (!searchTerm.trim()) return tickets;
    
    const term = searchTerm.toLowerCase();
    return tickets.filter(ticket => 
      ticket.number.toLowerCase().includes(term) ||
      ticket.short_description.toLowerCase().includes(term) ||
      ticket.category.toLowerCase().includes(term) ||
      ticket.state.toLowerCase().includes(term) ||
      ticket.priority.toLowerCase().includes(term)
    );
  }, [tickets, searchTerm]);

  // Show search bar only if there are more than 3 tickets
  const showSearch = tickets.length > 3;

  // Handler to minimize after selecting a ticket (5s delay)
  const handleSelectTicket = (ticket: Ticket | null) => {
    if (onSelectTicket) onSelectTicket(ticket);
    setTimeout(() => {
      setCollapsed(true);
    }, 5000);
  };

  // Format content into React components (same as KnowledgeBasePanel)
  const formatContentAsReact = (content: string) => {
    if (!content) return [];
    
    const elements = [];
    let elementKey = 0;
    
    const stepSplitRegex = /(\d+\.\s)/;
    const parts = content.split(stepSplitRegex);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part || !part.trim()) continue;
      
      if (stepSplitRegex.test(part)) {
        const stepNumber = part;
        const stepContent = parts[i + 1] || '';
        
        if (stepContent.trim()) {
          elements.push(
            <div key={`step-${elementKey++}`} className="mb-3">
              <div className="font-bold text-blue-800 bg-blue-50 px-3 py-2 rounded-md border-l-4 border-blue-400">
                <span className="text-blue-600">{stepNumber}</span>
                {stepContent.trim()}
              </div>
            </div>
          );
          i++;
        }
      } else {
        const sentences = part.split(/\.\s+/).filter(s => s.trim());
        
        sentences.forEach((sentence) => {
          const trimmedSentence = sentence.trim();
          if (!trimmedSentence) return;
          
          if (
            trimmedSentence.toLowerCase().includes('once verification') ||
            trimmedSentence.toLowerCase().includes('once active directory') ||
            trimmedSentence.toLowerCase().includes('password reset is done')
          ) {
            elements.push(
              <div key={`highlight-${elementKey++}`} className="bg-yellow-50 border-l-4 border-yellow-400 px-3 py-2 mb-3">
                <p className="font-semibold text-yellow-800">
                  {trimmedSentence}.
                </p>
              </div>
            );
          } else if (trimmedSentence.length > 10) {
            elements.push(
              <p key={`para-${elementKey++}`} className="mb-2 text-gray-700 leading-relaxed text-sm">
                {trimmedSentence}.
              </p>
            );
          }
        });
      }
    }
    
    if (elements.length === 0) {
      elements.push(
        <p key="fallback" className="text-gray-700 text-sm leading-relaxed">
          {content}
        </p>
      );
    }
    
    return elements;
  };
  // Clear search when collapsed
  const handleCollapse = (newCollapsed: boolean) => {
    setCollapsed(newCollapsed);
    if (newCollapsed) {
      setSearchTerm("");
      setExpandedId(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-md transition-all duration-300">
      <div className="flex items-center justify-between mb-4 cursor-pointer select-none" onClick={() => handleCollapse(!collapsed)}>
        <h3 className="font-medium text-base mb-0">Open Tickets</h3>
        <div className="flex items-center">
          <span className="flex items-center bg-blue-100 text-blue-800 text-xs font-semibold rounded-full px-3 py-1 border border-blue-200">
            <span className="mr-2">
              {searchTerm ? `${filteredTickets.length}/${tickets.length}` : tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
            </span>
            <button
              className="p-0 m-0 bg-transparent border-none focus:outline-none flex items-center"
              tabIndex={-1}
              aria-label={collapsed ? 'Expand' : 'Collapse'}
              onClick={e => { e.stopPropagation(); handleCollapse(!collapsed); }}
            >
              {collapsed ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              )}
            </button>
          </span>
        </div>
      </div>
      
      {/* Knowledge Base Section */}
      {!collapsed && articles.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">KB Articles</span>
            </div>
            <button
              onClick={() => setShowKbPopup(true)}
              className="bg-blue-600 text-white px-2 py-1 rounded-full text-xs font-bold hover:bg-blue-700 transition-colors"
            >
              {articles.length}
            </button>
          </div>
        </div>
      )}
      
      {collapsed ? null : (
        <>
          {/* Search Bar - Only show if more than 3 tickets */}
          {showSearch && !loading && !error && (
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by ticket number, description, category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 pl-10 pr-4 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onClick={(e) => e.stopPropagation()}
                />
                <svg 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {searchTerm && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm("");
                    }}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
              {searchTerm && (
                <div className="mt-2 text-xs text-gray-500">
                  Showing {filteredTickets.length} of {tickets.length} tickets
                  {filteredTickets.length === 0 && (
                    <span className="text-orange-600 ml-1">- No matches found</span>
                  )}
                </div>
              )}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-gray-500">Loading tickets...</div>
          ) : error ? (
            <div className="text-sm text-red-500">{error}</div>
          ) : tickets.length === 0 ? (
            <div className="text-sm text-gray-500">No pending tickets.</div>
          ) : filteredTickets.length === 0 && searchTerm ? (
            <div className="text-sm text-gray-500 text-center py-4">
              <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              No tickets match your search for "{searchTerm}"
              <br />
              <button 
                onClick={() => setSearchTerm("")}
                className="text-blue-600 hover:text-blue-800 text-xs mt-1 underline"
              >
                Clear search
              </button>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                {filteredTickets.map(ticket => {
                  const expanded = expandedId === ticket.number;
                  
                  // Highlight search terms in the display
                  const highlightText = (text: string) => {
                    if (!searchTerm) return text;
                    const regex = new RegExp(`(${searchTerm})`, 'gi');
                    const parts = text.split(regex);
                    return parts.map((part, index) => 
                      regex.test(part) ? (
                        <span key={index} className="bg-yellow-200 text-yellow-900 px-1 rounded">
                          {part}
                        </span>
                      ) : part
                    );
                  };

                  return (
                    <div
                      key={ticket.number}
                      className={`w-full bg-white rounded-lg border border-gray-200 p-3 transition-all duration-300 ease-in-out hover:shadow-md cursor-pointer ${
                        expanded ? 'ring-2 ring-blue-400 shadow-lg' : 'hover:border-gray-300'
                      }`}
                      onClick={() => {
                        setExpandedId(expanded ? null : ticket.number);
                        handleSelectTicket(expanded ? null : ticket);
                      }}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                          {highlightText(ticket.number)}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          ticket.state === 'New' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {highlightText(ticket.state)}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                        {highlightText(ticket.short_description)}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Priority:</span>
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          ticket.priority === 'High' || ticket.urgency === 'High'
                            ? 'bg-red-100 text-red-800'
                            : ticket.priority === 'Medium' || ticket.urgency === 'Medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {highlightText(ticket.priority)}
                        </span>
                      </div>
                      
                      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        expanded ? 'max-h-40 opacity-100 mt-3' : 'max-h-0 opacity-0'
                      }`}>
                        {expanded && (
                          <div className="border-t border-gray-200 pt-3">
                            <div className="space-y-2 text-xs text-gray-600">
                              <div className="flex justify-between">
                                <span className="font-medium">Opened:</span>
                                <span>{new Date(ticket.opened_at).toLocaleDateString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium">Category:</span>
                                <span className="text-right truncate ml-2">{highlightText(ticket.category)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="font-medium">Urgency:</span>
                                <span>{ticket.urgency}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {/* KB Articles List Popup */}
      {showKbPopup && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Knowledge Base Articles</h3>
              <button
                onClick={() => setShowKbPopup(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    onClick={() => {
                      setSelectedArticle(article);
                      setShowKbPopup(false);
                    }}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-medium text-gray-800 flex-1">{article.title}</h4>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium ml-2">
                        {article.category}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Article Content Popup */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedArticle.title}</h2>
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium mt-2 inline-block">
                  {selectedArticle.category}
                </span>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-2">
                {formatContentAsReact(selectedArticle.content)}
              </div>
              <div className="mt-6 pt-4 border-t border-gray-200">
                <button 
                  className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors duration-200"
                  onClick={() => onCopyLink(selectedArticle.id)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PendingTickets;
