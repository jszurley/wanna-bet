import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUpcomingBets, getPendingBets, getUncompletedBets, getCompletedBets } from '../services/api';
import BetCard from '../components/BetCard';
import './Dashboard.css';

export default function Dashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bets, setBets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBets();
  }, [activeTab]);

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
        default:
          response = await getUpcomingBets();
      }
      setBets(response.data);
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
    { id: 'completed', label: 'Completed' }
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
            {tab.label}
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
