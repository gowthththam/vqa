import React from 'react';
import AgentProfile from '@/components/dashboard/AgentProfile';
import EmployeeInfo from '@/components/dashboard/EmployeeInfo';
// import CallProgress from '@/components/dashboard/CallProgress';
// import SentimentSnapshot from '@/components/dashboard/SentimentSnapshot';
// import PreviousCalls from '@/components/dashboard/PreviousCalls';
import PendingTickets from '@/components/dashboard/PendingTickets';
import RiskPanel from '@/components/dashboard/RiskPanel';


interface ProgressStep {
  id: string;
  label: string;
  checked: boolean;
}

interface PreviousCall {
  id: number;
  team: string;
  duration: string;
}

interface PendingTicket {
  category: string;
  number: string;
  opened_at: string;
  priority: string;
  short_description: string;
  state: string;
  urgency: string;
}

interface LeftColumnProps {
  agentProfile: {
    name: string;
    role: string;
    location: string;
    email: string;
    employeeId: string;
  };
  progressSteps: ProgressStep[];
  sentimentScore: number;
  previousCalls: PreviousCall[];
  pendingTickets: PendingTicket[]; // Now matches Ticket[]
  notes: string;
  onToggleStep: (id: string, checked: boolean) => void;
  onSaveNotes: (newNotes: string) => void;
  ticketsLoading?: boolean;
  ticketsError?: string | null;
  onSelectTicket?: (ticket: PendingTicket) => void;
  selectedTicketId?: string;
  onSelectKbArticles?: (ticket: PendingTicket) => void;
  employeeLoading?: boolean;
  employeeError?: string | null;
  onEmployeeSelect?: (employee: { email: string; employee_number: string; name: string }) => void;
}

const LeftColumn: React.FC<LeftColumnProps & {
  riskLevel: string;
  riskLabel?: string;
  customerTone: string;
  issueComplexity: string;
  issueComplexityLoading?: boolean;
  resolutionTime: string;
  progressValue: number;
}> = ({
  agentProfile,
  progressSteps,
  sentimentScore,
  previousCalls,
  pendingTickets,
  notes,
  onToggleStep,
  onSaveNotes,
  ticketsLoading,
  ticketsError,
  onSelectTicket,
  selectedTicketId,
  onSelectKbArticles,
  employeeLoading,
  employeeError,
  onEmployeeSelect,
  riskLevel,
  riskLabel = "Risk Level",
  customerTone,
  issueComplexity,
  issueComplexityLoading,
  resolutionTime,
  progressValue
}) => {
    const loading = typeof ticketsLoading === 'boolean' ? ticketsLoading : false;
    const error = typeof ticketsError === 'string' ? ticketsError : null;

    return (
      <div className="col-span-12 md:col-span-2 h-full flex flex-col space-y-4 overflow-hidden">
        <EmployeeInfo
          name={agentProfile.name}
          email={agentProfile.email}
          employeeId={agentProfile.employeeId}
          loading={employeeLoading || false}
          error={employeeError}
          onEmployeeSelect={onEmployeeSelect}
          showSearch={true}
        />
        <PendingTickets
          tickets={pendingTickets}
          loading={loading}
          error={error}
          onSelectTicket={onSelectTicket}
          selectedTicketId={selectedTicketId}
          onSelectKbArticles={onSelectKbArticles}
        />
        <div className="mt-2">
          <RiskPanel
            riskLevel={riskLevel}
            riskLabel={riskLabel}
            customerTone={customerTone}
            issueComplexity={issueComplexity}
            issueComplexityLoading={issueComplexityLoading}
            resolutionTime={resolutionTime}
            progressValue={progressValue}
          />
        </div>
      </div>
    );
  };


export default LeftColumn;