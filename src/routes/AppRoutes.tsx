import { Routes, Route, Navigate } from 'react-router-dom';
import { useIsAuthenticated } from '@azure/msal-react';
import HomePage from '../pages/home';
import Index from '../pages/Index';
import TeamPage from '../pages/TeamPage';

export const AppRoutes = () => {
    const isAuthenticated = useIsAuthenticated();

    if (isAuthenticated === undefined) return null;

    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
                path="/index"
                element={isAuthenticated ? <Index /> : <Navigate to="/" replace />}
            />
            <Route path="/team" element={<TeamPage />} />  {/* Add this line */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};
