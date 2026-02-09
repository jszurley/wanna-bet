import { useState, useEffect } from 'react';
import {
  searchUsers,
  getConnections,
  getPendingConnections,
  getSentConnections,
  sendConnectionRequest,
  acceptConnection,
  rejectConnection,
  removeConnection
} from '../services/api';
import './Connections.css';

export default function Connections() {
  const [activeTab, setActiveTab] = useState('connections');
  const [connections, setConnections] = useState([]);
  const [pending, setPending] = useState([]);
  const [sent, setSent] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      handleSearch();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const loadData = async () => {
    try {
      const [connectionsRes, pendingRes, sentRes] = await Promise.all([
        getConnections(),
        getPendingConnections(),
        getSentConnections()
      ]);
      setConnections(connectionsRes.data);
      setPending(pendingRes.data);
      setSent(sentRes.data);
    } catch (err) {
      setError('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    try {
      const response = await searchUsers(searchQuery);
      // Filter out already connected users
      const connectedIds = connections.map(c =>
        c.requester_id === c.id ? c.recipient_id : c.requester_id
      );
      setSearchResults(response.data.filter(u => !connectedIds.includes(u.id)));
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleSendRequest = async (userId) => {
    setActionLoading(userId);
    setError('');
    try {
      await sendConnectionRequest(userId);
      await loadData();
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send request');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (id) => {
    setActionLoading(id);
    try {
      await acceptConnection(id);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await rejectConnection(id);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this connection?')) return;
    setActionLoading(id);
    try {
      await removeConnection(id);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to remove');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="connections-page">
      <div className="page-header">
        <h1>Connections</h1>
        <p>Connect with others to create bets</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="search-section card">
        <h3>Find People</h3>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((user) => (
              <div key={user.id} className="search-result-item">
                <div>
                  <strong>{user.name}</strong>
                  <span className="user-email">{user.email}</span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleSendRequest(user.id)}
                  disabled={actionLoading === user.id}
                >
                  {actionLoading === user.id ? '...' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'connections' ? 'active' : ''}`}
          onClick={() => setActiveTab('connections')}
        >
          Connections ({connections.length})
        </button>
        <button
          className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
          onClick={() => setActiveTab('pending')}
        >
          Requests ({pending.length})
        </button>
        <button
          className={`tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          Sent ({sent.length})
        </button>
      </div>

      {activeTab === 'connections' && (
        <div className="connections-list">
          {connections.length === 0 ? (
            <div className="empty-state">No connections yet. Search for people above!</div>
          ) : (
            connections.map((conn) => (
              <div key={conn.id} className="connection-item card">
                <div className="connection-info">
                  <strong>{conn.requester_name === conn.recipient_name ? conn.requester_name :
                    (conn.requester_id === conn.id ? conn.recipient_name : conn.requester_name)}</strong>
                  <span className="user-email">
                    {conn.requester_id === conn.id ? conn.recipient_email : conn.requester_email}
                  </span>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => handleRemove(conn.id)}
                  disabled={actionLoading === conn.id}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="connections-list">
          {pending.length === 0 ? (
            <div className="empty-state">No pending requests</div>
          ) : (
            pending.map((conn) => (
              <div key={conn.id} className="connection-item card">
                <div className="connection-info">
                  <strong>{conn.requester_name}</strong>
                  <span className="user-email">{conn.requester_email}</span>
                </div>
                <div className="connection-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleAccept(conn.id)}
                    disabled={actionLoading === conn.id}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleReject(conn.id)}
                    disabled={actionLoading === conn.id}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'sent' && (
        <div className="connections-list">
          {sent.length === 0 ? (
            <div className="empty-state">No pending sent requests</div>
          ) : (
            sent.map((conn) => (
              <div key={conn.id} className="connection-item card">
                <div className="connection-info">
                  <strong>{conn.recipient_name}</strong>
                  <span className="user-email">{conn.recipient_email}</span>
                </div>
                <span className="badge badge-warning">Pending</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
