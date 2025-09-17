import React, { useState } from "react";
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react';

interface Employee {
  email: string;
  employee_number: string;
  name: string;
}

interface EmployeeInfoProps {
  name: string;
  email: string;
  employeeId: string;
  loading?: boolean;
  error?: string;
  onEmployeeSelect?: (employee: Employee) => void;
  showSearch?: boolean;
}

const EmployeeSearch: React.FC<{ onEmployeeSelect: (employee: Employee) => void }> = ({ onEmployeeSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Employee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setIsSearching(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/search?q=${encodeURIComponent(query)}`, {
        headers: {
          'Accept': 'application/json'
        }
      });
      if (response.ok) {
        const employees = await response.json();
        setSearchResults(Array.isArray(employees) ? employees : []);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(true);
      }
    } catch {
      setSearchResults([]);
      setShowResults(true);
    } finally {
      setIsSearching(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    if (debounceTimer) clearTimeout(debounceTimer);
    setDebounceTimer(setTimeout(() => {
      handleSearch(value);
    }, 300));
  };

  const handleEmployeeClick = (employee: Employee) => {
    setSearchQuery(''); // Clear search instead of setting employee name
    setShowResults(false);
    onEmployeeSelect(employee);
  };

  return (
    <div className="relative mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          placeholder="Search employee..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('');
              setShowResults(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {isSearching && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 p-2 text-sm text-gray-500 z-10 shadow-md">
          Searching...
        </div>
      )}

      {showResults && searchResults.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 max-h-48 overflow-y-auto z-10 shadow-md">
          {searchResults.map((employee, index) => (
            <div
              key={`${employee.email}-${employee.employee_number}-${index}`}
              onClick={() => handleEmployeeClick(employee)}
              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="font-medium text-sm text-gray-900">{employee.name}</div>
              <div className="text-xs text-gray-600">{employee.email}</div>
              <div className="text-xs text-gray-500">ID: {employee.employee_number}</div>
            </div>
          ))}
        </div>
      )}

      {showResults && searchResults.length === 0 && !isSearching && searchQuery.trim() && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-300 rounded-md mt-1 p-3 text-sm text-gray-500 z-10 shadow-md">
          No employees found for "{searchQuery}"
        </div>
      )}
    </div>
  );
};

const EmployeeInfo: React.FC<EmployeeInfoProps> = ({
  name,
  email,
  employeeId,
  loading = false,
  error = null,
  onEmployeeSelect,
  showSearch = true
}) => {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Handler for employee selection
  const handleEmployeeSelect = (employee: Employee) => {
    setSelectedEmployee(employee);
    if (onEmployeeSelect) onEmployeeSelect(employee);
  };

  const clearSelection = () => {
    setSelectedEmployee(null);
    // You might want to call onEmployeeSelect with null or an empty employee object
    if (onEmployeeSelect) {
      onEmployeeSelect({ email: '', employee_number: '', name: '' });
    }
  };

  // Show loading animation if loading
  if (loading) {
    return (
      <div className="bg-white rounded-md border border-gray-200 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-700 tracking-wide">Employee Info</h3>
        </div>
        <div className="flex justify-center items-center py-4">
          <div className="animate-pulse text-gray-500">Loading employee details...</div>
        </div>
      </div>
    );
  }

  // Show error if error
  if (error) {
    return (
      <div className="bg-white rounded-md border border-gray-200 p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-700 tracking-wide">Employee Info</h3>
        </div>
        {showSearch && onEmployeeSelect && (
          <EmployeeSearch onEmployeeSelect={handleEmployeeSelect} />
        )}
        <div className="text-red-500 text-sm py-2">
          Error: {error}
        </div>
      </div>
    );
  }

  // Check if we have employee data (either from props or selected employee)
  const currentEmployee = selectedEmployee || (name && email && employeeId ? { name, email, employee_number: employeeId } : null);
  const noEmployeeSelected = !currentEmployee;

  return (
    <div className="bg-white rounded-md border border-gray-200 p-4 shadow-sm transition-all duration-300">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-base font-semibold text-gray-700 tracking-wide">Employee Info</h3>
        {currentEmployee && (
          <button
            onClick={clearSelection}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Always show search if enabled */}
      {showSearch && onEmployeeSelect && (
        <EmployeeSearch onEmployeeSelect={handleEmployeeSelect} />
      )}

      {noEmployeeSelected ? (
        <div className="text-gray-400 text-sm py-4 text-center">
          {showSearch ? "Search and select an employee above" : "No employee selected"}
        </div>
      ) : (
        <div className="space-y-2 bg-gray-50 rounded-md p-3 border border-gray-100">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Selected Employee</span>
          </div>
          <div>
            <span className="text-gray-900 text-sm font-medium">{currentEmployee.name}</span>
          </div>
          <div>
            <span className="text-gray-700 text-sm">{currentEmployee.email}</span>
          </div>
          {/* Only show ID if it exists and is not empty/whitespace */}
          {currentEmployee.employee_number &&
            typeof currentEmployee.employee_number === 'string' &&
            currentEmployee.employee_number.trim().length > 0 && (
              <div>
                <span className="text-gray-600 text-sm">ID: {currentEmployee.employee_number}</span>
              </div>
            )}
        </div>
      )}
    </div>
  );
};

export default EmployeeInfo;
