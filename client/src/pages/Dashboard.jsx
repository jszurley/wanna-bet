import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUpcomingBets, getPendingBets, getUncompletedBets, getCompletedBets, getRejectedBets } from '../services/api';
import BetCard from '../components/BetCard';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bets, setBets] = useState([]);
  const [counts, setCounts] = useState({ upcoming: 0, pending: 0, uncompleted: 0, completed: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCounts();
  }, []);

  useEffect(() => {
    loadBets();
  }, [activeTab]);

  const loadCounts = async () => {
    try {
      const [upcoming, pending, uncompleted, completed, rejected] = await Promise.all([
        getUpcomingBets(),
        getPendingBets(),
        getUncompletedBets(),
        getCompletedBets(),
        getRejectedBets()
      ]);
      setCounts({
        upcoming: upcoming.data.length,
        pending: pending.data.length,
        uncompleted: uncompleted.data.length,
        completed: completed.data.length,
        rejected: rejected.data.length
      });
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  };

  const loadBets = async () => {
    setLoading(true);
    try {
      let response;
      switch (activeTab) {
        case 'pending':
          response = await getPendingBets();
          break;
        case 'uncompleted':
          response = await getUncompletedBets();
          break;
        case 'completed':
          response = await getCompletedBets();
          break;
        case 'rejected':
          response = await getRejectedBets();
          break;
        default:
          response = await getUpcomingBets();
      }
      setBets(response.data);
      setCounts(prev => ({ ...prev, [activeTab]: response.data.length }));
    } catch (error) {
      console.error('Failed to load bets:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'upcoming', label: 'Upcoming' },
    { id: 'pending', label: 'Pending' },
    { id: 'uncompleted', label: 'Past Due' },
    { id: 'completed', label: 'Completed' },
    { id: 'rejected', label: 'Rejected' }
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="page-header">
          <h1>My Bets</h1>
          <p>Track your friendly wagers</p>
        </div>
        <Link to="/bets/new" className="btn btn-primary">
          + New Bet
        </Link>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label} ({counts[tab.id]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">Loading...</div>
      ) : bets.length === 0 ? (
        <div className="empty-state">
          <p>
            {activeTab === 'upcoming' && "No upcoming bets. Create one with a connection!"}
            {activeTab === 'pending' && "No pending bets waiting for agreement."}
            {activeTab === 'uncompleted' && "No past due bets. Great job!"}
            {activeTab === 'completed' && "No completed bets yet."}
            {activeTab === 'rejected' && "No rejected bets."}
          </p>
          {activeTab === 'upcoming' && (
            <Link to="/bets/new" className="btn btn-primary" style={{ marginTop: '1rem' }}>
              Create a Bet
            </Link>
          )}
        </div>
      ) : (
        <div className="bets-grid">
          {bets.map((bet) => (
            <BetCard
              key={bet.id}
              bet={bet}
              onClick={() => navigate(`/bets/${bet.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
