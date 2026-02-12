import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  getBet, agreeToBet, declineBet, completeBet, resolveDispute,
  getTrashTalk, addTrashTalk, getBetDetails, joinGroupBet,
  declineGroupBetInvite, setWinningOption,
  getBetChips, getHeldChips, offerChip, acceptChip, declineChip
} from '../services/api';
import './BetDetail.css';

export default function BetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [bet, setBet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedWinner, setSelectedWinner] = useState('');
  const [resolveWinner, setResolveWinner] = useState('');
  const [resolveComment, setResolveComment] = useState('');
  const [opponentSide, setOpponentSide] = useState('');
  const [trashTalk, setTrashTalk] = useState([]);
  const [showTrashTalkModal, setShowTrashTalkModal] = useState(false);
  const [trashTalkMessage, setTrashTalkMessage] = useState('');
  const [betChips, setBetChips] = useState([]);
  const [heldChips, setHeldChips] = useState([]);
  const [showChipOfferModal, setShowChipOfferModal] = useState(false);
  const [selectedDebtChipId, setSelectedDebtChipId] = useState(null);
  const [selectedOfferChipId, setSelectedOfferChipId] = useState('');

  // Group bet state
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [showSetWinnerModal, setShowSetWinnerModal] = useState(false);
  const [winningOptionId, setWinningOptionId] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadBet();
    loadTrashTalk();
    loadBetChips();
  }, [id]);

  const loadBet = async () => {
    try {
      // First try to load as regular bet
      const response = await getBet(id);
      const betData = response.data;

      // If it's a group bet, load full details
      if (betData.bet_type === 'group') {
        const detailsResponse = await getBetDetails(id);
        setBet(detailsResponse.data);
      } else {
        setBet(betData);
      }
    } catch (err) {
      // If regular bet fails, try group bet details
      try {
        const detailsResponse = await getBetDetails(id);
        setBet(detailsResponse.data);
      } catch (err2) {
        setError('Failed to load bet');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadTrashTalk = async () => {
    try {
      const response = await getTrashTalk(id);
      setTrashTalk(response.data);
    } catch (err) {
      console.error('Failed to load trash talk:', err);
    }
  };

  const loadBetChips = async () => {
    try {
      const [chipsRes, heldRes] = await Promise.all([
        getBetChips(id),
        getHeldChips()
      ]);
      setBetChips(chipsRes.data);
      setHeldChips(heldRes.data);
    } catch (err) {
      console.error('Failed to load bet chips:', err);
    }
  };

  const handleChipOffer = async () => {
    if (!selectedOfferChipId || !selectedDebtChipId) return;
    setActionLoading(true);
    try {
      await offerChip(selectedOfferChipId, selectedDebtChipId);
      setShowChipOfferModal(false);
      setSelectedDebtChipId(null);
      setSelectedOfferChipId('');
      await loadBetChips();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to offer chip');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChipAccept = async (chipId) => {
    setActionLoading(true);
    try {
      await acceptChip(chipId);
      await loadBetChips();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to accept chip');
    } finally {
      setActionLoading(false);
    }
  };

  const handleChipDecline = async (chipId) => {
    setActionLoading(true);
    try {
      await declineChip(chipId);
      await loadBetChips();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline chip');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddTrashTalk = async () => {
    if (!trashTalkMessage.trim()) return;
    setActionLoading(true);
    try {
      await addTrashTalk(id, trashTalkMessage);
      setTrashTalkMessage('');
      setShowTrashTalkModal(false);
      await loadTrashTalk();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add trash talk');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAgree = async () => {
    if (!opponentSide.trim()) {
      setError('Please enter your side of the bet before agreeing');
      return;
    }
    setActionLoading(true);
    try {
      await agreeToBet(id, opponentSide);
      await loadBet();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to agree');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!window.confirm('Are you sure you want to decline this bet?')) return;
    setActionLoading(true);
    try {
      await declineBet(id);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline');
      setActionLoading(false);
    }
  };

  const handleComplete = async () => {
    setActionLoading(true);
    try {
      await completeBet(id, selectedWinner || null);
      setShowCompleteModal(false);
      await loadBet();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark complete');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    setActionLoading(true);
    try {
      await resolveDispute(id, resolveWinner || null, resolveComment);
      setShowResolveModal(false);
      setResolveWinner('');
      setResolveComment('');
      await loadBet();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit resolution');
    } finally {
      setActionLoading(false);
    }
  };

  // Group bet handlers
  const handleJoinGroupBet = async () => {
    if (!selectedOptionId) {
      setError('Please select an option to join');
      return;
    }
    setActionLoading(true);
    try {
      await joinGroupBet(id, selectedOptionId);
      await loadBet();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to join bet');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineGroupBet = async () => {
    if (!window.confirm('Are you sure you want to decline this invitation?')) return;
    setActionLoading(true);
    try {
      await declineGroupBetInvite(id);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to decline');
      setActionLoading(false);
    }
  };

  const handleSetWinner = async () => {
    if (!winningOptionId) {
      setError('Please select the winning option');
      return;
    }
    setActionLoading(true);
    try {
      await setWinningOption(id, winningOptionId);
      setShowSetWinnerModal(false);
      await loadBet();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to set winner');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!bet) {
    return (
      <div className="bet-detail-page">
        <div className="alert alert-error">Bet not found</div>
        <Link to="/" className="btn btn-outline">Back to Bets</Link>
      </div>
    );
  }

  // Check if this is a group bet
  const isGroupBet = bet.bet_type === 'group';

  // Group bet specific variables
  const myParticipant = isGroupBet ? bet.participants?.find(p => p.user_id === user?.id) : null;
  const isGroupCreator = isGroupBet && bet.creator_id === user?.id;
  const myGroupStatus = myParticipant?.status;
  const isInvited = myGroupStatus === 'invited';
  const hasJoined = myGroupStatus === 'joined';
  const joinedParticipants = isGroupBet ? bet.participants?.filter(p => p.status === 'joined') : [];
  const winners = isGroupBet && bet.winning_option_id
    ? bet.participants?.filter(p => p.status === 'joined' && p.selected_option_id === bet.winning_option_id)
    : [];

  // 1v1 bet variables
  const isCreator = bet.creator_id === user?.id;
  const isOpponent = bet.opponent_id === user?.id;
  const isPending = !isGroupBet && !bet.opponent_agreed;
  const isLocked = isGroupBet ? !!bet.locked_at : bet.opponent_agreed;
  const isCompleted = bet.completed_at;
  const myCompletionStatus = isCreator ? bet.creator_marked_complete : bet.opponent_marked_complete;
  const theirCompletionStatus = isCreator ? bet.opponent_marked_complete : bet.creator_marked_complete;

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const CHIP_STATUS_LABELS = {
    active: 'Active',
    offered: 'Offered',
    voided: 'Voided',
    staked: 'Staked'
  };

  const renderChipSection = () => {
    if (betChips.length === 0) return null;

    return (
      <div className="bet-section chip-section">
        <h3>Chips</h3>
        {betChips.map(chip => {
          const isHolder = chip.holder_id === user?.id;
          const isDebtor = chip.debtor_id === user?.id;
          // Check if this is an offered chip where we're the creditor
          const isPendingForMe = chip.status === 'offered' && chip.offered_to_chip_id &&
            betChips.find(dc => dc.id === chip.offered_to_chip_id && dc.holder_id === user?.id);

          return (
            <div key={chip.id} className="chip-entry-inline">
              <div className="chip-inline-info">
                <span className="chip-inline-person">
                  {isDebtor ? `You owe ${chip.holder_name}` : `${chip.debtor_name} owes ${isHolder ? 'you' : chip.holder_name}`}
                </span>
                <span className="chip-inline-prize">{chip.prize_description}</span>
                <span className={`chip-status ${chip.status}`}>
                  {CHIP_STATUS_LABELS[chip.status]}
                </span>
              </div>

              {/* Debtor can offer a chip to pay */}
              {isDebtor && chip.status === 'active' && heldChips.length > 0 && (
                <div className="chip-inline-actions">
                  <button
                    className="btn btn-offer"
                    onClick={() => {
                      setSelectedDebtChipId(chip.id);
                      setSelectedOfferChipId('');
                      setShowChipOfferModal(true);
                    }}
                    disabled={actionLoading}
                  >
                    Pay with Chip
                  </button>
                </div>
              )}

              {/* Creditor can accept/decline offered chip */}
              {isPendingForMe && (
                <div className="chip-inline-actions">
                  <button
                    className="btn btn-accept"
                    onClick={() => handleChipAccept(chip.id)}
                    disabled={actionLoading}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-decline-chip"
                    onClick={() => handleChipDecline(chip.id)}
                    disabled={actionLoading}
                  >
                    Decline
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Group Bet Rendering
  if (isGroupBet) {
    return (
      <div className="bet-detail-page">
        <Link to="/" className="back-link">&larr; Back to Bets</Link>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="card bet-detail-card">
          <div className="bet-detail-header">
            <div>
              <span className="badge badge-info">Group Bet</span>
              <h1>{bet.title}</h1>
            </div>
            {isCompleted && <span className="badge badge-success">Completed</span>}
            {!isLocked && !isCompleted && <span className="badge badge-warning">Awaiting Participants</span>}
            {isLocked && !isCompleted && <span className="badge badge-primary">Active</span>}
          </div>

          <div className="bet-section">
            <h3>Created by</h3>
            <p className="creator-name">{bet.creator_name}</p>
          </div>

          <div className="bet-info-grid">
            <div className="bet-section">
              <h3>Description</h3>
              <p>{bet.description}</p>
            </div>
            <div className="bet-section">
              <h3>Stakes / Prize</h3>
              <p className="prize-text">{bet.prize_description}</p>
            </div>
          </div>

          <div className="bet-section">
            <h3>Timeline</h3>
            <div className="dates">
              <span><span className="date-label">Start:</span> {formatDate(bet.start_date)}</span>
              <span className="date-separator">—</span>
              <span><span className="date-label">End:</span> {formatDate(bet.end_date)}</span>
            </div>
          </div>

          <div className="bet-section options-section">
            <h3>Prediction Options</h3>
            <div className="options-display">
              {bet.options?.map((option) => (
                <div
                  key={option.id}
                  className={`option-card ${bet.winning_option_id === option.id ? 'winner' : ''}`}
                >
                  <span className="option-text">{option.option_text}</span>
                  <span className="option-count">{option.participant_count} picked</span>
                  {bet.winning_option_id === option.id && (
                    <span className="winner-badge">Winner</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="bet-section participants-section">
            <h3>Participants ({joinedParticipants.length} joined)</h3>
            <div className="participants-display compact">
              {bet.participants?.map((p) => (
                <div key={p.id} className={`participant-card ${p.status}`}>
                  <span className="participant-name">
                    {p.user_name}
                    {p.is_creator && <span className="creator-tag">(Creator)</span>}
                  </span>
                  {p.status === 'joined' && p.selected_option_text && (
                    <span className="participant-pick">Picked: {p.selected_option_text}</span>
                  )}
                  {p.status === 'invited' && (
                    <span className="participant-status invited">Invited</span>
                  )}
                  {p.status === 'declined' && (
                    <span className="participant-status declined">Declined</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isCompleted && winners.length > 0 && (
            <div className="bet-section winner-section">
              <h3>Winners</h3>
              <p className="winning-option">Winning option: {bet.winning_option_text}</p>
              <div className="winners-list">
                {winners.map((w) => (
                  <span key={w.id} className="winner-name">{w.user_name}</span>
                ))}
              </div>
            </div>
          )}

          {isCompleted && winners.length === 0 && (
            <div className="bet-section winner-section">
              <h3>Result</h3>
              <p>No participants picked the winning option: {bet.winning_option_text}</p>
            </div>
          )}

          {isCompleted && renderChipSection()}

          {/* Trash Talk Section */}
          <div className="bet-section trash-talk-section">
            <div className="trash-talk-header">
              <h3>Trash Talk</h3>
              {isLocked && !isCompleted && hasJoined && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => setShowTrashTalkModal(true)}
                >
                  + Add Trash Talk
                </button>
              )}
            </div>
            {trashTalk.length === 0 ? (
              <p className="trash-talk-empty">No trash talk yet. {isLocked && !isCompleted && hasJoined && "Be the first to talk some smack!"}</p>
            ) : (
              <div className="trash-talk-messages">
                {trashTalk.map((tt) => (
                  <div key={tt.id} className={`trash-talk-message ${tt.user_id === user?.id ? 'own' : ''}`}>
                    <div className="trash-talk-bubble">
                      <span className="trash-talk-text">{tt.message}</span>
                    </div>
                    <div className="trash-talk-meta">
                      <span className="trash-talk-author">{tt.user_name}</span>
                      <span className="trash-talk-time">{formatDateTime(tt.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="bet-actions">
            {/* Invited user can join or decline */}
            {isInvited && !isCompleted && (
              <div className="join-section">
                <div className="form-group">
                  <label>Select Your Prediction</label>
                  <div className="join-options">
                    {bet.options?.map((option) => (
                      <label key={option.id} className="radio-option">
                        <input
                          type="radio"
                          name="joinOption"
                          value={option.id}
                          checked={selectedOptionId === String(option.id)}
                          onChange={(e) => setSelectedOptionId(e.target.value)}
                        />
                        <span>{option.option_text}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="action-buttons">
                  <button
                    className="btn btn-primary"
                    onClick={handleJoinGroupBet}
                    disabled={actionLoading || !selectedOptionId}
                  >
                    {actionLoading ? 'Joining...' : 'Join Bet'}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={handleDeclineGroupBet}
                    disabled={actionLoading}
                  >
                    Decline
                  </button>
                </div>
              </div>
            )}

            {/* Creator can set winner after end date */}
            {isGroupCreator && isLocked && !isCompleted && new Date(bet.end_date) < new Date() && (
              <button
                className="btn btn-secondary"
                onClick={() => setShowSetWinnerModal(true)}
              >
                Set Winning Option
              </button>
            )}

            {/* Show waiting status */}
            {hasJoined && !isLocked && !isCompleted && (
              <p className="waiting-text">Waiting for more participants to join (need at least 2)</p>
            )}

            {hasJoined && isLocked && !isCompleted && new Date(bet.end_date) >= new Date() && (
              <p className="waiting-text">Bet is active. Winner will be set after the end date.</p>
            )}

            {hasJoined && isLocked && !isCompleted && !isGroupCreator && new Date(bet.end_date) < new Date() && (
              <p className="waiting-text">Waiting for {bet.creator_name} to set the winning option</p>
            )}
          </div>
        </div>

        {/* Set Winner Modal */}
        {showSetWinnerModal && (
          <div className="modal-overlay" onClick={() => setShowSetWinnerModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Set Winning Option</h2>
              <p>Select which prediction was correct.</p>

              <div className="form-group">
                <label>Winning Option</label>
                <div className="winner-options">
                  {bet.options?.map((option) => (
                    <label key={option.id} className="radio-option">
                      <input
                        type="radio"
                        name="winnerOption"
                        value={option.id}
                        checked={winningOptionId === String(option.id)}
                        onChange={(e) => setWinningOptionId(e.target.value)}
                      />
                      <span>{option.option_text} ({option.participant_count} picked)</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => setShowSetWinnerModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSetWinner}
                  disabled={actionLoading || !winningOptionId}
                >
                  {actionLoading ? 'Setting...' : 'Confirm Winner'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Trash Talk Modal */}
        {showTrashTalkModal && (
          <div className="modal-overlay" onClick={() => setShowTrashTalkModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2>Add Trash Talk</h2>
              <p>Talk some smack! Keep it fun and friendly.</p>

              <div className="form-group">
                <label>Your Message</label>
                <textarea
                  value={trashTalkMessage}
                  onChange={(e) => setTrashTalkMessage(e.target.value)}
                  placeholder="Say something to your opponents..."
                  rows={3}
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button className="btn btn-outline" onClick={() => setShowTrashTalkModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleAddTrashTalk}
                  disabled={actionLoading || !trashTalkMessage.trim()}
                >
                  {actionLoading ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 1v1 Bet Rendering (existing code)
  return (
    <div className="bet-detail-page">
      <Link to="/" className="back-link">&larr; Back to Bets</Link>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card bet-detail-card">
        <div className="bet-detail-header">
          <h1>{bet.title}</h1>
          {isCompleted && <span className="badge badge-success">Completed</span>}
          {isPending && <span className="badge badge-warning">Pending Agreement</span>}
          {isLocked && !isCompleted && <span className="badge badge-primary">Active</span>}
        </div>

        <div className="bet-participants">
          <div className="participant">
            <span className="participant-label">Created by</span>
            <span className="participant-name">{bet.creator_name}</span>
            {bet.creator_side && <span className="participant-side">"{bet.creator_side}"</span>}
          </div>
          <div className="vs">VS</div>
          <div className="participant">
            <span className="participant-label">Opponent</span>
            <span className="participant-name">{bet.opponent_name}</span>
            {bet.opponent_side && <span className="participant-side">"{bet.opponent_side}"</span>}
          </div>
        </div>

        <div className="bet-section trash-talk-section">
          <div className="trash-talk-header">
            <h3>Trash Talk</h3>
            {isLocked && !isCompleted && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setShowTrashTalkModal(true)}
              >
                + Add Trash Talk
              </button>
            )}
          </div>
          {trashTalk.length === 0 ? (
            <p className="trash-talk-empty">No trash talk yet. {isLocked && !isCompleted && "Be the first to talk some smack!"}</p>
          ) : (
            <div className="trash-talk-messages">
              {trashTalk.map((tt) => (
                <div key={tt.id} className={`trash-talk-message ${tt.user_id === user?.id ? 'own' : ''}`}>
                  <div className="trash-talk-bubble">
                    <span className="trash-talk-text">{tt.message}</span>
                  </div>
                  <div className="trash-talk-meta">
                    <span className="trash-talk-author">{tt.user_name}</span>
                    <span className="trash-talk-time">{formatDateTime(tt.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bet-info-grid">
          <div className="bet-section">
            <h3>Description</h3>
            <p>{bet.description}</p>
          </div>
          <div className="bet-section">
            <h3>Stakes / Prize</h3>
            <p className="prize-text">{bet.prize_description}</p>
          </div>
        </div>

        <div className="bet-section">
          <h3>Timeline</h3>
          <div className="dates">
            <span><span className="date-label">Start:</span> {formatDate(bet.start_date)}</span>
            <span className="date-separator">—</span>
            <span><span className="date-label">End:</span> {formatDate(bet.end_date)}</span>
          </div>
        </div>

        <div className="bet-section history-section">
          <div className="history-toggle" onClick={() => setShowHistory(!showHistory)}>
            <h3>History</h3>
            <span className={`history-chevron ${showHistory ? 'expanded' : ''}`}>&#9654;</span>
          </div>
          {showHistory && <div className="history-timeline">
            <div className="history-entry">
              <span className="history-action">Bet created by {bet.creator_name}</span>
              <span className="history-time">{formatDateTime(bet.created_at)}</span>
            </div>

            {bet.locked_at && (
              <div className="history-entry">
                <span className="history-action">{bet.opponent_name} agreed to the bet</span>
                <span className="history-time">{formatDateTime(bet.locked_at)}</span>
              </div>
            )}

            {bet.creator_completed_at && (
              <div className="history-entry">
                <span className="history-action">
                  {bet.creator_name} marked complete - selected: {bet.creator_selected_winner_name || 'No winner / Draw'}
                </span>
                <span className="history-time">{formatDateTime(bet.creator_completed_at)}</span>
              </div>
            )}

            {bet.opponent_completed_at && (
              <div className="history-entry">
                <span className="history-action">
                  {bet.opponent_name} marked complete - selected: {bet.opponent_selected_winner_name || 'No winner / Draw'}
                </span>
                <span className="history-time">{formatDateTime(bet.opponent_completed_at)}</span>
              </div>
            )}

            {bet.disputed_at && (
              <div className="history-entry disputed">
                <span className="history-action">Bet marked as disputed (disagreement on winner)</span>
                <span className="history-time">{formatDateTime(bet.disputed_at)}</span>
              </div>
            )}

            {bet.creator_resolution_at && (
              <div className="history-entry">
                <span className="history-action">
                  {bet.creator_name} submitted resolution - selected: {bet.creator_resolution_winner_name || 'No winner / Draw'}
                </span>
                <span className="history-time">{formatDateTime(bet.creator_resolution_at)}</span>
                {bet.creator_resolution_comment && (
                  <span className="history-comment">"{bet.creator_resolution_comment}"</span>
                )}
              </div>
            )}

            {bet.opponent_resolution_at && (
              <div className="history-entry">
                <span className="history-action">
                  {bet.opponent_name} submitted resolution - selected: {bet.opponent_resolution_winner_name || 'No winner / Draw'}
                </span>
                <span className="history-time">{formatDateTime(bet.opponent_resolution_at)}</span>
                {bet.opponent_resolution_comment && (
                  <span className="history-comment">"{bet.opponent_resolution_comment}"</span>
                )}
              </div>
            )}

            {bet.completed_at && (
              <div className="history-entry completed">
                <span className="history-action">
                  Bet completed{bet.winner_name ? ` - Winner: ${bet.winner_name}` : ' - No winner / Draw'}
                </span>
                <span className="history-time">{formatDateTime(bet.completed_at)}</span>
              </div>
            )}

            {bet.rejected_at && (
              <div className="history-entry rejected">
                <span className="history-action">Bet rejected</span>
                <span className="history-time">{formatDateTime(bet.rejected_at)}</span>
              </div>
            )}
          </div>}
        </div>

        {bet.winner_name && (
          <div className="bet-section winner-section">
            <h3>Winner</h3>
            <p className="winner-name">{bet.winner_name}</p>
          </div>
        )}

        {isCompleted && renderChipSection()}

        {bet.disputed_at && (
          <div className="bet-section disputed-section">
            <h3>Disputed</h3>
            <p className="disputed-text">Participants disagreed on the winner</p>

            <h4 className="history-title">Original Selections</h4>
            <div className="completion-history">
              <div className="history-item">
                <span className="history-name">{bet.creator_name}</span>
                <span className="history-selection">
                  selected: {bet.creator_selected_winner_name || 'No winner / Draw'}
                </span>
                {bet.creator_completed_at && (
                  <span className="history-time">{formatDateTime(bet.creator_completed_at)}</span>
                )}
              </div>
              <div className="history-item">
                <span className="history-name">{bet.opponent_name}</span>
                <span className="history-selection">
                  selected: {bet.opponent_selected_winner_name || 'No winner / Draw'}
                </span>
                {bet.opponent_completed_at && (
                  <span className="history-time">{formatDateTime(bet.opponent_completed_at)}</span>
                )}
              </div>
            </div>

            {(bet.creator_resolution_at || bet.opponent_resolution_at) && (
              <>
                <h4 className="history-title">Resolution Attempts</h4>
                <div className="completion-history">
                  {bet.creator_resolution_at && (
                    <div className="history-item">
                      <span className="history-name">{bet.creator_name}</span>
                      <span className="history-selection">
                        selected: {bet.creator_resolution_winner_name || 'No winner / Draw'}
                      </span>
                      <span className="history-time">{formatDateTime(bet.creator_resolution_at)}</span>
                      {bet.creator_resolution_comment && (
                        <span className="history-comment">"{bet.creator_resolution_comment}"</span>
                      )}
                    </div>
                  )}
                  {bet.opponent_resolution_at && (
                    <div className="history-item">
                      <span className="history-name">{bet.opponent_name}</span>
                      <span className="history-selection">
                        selected: {bet.opponent_resolution_winner_name || 'No winner / Draw'}
                      </span>
                      <span className="history-time">{formatDateTime(bet.opponent_resolution_at)}</span>
                      {bet.opponent_resolution_comment && (
                        <span className="history-comment">"{bet.opponent_resolution_comment}"</span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="resolve-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShowResolveModal(true)}
              >
                Resolve Dispute
              </button>
            </div>
          </div>
        )}

        {isLocked && !isCompleted && !bet.disputed_at && (
          <div className="bet-section completion-status">
            <h3>Completion Status</h3>
            <div className="completion-checks">
              <div className={`completion-check ${bet.creator_marked_complete ? 'done' : ''}`}>
                <div className="check-header">
                  {bet.creator_name}: {bet.creator_marked_complete ? 'Marked complete' : 'Pending'}
                </div>
                {bet.creator_marked_complete && (
                  <div className="check-details">
                    Selected winner: {bet.creator_selected_winner_name || 'No winner / Draw'}
                    {bet.creator_completed_at && (
                      <span className="check-time"> - {formatDateTime(bet.creator_completed_at)}</span>
                    )}
                  </div>
                )}
              </div>
              <div className={`completion-check ${bet.opponent_marked_complete ? 'done' : ''}`}>
                <div className="check-header">
                  {bet.opponent_name}: {bet.opponent_marked_complete ? 'Marked complete' : 'Pending'}
                </div>
                {bet.opponent_marked_complete && (
                  <div className="check-details">
                    Selected winner: {bet.opponent_selected_winner_name || 'No winner / Draw'}
                    {bet.opponent_completed_at && (
                      <span className="check-time"> - {formatDateTime(bet.opponent_completed_at)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="bet-actions">
          {isPending && isOpponent && (
            <div className="agree-section">
              <div className="form-group">
                <label htmlFor="opponentSide">Your Side / Prediction</label>
                <input
                  type="text"
                  id="opponentSide"
                  value={opponentSide}
                  onChange={(e) => setOpponentSide(e.target.value)}
                  placeholder="What outcome are you betting on?"
                />
                <small className="form-hint">Enter your side before agreeing to the bet</small>
              </div>
              <div className="action-buttons">
                <button
                  className="btn btn-primary"
                  onClick={handleAgree}
                  disabled={actionLoading || !opponentSide.trim()}
                >
                  {actionLoading ? 'Processing...' : 'Agree to Bet'}
                </button>
                <button
                  className="btn btn-outline"
                  onClick={handleDecline}
                  disabled={actionLoading}
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {isPending && isCreator && (
            <button
              className="btn btn-outline"
              onClick={handleDecline}
              disabled={actionLoading}
            >
              Cancel Bet
            </button>
          )}

          {isLocked && !isCompleted && !myCompletionStatus && (
            <button
              className="btn btn-secondary"
              onClick={() => setShowCompleteModal(true)}
            >
              Mark as Complete
            </button>
          )}

          {isLocked && !isCompleted && myCompletionStatus && !theirCompletionStatus && (
            <p className="waiting-text">Waiting for {isCreator ? bet.opponent_name : bet.creator_name} to confirm completion</p>
          )}
        </div>
      </div>

      {showCompleteModal && (
        <div className="modal-overlay" onClick={() => setShowCompleteModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Mark Bet Complete</h2>
            <p>Confirm that the bet has been fulfilled.</p>

            <div className="form-group">
              <label>Who won? (Optional)</label>
              <select
                value={selectedWinner}
                onChange={(e) => setSelectedWinner(e.target.value)}
              >
                <option value="">No winner / Draw</option>
                <option value={bet.creator_id}>{bet.creator_name}</option>
                <option value={bet.opponent_id}>{bet.opponent_name}</option>
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowCompleteModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleComplete}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Confirm Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResolveModal && (
        <div className="modal-overlay" onClick={() => setShowResolveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Resolve Dispute</h2>
            <p>Submit your resolution. If both parties agree, the bet will be marked complete.</p>

            <div className="form-group">
              <label>Who won?</label>
              <select
                value={resolveWinner}
                onChange={(e) => setResolveWinner(e.target.value)}
              >
                <option value="">No winner / Draw</option>
                <option value={bet.creator_id}>{bet.creator_name}</option>
                <option value={bet.opponent_id}>{bet.opponent_name}</option>
              </select>
            </div>

            <div className="form-group">
              <label>Comment (explain your reasoning)</label>
              <textarea
                value={resolveComment}
                onChange={(e) => setResolveComment(e.target.value)}
                placeholder="Explain why you believe this is the correct winner..."
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowResolveModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleResolve}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Submit Resolution'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTrashTalkModal && (
        <div className="modal-overlay" onClick={() => setShowTrashTalkModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Trash Talk</h2>
            <p>Talk some smack! Keep it fun and friendly.</p>

            <div className="form-group">
              <label>Your Message</label>
              <textarea
                value={trashTalkMessage}
                onChange={(e) => setTrashTalkMessage(e.target.value)}
                placeholder="Say something to your opponent..."
                rows={3}
                autoFocus
              />
            </div>

            <div className="modal-actions">
              <button className="btn btn-outline" onClick={() => setShowTrashTalkModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAddTrashTalk}
                disabled={actionLoading || !trashTalkMessage.trim()}
              >
                {actionLoading ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showChipOfferModal && (
        <div className="modal-overlay" onClick={() => setShowChipOfferModal(false)}>
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
              <button className="btn btn-outline" onClick={() => setShowChipOfferModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleChipOffer}
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
