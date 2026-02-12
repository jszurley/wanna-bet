import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getWalletEntries, setPaymentMethod, markWalletPaid } from '../services/api';
import './Wallet.css';

const STATUS_LABELS = {
  awaiting_method: 'Awaiting Method',
  on_tab: 'On Tab',
  payment_pending: 'Payment Pending',
  paid: 'Paid'
};

export default function Wallet() {
  const { user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [showSettled, setShowSettled] = useState(false);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const response = await getWalletEntries();
      setEntries(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load wallet entries');
    } finally {
      setLoading(false);
    }
  };

  const handleSetMethod = async (entryId, method) => {
    setActionLoading(entryId);
    try {
      await setPaymentMethod(entryId, method);
      await loadEntries();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set payment method');
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async (entryId) => {
    setActionLoading(entryId);
    try {
      await markWalletPaid(entryId);
      await loadEntries();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark as paid');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  const youOwe = entries.filter(e => e.debtor_id === user?.id && e.status !== 'paid');
  const youreOwed = entries.filter(e => e.creditor_id === user?.id && e.status !== 'paid');
  const settled = entries.filter(e => e.status === 'paid');

  const renderEntry = (entry, role) => (
    <div key={entry.id} className="wallet-entry">
      <div className="wallet-entry-top">
        <div className="wallet-entry-info">
          <Link to={`/bets/${entry.bet_id}`} className="wallet-entry-bet">
            {entry.bet_title}
          </Link>
          <div className="wallet-entry-prize">{entry.prize_description}</div>
          <div className="wallet-entry-person">
            {role === 'debtor' ? `To: ${entry.creditor_name}` : `From: ${entry.debtor_name}`}
          </div>
        </div>
        <span className={`wallet-status ${entry.status}`}>
          {STATUS_LABELS[entry.status]}
        </span>
      </div>

      {/* Debtor actions: choose method */}
      {role === 'debtor' && entry.status === 'awaiting_method' && (
        <div className="wallet-entry-actions">
          <button
            className="btn btn-tab"
            onClick={() => handleSetMethod(entry.id, 'on_tab')}
            disabled={actionLoading === entry.id}
          >
            Put on Tab
          </button>
          <button
            className="btn btn-sending"
            onClick={() => handleSetMethod(entry.id, 'payment_pending')}
            disabled={actionLoading === entry.id}
          >
            Sending Payment
          </button>
        </div>
      )}

      {/* Creditor actions: mark paid */}
      {role === 'creditor' && (entry.status === 'on_tab' || entry.status === 'payment_pending') && (
        <div className="wallet-entry-actions">
          <button
            className="btn btn-mark-paid"
            onClick={() => handleMarkPaid(entry.id)}
            disabled={actionLoading === entry.id}
          >
            Mark as Paid
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="wallet-page">
      <h1>Wallet</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="wallet-section">
        <div className="wallet-section-header">
          <h2>You Owe</h2>
          {youOwe.length > 0 && <span className="wallet-count">{youOwe.length}</span>}
        </div>
        {youOwe.length === 0 ? (
          <p className="wallet-empty">Nothing owed. You're all clear!</p>
        ) : (
          <div className="wallet-entries">
            {youOwe.map(e => renderEntry(e, 'debtor'))}
          </div>
        )}
      </div>

      <div className="wallet-section">
        <div className="wallet-section-header">
          <h2>You're Owed</h2>
          {youreOwed.length > 0 && <span className="wallet-count">{youreOwed.length}</span>}
        </div>
        {youreOwed.length === 0 ? (
          <p className="wallet-empty">No one owes you anything right now.</p>
        ) : (
          <div className="wallet-entries">
            {youreOwed.map(e => renderEntry(e, 'creditor'))}
          </div>
        )}
      </div>

      <div className="wallet-section">
        <div className="wallet-section-header">
          <div className="settled-toggle" onClick={() => setShowSettled(!showSettled)}>
            <h2>Settled</h2>
            <span className={`settled-chevron ${showSettled ? 'expanded' : ''}`}>&#9654;</span>
          </div>
          {settled.length > 0 && <span className="wallet-count">{settled.length}</span>}
        </div>
        {showSettled && (
          settled.length === 0 ? (
            <p className="wallet-empty">No settled entries yet.</p>
          ) : (
            <div className="wallet-entries">
              {settled.map(e => renderEntry(e, e.debtor_id === user?.id ? 'debtor' : 'creditor'))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
