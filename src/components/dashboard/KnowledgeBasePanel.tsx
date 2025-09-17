import React, { useState } from 'react';
import { Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface Article {
  id: number;
  title: string;
  content: string;
  category: string;
}

interface KnowledgeBasePanelProps {
  articles: Article[];
  onCopyLink: (id: number) => void;
}

const KnowledgeBasePanel: React.FC<KnowledgeBasePanelProps> = ({ articles, onCopyLink }) => {
  
  // Enhanced function to format content into React components
  const formatContentAsReact = (content: string) => {
    if (!content) return [];
    
    const elements = [];
    let elementKey = 0;
    
    // First, handle the introductory text before steps
    const stepSplitRegex = /(\d+\.\s)/;
    const parts = content.split(stepSplitRegex);
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (!part || !part.trim()) continue;
      
      // Check if this is a step number (1. 2. 3. etc.)
      if (stepSplitRegex.test(part)) {
        // This is a step number, next part should be the step content
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
          i++; // Skip the next part as we've used it
        }
      } else {
        // This is regular content
        const sentences = part.split(/\.\s+/).filter(s => s.trim());
        
        sentences.forEach((sentence) => {
          const trimmedSentence = sentence.trim();
          if (!trimmedSentence) return;
          
          // Special formatting for key phrases
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
            // Regular paragraphs
            elements.push(
              <p key={`para-${elementKey++}`} className="mb-2 text-gray-700 leading-relaxed text-sm">
                {trimmedSentence}.
              </p>
            );
          }
        });
      }
    }
    
    // Fallback if no elements were created
    if (elements.length === 0) {
      elements.push(
        <p key="fallback" className="text-gray-700 text-sm leading-relaxed">
          {content}
        </p>
      );
    }
    
    return elements;
  };

  return (
    <div 
      className="bg-white rounded-md border border-gray-200 flex flex-col"
      style={{ 
        height: '250px',
        minHeight: '200px'
      }}
    >
      {/* Header - Fixed */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="font-medium text-lg">Knowledge Base</h3>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {articles.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-gray-400 mb-2">📄</div>
            <p>No articles found</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full space-y-2">
            {articles.map((article) => (
              <AccordionItem key={article.id} value={`item-${article.id}`} className="border rounded-lg shadow-sm">
                <AccordionTrigger className="px-4 text-sm py-3 hover:no-underline hover:bg-gray-50 rounded-t-lg">
                  <div className="flex justify-between w-full items-center pr-2">
                    <span className="text-left font-medium text-gray-800">{article.title}</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-medium">
                      {article.category}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  {/* Show formatted React components */}
                  <div className="text-sm mb-3 space-y-2">
                    {formatContentAsReact(article.content)}
                  </div>
                  
                  <button 
                    className="flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium mt-4 pt-3 border-t border-gray-200 transition-colors duration-200"
                    onClick={() => onCopyLink(article.id)}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Link
                  </button>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  );
};

export default KnowledgeBasePanel;
