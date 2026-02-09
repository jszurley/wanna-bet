import { useAuth } from '../context/AuthContext';
import './BetCard.css';

export default function BetCard({ bet, onClick }) {
  const { user } = useAuth();

  const isCreator = bet.creator_id === user?.id;
  const opponent = isCreator ? bet.opponent_name : bet.creator_name;
  const isLocked = bet.opponent_agreed;
  const isCompleted = bet.completed_at;
  const isPending = !bet.opponent_agreed;
  const needsMyAction = !isCreator && !bet.opponent_agreed;

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

  return (
    <div className="bet-card" onClick={onClick}>
      <div className="bet-card-header">
        <h3 className="bet-title">{bet.title}</h3>
        <span className={`badge ${status.class}`}>{status.text}</span>
      </div>

      <p className="bet-opponent">vs. {opponent}</p>

      <div className="bet-dates">
        <span>{formatDate(bet.start_date)}</span>
        <span className="date-separator">to</span>
        <span>{formatDate(bet.end_date)}</span>
      </div>

      <p className="bet-prize">Prize: {bet.prize_description}</p>

      {bet.winner_name && (
        <p className="bet-winner">Winner: {bet.winner_name}</p>
      )}
    </div>
  );
}
