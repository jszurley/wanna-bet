import { Link } from 'react-router-dom';
import './PrivacyPolicy.css';

export default function PrivacyPolicy() {
  return (
    <div className="privacy-page">
      <div className="privacy-header">
        <Link to="/login" className="back-link">&larr; Back</Link>
        <h1>Privacy Policy</h1>
        <p className="privacy-effective">Effective Date: February 13, 2026</p>
      </div>

      <div className="privacy-content">
        <section>
          <h2>1. Introduction</h2>
          <p>
            Wanna Bet? ("we," "our," or "the App") is a friendly social betting platform
            that allows users to create and track informal bets with friends. This Privacy
            Policy explains how we collect, use, and protect your personal information when
            you use our application.
          </p>
        </section>

        <section>
          <h2>2. Information We Collect</h2>
          <h3>Account Information</h3>
          <ul>
            <li><strong>Name</strong> &mdash; used to identify you to other users</li>
            <li><strong>Email address</strong> &mdash; used for account login and identification</li>
            <li><strong>Password</strong> &mdash; stored in hashed form; we never store or have access to your plain-text password</li>
            <li><strong>Phone number</strong> (optional) &mdash; used solely for SMS notifications if you opt in</li>
          </ul>

          <h3>User-Generated Content</h3>
          <ul>
            <li>Bet details (titles, descriptions, stakes, sides, dates)</li>
            <li>Trash talk messages</li>
            <li>Betting chip records (prizes, transfers, offers)</li>
          </ul>

          <h3>Automatically Collected Information</h3>
          <ul>
            <li>We do not use cookies for tracking or analytics.</li>
            <li>A JSON Web Token (JWT) is stored in your browser's local storage for authentication purposes only.</li>
          </ul>
        </section>

        <section>
          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect to:</p>
          <ul>
            <li>Create and manage your account</li>
            <li>Enable you to create bets, connect with friends, and track outcomes</li>
            <li>Manage betting chip transfers and debt tracking between users</li>
            <li>Send SMS notifications about bet activity (if you have provided a phone number and opted in)</li>
            <li>Authenticate your identity and secure your account</li>
          </ul>
        </section>

        <section>
          <h2>4. Information Sharing</h2>
          <p>
            We do not sell, trade, or rent your personal information to third parties.
            Your information is shared only in the following limited ways:
          </p>
          <ul>
            <li>
              <strong>With other users:</strong> Your name is visible to your connections
              and to users you are in bets with. Your email is visible to users searching
              for connections.
            </li>
            <li>
              <strong>Twilio (SMS provider):</strong> If you opt in to SMS notifications,
              your phone number is shared with Twilio solely for the purpose of delivering
              notifications. See{' '}
              <a href="https://www.twilio.com/legal/privacy" target="_blank" rel="noopener noreferrer">
                Twilio's Privacy Policy
              </a>.
            </li>
            <li>
              <strong>Hosting provider:</strong> The App is hosted on Railway. Data is
              stored in a PostgreSQL database managed within Railway's infrastructure. See{' '}
              <a href="https://railway.app/legal/privacy" target="_blank" rel="noopener noreferrer">
                Railway's Privacy Policy
              </a>.
            </li>
          </ul>
        </section>

        <section>
          <h2>5. Data Storage and Security</h2>
          <ul>
            <li>Passwords are hashed using industry-standard bcrypt before storage.</li>
            <li>Authentication uses JSON Web Tokens (JWT) with expiration.</li>
            <li>All data is transmitted over HTTPS.</li>
            <li>The database is hosted on Railway with SSL encryption for connections in production.</li>
          </ul>
          <p>
            While we take reasonable measures to protect your data, no method of electronic
            storage or transmission is 100% secure. We cannot guarantee absolute security.
          </p>
        </section>

        <section>
          <h2>6. Data Retention</h2>
          <p>
            We retain your account information and associated bet data for as long as
            your account is active. Bet history, chip records, and trash talk messages
            are retained as part of the ongoing record of bets between users.
          </p>
        </section>

        <section>
          <h2>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access and update your profile information at any time through the App</li>
            <li>Opt in or out of SMS notifications by updating your profile settings</li>
            <li>Request deletion of your account and associated data by contacting us</li>
          </ul>
        </section>

        <section>
          <h2>8. Children's Privacy</h2>
          <p>
            The App is not intended for use by anyone under the age of 18. We do not
            knowingly collect personal information from children. If we become aware that
            a child under 18 has provided us with personal data, we will take steps to
            delete that information.
          </p>
        </section>

        <section>
          <h2>9. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Any changes will be
            reflected on this page with an updated effective date. Continued use of the
            App after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2>10. Contact</h2>
          <p>
            If you have any questions about this Privacy Policy or your data, please
            contact us through the application.
          </p>
        </section>
      </div>
    </div>
  );
}
