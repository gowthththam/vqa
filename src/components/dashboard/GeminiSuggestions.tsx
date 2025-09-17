import React from "react";

const IntelligentInsights = ({ suggestions = [], loading = false }) => (
  <div className="w-full bg-white border border-gray-200 rounded-lg shadow p-4 flex flex-col items-center mb-4">
    <div className="w-full text-blue-700 font-semibold text-lg mb-2 text-center">Intelligent Insights</div>
    {loading ? (
      <div className="text-xs text-blue-400">Loading suggestions...</div>
    ) : (
      <ul className="mt-1 space-y-2 w-full">
        {suggestions.map((s, i) => (
          <li key={i} className="bg-blue-50 rounded px-2 py-2 cursor-pointer hover:bg-blue-100 text-sm text-blue-900 w-full text-center transition" title="Click to copy" onClick={() => navigator.clipboard.writeText(s)}>{s}</li>
        ))}
      </ul>
    )}
  </div>
);

export default IntelligentInsights;
