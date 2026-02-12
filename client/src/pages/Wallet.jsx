import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getChips, getHeldChips, getDebtChips, offerChip, acceptChip, declineChip } from '../services/api';
import './Wallet.css';

const STATUS_LABELS = {
  active: 'Active',
  offered: 'Offered',
  voided: 'Voided',
  staked: 'Staked'
};

export default function Wallet() {
  const { user } = useAuth();
  const [chips, setChips] = useState([]);
  const [heldChips, setHeldChips] = useState([]);
  const [debtChips, setDebtChips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [selectedDebtChipId, setSelectedDebtChipId] = useState(null);
  const [selectedOfferChipId, setSelectedOfferChipId] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [chipsRes, heldRes, debtsRes] = await Promise.all([
        getChips(),
        getHeldChips(),
        getDebtChips()
      ]);
      setChips(chipsRes.data);
      setHeldChips(heldRes.data);
      setDebtChips(debtsRes.data);
    } catch (err) {
      console.error('Chips load error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load chips');
    } finally {
      setLoading(false);
    }
  };

  const handleOffer = async () => {
    if (!selectedOfferChipId || !selectedDebtChipId) return;
    setActionLoading(selectedOfferChipId);
    try {
      await offerChip(selectedOfferChipId, selectedDebtChipId);
      setShowOfferModal(false);
      setSelectedDebtChipId(null);
      setSelectedOfferChipId('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to offer chip');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAccept = async (chipId) => {
    setActionLoading(chipId);
    try {
      await acceptChip(chipId);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept chip');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDecline = async (chipId) => {
    setActionLoading(chipId);
    try {
      await declineChip(chipId);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline chip');
    } finally {
      setActionLoading(null);
    }
  };

  const openOfferModal = (debtChipId) => {
    setSelectedDebtChipId(debtChipId);
    setSelectedOfferChipId('');
    setShowOfferModal(true);
  };

  if (loading) return <div className="loading">Loading...</div>;

  const myHeld = chips.filter(c => c.holder_id === user?.id && c.status === 'active');
  const myStaked = chips.filter(c => c.holder_id === user?.id && c.status === 'staked');
  const myDebts = debtChips;
  const pendingOffers = chips.filter(c => {
    if (c.status !== 'offered' || !c.offered_to_chip_id) return false;
    // Find if we're the creditor (holder of the debt chip being paid)
    const debtChip = chips.find(dc => dc.id === c.offered_to_chip_id);
    return debtChip && debtChip.holder_id === user?.id;
  });
  const voided = chips.filter(c => c.status === 'voided');

  return (
    <div className="wallet-page">
      <h1>My Chips</h1>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="chip-section">
        <div className="chip-section-header">
          <h2>Chips You Hold</h2>
          {(myHeld.length + myStaked.length) > 0 && <span className="chip-count">{myHeld.length + myStaked.length}</span>}
        </div>
        {myHeld.length === 0 && myStaked.length === 0 ? (
          <p className="chip-empty">No chips held.</p>
        ) : (
          <div className="chip-entries">
            {myHeld.map(chip => (
              <div key={chip.id} className="chip-entry">
                <div className="chip-entry-top">
                  <div className="chip-entry-info">
                    <Link to={`/bets/${chip.original_bet_id}`} className="chip-entry-bet">
                      {chip.bet_title}
                    </Link>
                    <div className="chip-entry-prize">{chip.prize_description}</div>
                    <div className="chip-entry-person">Owed by: {chip.debtor_name}</div>
                  </div>
                  <span className={`chip-status ${chip.status}`}>{STATUS_LABELS[chip.status]}</span>
                </div>
              </div>
            ))}
            {myStaked.map(chip => (
              <div key={chip.id} className="chip-entry">
                <div className="chip-entry-top">
                  <div className="chip-entry-info">
                    <Link to={`/bets/${chip.original_bet_id}`} className="chip-entry-bet">
                      {chip.bet_title}
                    </Link>
                    <div className="chip-entry-prize">{chip.prize_description}</div>
                    <div className="chip-entry-person">Owed by: {chip.debtor_name}</div>
                  </div>
                  <span className={`chip-status ${chip.status}`}>{STATUS_LABELS[chip.status]}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="chip-section">
        <div className="chip-section-header">
          <h2>Debts You Owe</h2>
          {myDebts.length > 0 && <span className="chip-count">{myDebts.length}</span>}
        </div>
        {myDebts.length === 0 ? (
          <p className="chip-empty">No debts owed. You're all clear!</p>
        ) : (
          <div className="chip-entries">
            {myDebts.map(chip => (
              <div key={chip.id} className="chip-entry">
                <div className="chip-entry-top">
                  <div className="chip-entry-info">
                    <Link to={`/bets/${chip.original_bet_id}`} className="chip-entry-bet">
                      {chip.bet_title}
                    </Link>
                    <div className="chip-entry-prize">{chip.prize_description}</div>
                    <div className="chip-entry-person">Owed to: {chip.holder_name}</div>
                  </div>
                  <span className={`chip-status ${chip.status}`}>{STATUS_LABELS[chip.status]}</span>
                </div>
                {chip.status === 'active' && heldChips.length > 0 && (
                  <div className="chip-entry-actions">
                    <button
                      className="btn btn-offer"
                      onClick={() => openOfferModal(chip.id)}
                      disabled={actionLoading === chip.id}
                    >
                      Pay with Chip
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {pendingOffers.length > 0 && (
        <div className="chip-section">
          <div className="chip-section-header">
            <h2>Pending Offers</h2>
            <span className="chip-count">{pendingOffers.length}</span>
          </div>
          <div className="chip-entries">
            {pendingOffers.map(chip => (
              <div key={chip.id} className="chip-entry chip-entry-offer">
                <div className="chip-entry-top">
                  <div className="chip-entry-info">
                    <div className="chip-entry-prize">{chip.prize_description}</div>
                    <div className="chip-entry-person">
                      Offered by: {chip.holder_name} (owed by {chip.debtor_name})
                    </div>
                    <Link to={`/bets/${chip.original_bet_id}`} className="chip-entry-bet">
                      From: {chip.bet_title}
                    </Link>
                  </div>
                  <span className={`chip-status ${chip.status}`}>{STATUS_LABELS[chip.status]}</span>
                </div>
                <div className="chip-entry-actions">
                  <button
                    className="btn btn-accept"
                    onClick={() => handleAccept(chip.id)}
                    disabled={actionLoading === chip.id}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-decline-chip"
                    onClick={() => handleDecline(chip.id)}
                    disabled={actionLoading === chip.id}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="chip-section">
        <div className="chip-section-header">
          <div className="history-toggle" onClick={() => setShowHistory(!showHistory)}>
            <h2>History</h2>
            <span className={`history-chevron ${showHistory ? 'expanded' : ''}`}>&#9654;</span>
          </div>
          {voided.length > 0 && <span className="chip-count">{voided.length}</span>}
        </div>
        {showHistory && (
          voided.length === 0 ? (
            <p className="chip-empty">No settled chips yet.</p>
          ) : (
            <div className="chip-entries">
              {voided.map(chip => (
                <div key={chip.id} className="chip-entry chip-entry-voided">
                  <div className="chip-entry-top">
                    <div className="chip-entry-info">
                      <Link to={`/bets/${chip.original_bet_id}`} className="chip-entry-bet">
                        {chip.bet_title}
                      </Link>
                      <div className="chip-entry-prize">{chip.prize_description}</div>
                      <div className="chip-entry-person">
                        {chip.holder_id === user?.id ? `Owed by: ${chip.debtor_name}` : `Owed to: ${chip.holder_name}`}
                      </div>
                    </div>
                    <span className={`chip-status ${chip.status}`}>{STATUS_LABELS[chip.status]}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showOfferModal && (
        <div className="modal-overlay" onClick={() => setShowOfferModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Pay with Chip</h2>
            <p>Select a chip you hold to offer as payment for this debt.</p>

            <div className="form-group">
              <label>Choose a Chip</label>
              <div className="offer-chip-list">
                {heldChips.map(chip => (
                  <label key={chip.id} className="radio-option">
                    <input
                      type="radio"
                      name="offerChip"
                      value={chip.id}
                      checked={selectedOfferChipId === String(chip.id)}
                      onChange={(e) => setSelectedOfferChipId(e.target.value)}
                    />
                    <span>
                      <strong>{chip.prize_description}</strong>
                      <small> (owed by {chip.debtor_name}, from {chip.bet_title})</small>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowOfferModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleOffer}
                disabled={actionLoading || !selectedOfferChipId}
              >
                {actionLoading ? 'Offering...' : 'Offer Chip'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
