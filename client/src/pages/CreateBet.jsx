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
  const [betType, setBetType] = useState('1v1');

  // 1v1 bet form data
  const [formData, setFormData] = useState({
    opponentId: '',
    title: '',
    description: '',
    prizeDescription: '',
    creatorSide: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: ''
  });

  // Group bet form data
  const [groupFormData, setGroupFormData] = useState({
    title: '',
    description: '',
    prizeDescription: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    options: ['', ''],
    invitedUserIds: [],
    creatorOptionIndex: null
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

  const handleGroupChange = (e) => {
    const { name, value } = e.target;
    setGroupFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleOptionChange = (index, value) => {
    setGroupFormData((prev) => {
      const newOptions = [...prev.options];
      newOptions[index] = value;
      return { ...prev, options: newOptions };
    });
  };

  const addOption = () => {
    setGroupFormData((prev) => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index) => {
    if (groupFormData.options.length <= 2) return;
    setGroupFormData((prev) => {
      const newOptions = prev.options.filter((_, i) => i !== index);
      let newCreatorIndex = prev.creatorOptionIndex;
      if (prev.creatorOptionIndex === index) {
        newCreatorIndex = null;
      } else if (prev.creatorOptionIndex > index) {
        newCreatorIndex = prev.creatorOptionIndex - 1;
      }
      return { ...prev, options: newOptions, creatorOptionIndex: newCreatorIndex };
    });
  };

  const toggleInvitedUser = (userId) => {
    setGroupFormData((prev) => {
      const isInvited = prev.invitedUserIds.includes(userId);
      if (isInvited) {
        return { ...prev, invitedUserIds: prev.invitedUserIds.filter(id => id !== userId) };
      } else {
        return { ...prev, invitedUserIds: [...prev.invitedUserIds, userId] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (betType === 'group') {
        // Validate group bet
        const filledOptions = groupFormData.options.filter(o => o.trim());
        if (filledOptions.length < 2) {
          setError('At least 2 options are required');
          setSubmitting(false);
          return;
        }
        if (groupFormData.invitedUserIds.length < 1) {
          setError('At least 1 participant must be invited');
          setSubmitting(false);
          return;
        }
        if (groupFormData.creatorOptionIndex === null) {
          setError('Please select your prediction');
          setSubmitting(false);
          return;
        }

        await createBet({
          betType: 'group',
          title: groupFormData.title,
          description: groupFormData.description,
          prizeDescription: groupFormData.prizeDescription,
          startDate: groupFormData.startDate,
          endDate: groupFormData.endDate,
          options: filledOptions,
          invitedUserIds: groupFormData.invitedUserIds,
          creatorOptionIndex: groupFormData.creatorOptionIndex
        });
      } else {
        await createBet({
          opponentId: parseInt(formData.opponentId),
          title: formData.title,
          description: formData.description,
          prizeDescription: formData.prizeDescription,
          creatorSide: formData.creatorSide,
          startDate: formData.startDate,
          endDate: formData.endDate
        });
      }
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
        <p>Challenge your connections to a friendly wager</p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}

        <div className="bet-type-toggle">
          <button
            type="button"
            className={`toggle-btn ${betType === '1v1' ? 'active' : ''}`}
            onClick={() => setBetType('1v1')}
          >
            1v1 Bet
          </button>
          <button
            type="button"
            className={`toggle-btn ${betType === 'group' ? 'active' : ''}`}
            onClick={() => setBetType('group')}
          >
            Group Bet
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {betType === '1v1' ? (
            <>
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
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="groupTitle">Bet Title</label>
                <input
                  type="text"
                  id="groupTitle"
                  name="title"
                  value={groupFormData.title}
                  onChange={handleGroupChange}
                  required
                  placeholder="e.g., Super Bowl Winner"
                />
              </div>

              <div className="form-group">
                <label htmlFor="groupDescription">Description</label>
                <textarea
                  id="groupDescription"
                  name="description"
                  value={groupFormData.description}
                  onChange={handleGroupChange}
                  required
                  rows={3}
                  placeholder="Describe the bet conditions..."
                />
              </div>

              <div className="form-group">
                <label htmlFor="groupPrizeDescription">Prize / Stakes</label>
                <textarea
                  id="groupPrizeDescription"
                  name="prizeDescription"
                  value={groupFormData.prizeDescription}
                  onChange={handleGroupChange}
                  required
                  rows={2}
                  placeholder="What do the losers owe the winners?"
                />
              </div>

              <div className="form-group">
                <label>Prediction Options</label>
                <small className="form-hint">Add the possible outcomes participants can choose from</small>
                <div className="options-list">
                  {groupFormData.options.map((option, index) => (
                    <div key={index} className="option-row">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1} (e.g., Chiefs, 49ers)`}
                        required
                      />
                      {groupFormData.options.length > 2 && (
                        <button
                          type="button"
                          className="btn btn-icon"
                          onClick={() => removeOption(index)}
                          title="Remove option"
                        >
                          &times;
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" className="btn btn-outline btn-sm" onClick={addOption}>
                  + Add Option
                </button>
              </div>

              <div className="form-group">
                <label>Your Prediction</label>
                <small className="form-hint">Which option are you betting on?</small>
                <div className="creator-option-select">
                  {groupFormData.options.map((option, index) => (
                    option.trim() && (
                      <label key={index} className="radio-option">
                        <input
                          type="radio"
                          name="creatorOption"
                          checked={groupFormData.creatorOptionIndex === index}
                          onChange={() => setGroupFormData(prev => ({ ...prev, creatorOptionIndex: index }))}
                        />
                        <span>{option}</span>
                      </label>
                    )
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Invite Participants</label>
                <small className="form-hint">Select connections to invite to this bet</small>
                <div className="participants-list">
                  {connections.map((conn) => {
                    const opponent = getOpponentFromConnection(conn);
                    const isInvited = groupFormData.invitedUserIds.includes(opponent.id);
                    return (
                      <label key={conn.id} className="checkbox-option">
                        <input
                          type="checkbox"
                          checked={isInvited}
                          onChange={() => toggleInvitedUser(opponent.id)}
                        />
                        <span>{opponent.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="groupStartDate">Start Date</label>
                  <input
                    type="date"
                    id="groupStartDate"
                    name="startDate"
                    value={groupFormData.startDate}
                    onChange={handleGroupChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="groupEndDate">End Date</label>
                  <input
                    type="date"
                    id="groupEndDate"
                    name="endDate"
                    value={groupFormData.endDate}
                    onChange={handleGroupChange}
                    required
                    min={groupFormData.startDate}
                  />
                </div>
              </div>
            </>
          )}

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
