import { useAuth } from '../context/AuthContext';
import './BetCard.css';

export default function BetCard({ bet, onClick }) {
  const { user } = useAuth();

  const isGroupBet = bet.bet_type === 'group';
  const isCreator = bet.creator_id === user?.id;
  const opponent = isCreator ? bet.opponent_name : bet.creator_name;
  const isLocked = isGroupBet ? !!bet.locked_at : bet.opponent_agreed;
  const isCompleted = bet.completed_at;
  const isPending = isGroupBet ? !bet.locked_at : !bet.opponent_agreed;

  // For group bets, check if current user needs to take action
  const needsMyAction = isGroupBet
    ? bet.my_status === 'invited'
    : (!isCreator && !bet.opponent_agreed);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatus = () => {
    if (isCompleted) return { text: 'Completed', class: 'badge-success' };
    if (isPending && needsMyAction) return { text: 'Action Needed', class: 'badge-warning' };
    if (isPending) return { text: 'Pending', class: 'badge-warning' };
    if (new Date(bet.end_date) < new Date()) return { text: 'Past Due', class: 'badge-error' };
    return { text: 'Active', class: 'badge-primary' };
  };

  const status = getStatus();

  // Determine if user won (for group bets)
  const isWinner = isGroupBet && bet.winning_option_id && bet.selected_option_id === bet.winning_option_id;

  return (
    <div className="bet-card" onClick={onClick}>
      <div className="bet-card-header">
        <div className="bet-title-area">
          {isGroupBet && <span className="group-badge">Group</span>}
          <h3 className="bet-title">{bet.title}</h3>
        </div>
        <span className={`badge ${status.class}`}>{status.text}</span>
      </div>

      {isGroupBet ? (
        <p className="bet-participants-count">
          {bet.participant_count || 0} participants
        </p>
      ) : (
        <p className="bet-opponent">vs. {opponent}</p>
      )}

      <div className="bet-dates">
        <span>{formatDate(bet.start_date)}</span>
        <span className="date-separator">to</span>
        <span>{formatDate(bet.end_date)}</span>
      </div>

      <p className="bet-prize">Prize: {bet.prize_description}</p>

      {isGroupBet && isCompleted && (
        <p className={`bet-result ${isWinner ? 'winner' : 'loser'}`}>
          {isWinner ? 'You won!' : `Winner: ${bet.winning_option_text || 'Set'}`}
        </p>
      )}

      {!isGroupBet && bet.winner_name && (
        <p className="bet-winner">Winner: {bet.winner_name}</p>
      )}
    </div>
  );
}
