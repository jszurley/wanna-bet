import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../services/api';
import './Profile.css';

export default function Profile() {
  const { user, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    sms_notifications: user?.sms_notifications !== false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const formatPhoneNumber = (value) => {
    // Remove all non-digits
    const phone = value.replace(/\D/g, '');
    // Format as (XXX) XXX-XXXX
    if (phone.length <= 3) return phone;
    if (phone.length <= 6) return `(${phone.slice(0, 3)}) ${phone.slice(3)}`;
    return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6, 10)}`;
  };

  const handlePhoneChange = (e) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData((prev) => ({ ...prev, phone: formatted }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Convert formatted phone to E.164-ish format for storage
      const phoneDigits = formData.phone.replace(/\D/g, '');
      const phoneToSend = phoneDigits ? `+1${phoneDigits}` : '';

      const response = await updateProfile({
        name: formData.name,
        email: formData.email,
        phone: phoneToSend,
        sms_notifications: formData.sms_notifications
      });

      setUser(response.data.user);
      setSuccess('Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="profile-page">
      <Link to="/" className="back-link">&larr; Back to Bets</Link>

      <div className="page-header">
        <h1>Profile Settings</h1>
        <p>Update your account information and notification preferences</p>
      </div>

      <div className="card">
        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-section">
            <h3>SMS Notifications</h3>
            <p className="form-section-description">
              Get text message alerts when you receive bet invitations, when participants join, and when bets are completed.
            </p>

            <div className="form-group">
              <label htmlFor="phone">Phone Number (US)</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                placeholder="(555) 123-4567"
                maxLength={14}
              />
              <small className="form-hint">Enter your 10-digit US phone number</small>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="sms_notifications"
                  checked={formData.sms_notifications}
                  onChange={handleChange}
                  disabled={!formData.phone}
                />
                <span>Enable SMS notifications</span>
              </label>
              {!formData.phone && (
                <small className="form-hint">Add a phone number to enable SMS notifications</small>
              )}
            </div>
          </div>

          <div className="form-actions">
            <Link to="/" className="btn btn-outline">Cancel</Link>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
