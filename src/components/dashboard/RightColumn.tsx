import IntelligentInsights from '@/components/dashboard/GeminiSuggestions';
import { useEffect, useState } from 'react';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://wipgenai.lwpcoe.com/vqa_live';
function getEmployeeContext(messages) {
  return messages
    .filter(m => m.sender === 'Employee' && m.text && m.text.trim())
    .slice(-3)
    .map(m => m.text)
    .join('\n');
}

function IntelligentInsightsContainer({ messages }) {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const context = getEmployeeContext(messages);
    if (!context || context.length < 5) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    fetch(`${BACKEND_URL}/api/quick_response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ context })
    })
      .then(res => res.json())
      .then(data => {
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      })
      .catch(() => setSuggestions(['Could not generate quick responses.']))
      .finally(() => setLoading(false));
  }, [messages]);
  return <IntelligentInsights suggestions={suggestions} loading={loading} />;
}
import React from 'react';
import TranscriptPanel from '@/components/dashboard/TranscriptPanel';
import KnowledgeBasePanel from '@/components/dashboard/KnowledgeBasePanel';
import CompleteCallButton from '@/components/dashboard/CompleteCallButton';

interface Message {
  id: number;
  sender: 'Agent' | 'Employee';
  text: string;
  timestamp: string;
}

interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
}

interface RightColumnProps {
  messages: Message[];
  riskLevel: string;
  customerTone: string;
  issueComplexity: string;
  issueComplexityLoading?: boolean;
  resolutionTime: string;
  progressValue: number;
  articles: Article[];
  onCopyLink: (id: number) => void;
  onCompleteCall: () => void;
  selectedTicket?: { number: string } | null; // Add this prop
}

const RightColumn: React.FC<RightColumnProps> = ({
  messages,
  riskLevel,
  customerTone,
  issueComplexity,
  issueComplexityLoading,
  resolutionTime,
  progressValue,
  articles,
  onCopyLink,
  onCompleteCall,
  selectedTicket, // Add this line
  // kbLoading, summaryLoading // if you want to pass these down
}) => {
  return (
    <div className="col-span-12 md:col-span-3 h-full flex flex-col">
      {/* Transcript Panel - Fixed height container */}
      <div className="h-[400px] mb-4 flex-shrink-0 w-full">
        <TranscriptPanel messages={messages} selectedTicket={selectedTicket} /* summaryLoading={summaryLoading} */ />
      </div>

      {/* Intelligent Insights - New module below conversation, above escalation risk */}
      <IntelligentInsightsContainer messages={messages} />



      {/* Bottom section - Takes remaining space */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Knowledge Base - moved to MiddleColumn */}

        {/* Complete Call Button - Always at bottom */}
        <div className="flex-shrink-0">
          <CompleteCallButton onClick={onCompleteCall} />
        </div>
      </div>
    </div>
  );
};

export default RightColumn;