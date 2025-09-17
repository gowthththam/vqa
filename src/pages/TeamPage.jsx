import React from "react";
import CommonHeader from '../components/common/CommonHeader';
import FloatingFooter from '../components/common/FloatingFooter';

const people = [
  {
    name: "TUMMURI HARI",
    role: "Sr. Project Engineer",
    description: "Drives innovative engineering solutions and bridges client needs with business strategy.",
    photo: "https://ui-avatars.com/api/?name=TUMMURI+HARI&background=1e40af&color=ffffff&size=200"
  },
  {
    name: "Ravula Gowtham Reddy",
    role: "Project Engineer", 
    description: "Expert in process optimization and fullstack development, helping deliver flawless project execution.",
    photo: "https://ui-avatars.com/api/?name=Ravula+Gowtham+Reddy&background=1e40af&color=ffffff&size=200"
  },
  {
    name: "BEKKAM SATISH",
    role: "Project Engineer",
    description: "Focused on project management and engineering deliverables with great efficiency.",
    photo: "https://ui-avatars.com/api/?name=BEKKAM+SATISH&background=1e40af&color=ffffff&size=200"
  },
  {
    name: "Jagadeeswar V",
    role: "Developer",
    description: "Contributed to highly responsive React front-end, backend API integration, and advanced voice analysis features.",
    photo: "https://ui-avatars.com/api/?name=Jagadeeswar+V&background=059669&color=ffffff&size=200"
  },
  {
    name: "SWETHA VENKATARAMAN",
    role: "Developer",
    description: "Specializes in UI/UX design and frontend development using React and Tailwind CSS, ensuring optimal user engagement.",
    photo: "https://ui-avatars.com/api/?name=SWETHA+VENKATARAMAN&background=059669&color=ffffff&size=200"
  },
  {
    name: "Pentyala Sai Vijay Kumar",
    role: "Developer",
    description: "Works on backend services and data processing in Python and Flask, supporting robust data flows.",
    photo: "https://ui-avatars.com/api/?name=Pentyala+Sai+Vijay+Kumar&background=059669&color=ffffff&size=200"
  }
];

const getRoleBadgeClasses = (role) => {
  const normalizedRole = role.trim().toLowerCase();
  switch (normalizedRole) {
    case 'sr. project engineer':
      return 'bg-purple-100 text-purple-700 border border-purple-300 font-bold shadow-md';
    case 'project engineer':
      return 'bg-blue-100 text-blue-700 border border-blue-300 font-bold shadow-md';
    case 'developer':
      return 'bg-gradient-to-r from-emerald-600 to-green-700 text-white font-bold border border-emerald-700 shadow-md';
    default:
      return 'bg-gray-100 text-gray-700 border border-gray-200';
  }
};

const TeamPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <CommonHeader />
<div style={{ height: '80px' }}></div>
      {/* Header Section - ONLY padding-top, no spacer div */}
      <div className="pt-32 md:pt-40 pb-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-slate-800 mb-4 tracking-tight">
            Our <span className="text-blue-600">Expert Team</span>
          </h1>
          <div className="w-24 h-1 bg-blue-600 mx-auto mb-6"></div>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            Meet the talented professionals driving innovation and excellence in our GenAI initiatives
          </p>
        </div>
      </div>

      {/* Team Grid */}
      <div className="px-6 pb-24">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {people.map((person, idx) => (
              <div 
                key={idx} 
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300 border border-slate-100"
              >
                {/* Avatar */}
                <div className="flex justify-center mb-6">
                  <div className="relative">
                    <img
                      src={person.photo}
                      alt={person.name}
                      className="w-24 h-24 rounded-full border-4 border-white shadow-lg group-hover:scale-110 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-500/20 to-transparent group-hover:opacity-0 transition-opacity duration-300"></div>
                  </div>
                </div>

                {/* Content */}
                <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition-colors duration-300">
                    {person.name}
                  </h3>
                  
                  <div className="inline-flex items-center justify-center mb-4">
                    <span className={`px-4 py-2 rounded-full text-sm ${getRoleBadgeClasses(person.role)}`}>
                      {person.role}
                    </span>
                  </div>

                  <p className="text-slate-600 leading-relaxed text-sm">
                    {person.description}
                  </p>
                </div>

                {/* Hover effect bottom border */}
                <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full mt-6 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer accent */}
      <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600"></div>

      <FloatingFooter />
    </div>
  );
};

export default TeamPage;
