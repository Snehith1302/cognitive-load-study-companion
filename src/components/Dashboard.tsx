import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, BarChart3, Play, FileText } from 'lucide-react';
import ActiveSession from './ActiveSession';
import Analytics from './Analytics';
import WeeklyReport from './WeeklyReport';

type Tab = 'session' | 'analytics' | 'report';

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('session');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSessionEnd = () => {
    setRefreshKey((prev) => prev + 1);
    setActiveTab('analytics');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Play className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Study Companion</h1>
                <p className="text-xs text-gray-600">Cognitive Load Aware</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('session')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === 'session'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <Play className="w-4 h-4" />
              Study Session
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === 'analytics'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('report')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition flex items-center justify-center gap-2 ${
                activeTab === 'report'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <FileText className="w-4 h-4" />
              Weekly Report
            </button>
          </div>
        </div>

        <div className="transition-all">
          {activeTab === 'session' && <ActiveSession onSessionEnd={handleSessionEnd} />}
          {activeTab === 'analytics' && <Analytics key={refreshKey} />}
          {activeTab === 'report' && <WeeklyReport />}
        </div>
      </div>
    </div>
  );
}
