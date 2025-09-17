import React from 'react';
import { Phone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CommonHeader: React.FC = () => {
    const navigate = useNavigate();

    const handleGenAIClick = () => {
        navigate('/team'); // Route to the team page
    };
    const handleLogoClick = () => {
        navigate('/'); // Route to home page
    }

    return (
       <header className="fixed top-0 left-0 w-full bg-white border-b border-gray-200 z-50">
            <div className="mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
                {/* Left side - Wipro Logo */}
                <div className="flex flex-col items-start justify-center">
                    <img
                        src="/logo.png"
                        alt="Wipro Logo"
                        className="h-16 w-auto object-contain mb-0.5"
                        onClick={handleLogoClick}
                    />
                </div>
                {/* Right side - Call Insight and GenAI text below */}
                <div className="flex flex-col items-end justify-center">
                    <div className="flex items-center space-x-2">
                        <div className="bg-blue-700 p-1.5 rounded-lg shadow-sm">
                            <Phone className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-xl font-semibold text-gray-900">
                            Call Insight
                        </span>
                    </div>
                    <span
                        className="text-[10px] text-gray-500 font-light mt-1 cursor-pointer hover:underline"
                        onClick={handleGenAIClick}
                        role="button"
                        tabIndex={0}
                        aria-label="View GenAI Foundry Team"
                    >
                        Developed by GenAI Foundry
                    </span>
                </div>
            </div>
        </header>
    );
};

export default CommonHeader;
