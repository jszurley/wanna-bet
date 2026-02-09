import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getConnections, createBet } from '../services/api';
import { useAuth } from '../context/AuthContext';
import './CreateBet.css';

export default function CreateBet() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    opponentId: '',
    title: '',
    description: '',
    prizeDescription: '',
    creatorSide: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  useEffect(() => {
    loadConnections();
  }, []);

  const loadConnections = async () => {
    try {
      const response = await getConnections();
      setConnections(response.data);
    } catch (err) {
      setError('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const getOpponentFromConnection = (conn) => {
    if (conn.requester_id === user?.id) {
      return { id: conn.recipient_id, name: conn.recipient_name };
    }
    return { id: conn.requester_id, name: conn.requester_name };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await createBet({
        opponentId: parseInt(formData.opponentId),
        title: formData.title,
        description: formData.description,
        prizeDescription: formData.prizeDescription,
        creatorSide: formData.creatorSide,
        startDate: formData.startDate,
        endDate: formData.endDate
      });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create bet');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (connections.length === 0) {
    return (
      <div className="create-bet-page">
        <div className="page-header">
          <h1>Create a Bet</h1>
        </div>
        <div className="empty-state card">
          <p>You need to connect with someone before creating a bet.</p>
          <Link to="/connections" className="btn btn-primary" style={{ marginTop: '1rem' }}>
            Find Connections
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="create-bet-page">
      <Link to="/" className="back-link">&larr; Back to Bets</Link>

      <div className="page-header">
        <h1>Create a Bet</h1>
        <p>Challenge a connection to a friendly wager</p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="opponentId">Who are you betting with?</label>
            <select
              id="opponentId"
              name="opponentId"
              value={formData.opponentId}
              onChange={handleChange}
              required
            >
              <option value="">Select a connection</option>
              {connections.map((conn) => {
                const opponent = getOpponentFromConnection(conn);
                return (
                  <option key={conn.id} value={opponent.id}>
                    {opponent.name}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="title">Bet Title</label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., Super Bowl Winner"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              rows={3}
              placeholder="Describe the bet conditions..."
            />
          </div>

          <div className="form-group">
            <label htmlFor="prizeDescription">Prize / Stakes</label>
            <textarea
              id="prizeDescription"
              name="prizeDescription"
              value={formData.prizeDescription}
              onChange={handleChange}
              required
              rows={2}
              placeholder="What does the loser owe the winner?"
            />
          </div>

          <div className="form-group">
            <label htmlFor="creatorSide">Your Side / Prediction</label>
            <input
              type="text"
              id="creatorSide"
              name="creatorSide"
              value={formData.creatorSide}
              onChange={handleChange}
              required
              placeholder="e.g., Chiefs will win, Over 45 points, etc."
            />
            <small className="form-hint">What outcome are you betting on?</small>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Start Date</label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                value={formData.startDate}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="endDate">End Date</label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                value={formData.endDate}
                onChange={handleChange}
                required
                min={formData.startDate}
              />
            </div>
          </div>

          <div className="form-actions">
            <Link to="/" className="btn btn-outline">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Creating...' : 'Create Bet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
