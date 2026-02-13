import { Link } from 'react-router-dom';
import './PrivacyPolicy.css';

export default function TermsAndConditions() {
  return (
    <div className="privacy-page">
      <div className="privacy-header">
        <Link to="/login" className="back-link">&larr; Back</Link>
        <h1>Terms and Conditions</h1>
        <p className="privacy-effective">Effective Date: February 13, 2026</p>
      </div>

      <div className="privacy-content">
        <section>
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Wanna Bet? ("the App"), you agree to be bound by these
            Terms and Conditions. If you do not agree to these terms, you may not use the App.
          </p>
        </section>

        <section>
          <h2>2. Description of Service</h2>
          <p>
            Wanna Bet? is a social platform that allows users to create, track, and settle
            informal friendly bets with people they know. The App provides tools for creating
            bets, managing connections, tracking outcomes, transferring betting chips, and
            communicating through trash talk.
          </p>
          <p>
            <strong>The App does not involve real money gambling.</strong> All bets are
            informal agreements between friends. Prizes and stakes are user-defined and
            may include favors, items, bragging rights, or other non-monetary stakes.
            The App does not process, hold, or transfer any monetary funds.
          </p>
        </section>

        <section>
          <h2>3. Eligibility</h2>
          <p>
            You must be at least 18 years old to use the App. By creating an account, you
            represent and warrant that you are at least 18 years of age and have the legal
            capacity to enter into these Terms.
          </p>
        </section>

        <section>
          <h2>4. Account Responsibilities</h2>
          <ul>
            <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
            <li>You are responsible for all activity that occurs under your account.</li>
            <li>You must provide accurate and truthful information when creating your account.</li>
            <li>You must notify us immediately if you suspect unauthorized access to your account.</li>
            <li>You may not create multiple accounts or share your account with others.</li>
          </ul>
        </section>

        <section>
          <h2>5. Acceptable Use</h2>
          <p>You agree not to use the App to:</p>
          <ul>
            <li>Engage in real-money gambling or any activity that violates applicable laws</li>
            <li>Harass, threaten, or abuse other users through trash talk or any other feature</li>
            <li>Create bets involving illegal activities</li>
            <li>Impersonate another person or misrepresent your identity</li>
            <li>Attempt to gain unauthorized access to the App, other accounts, or our systems</li>
            <li>Use automated tools, bots, or scripts to interact with the App</li>
            <li>Interfere with or disrupt the App's functionality or infrastructure</li>
          </ul>
        </section>

        <section>
          <h2>6. Bets and Betting Chips</h2>
          <h3>Bet Agreements</h3>
          <p>
            Bets created through the App are informal agreements between users. The App
            facilitates the creation and tracking of these agreements but does not enforce
            or adjudicate them. Both parties must agree to a bet before it becomes active.
            Completion and winner selection require mutual agreement from participants.
          </p>

          <h3>Betting Chips</h3>
          <p>
            Betting chips are digital records representing prizes owed between users.
            Chips can be held, offered to pay debts, staked in new bets, and transferred
            between users. Chips have no monetary value and represent only the informal
            obligation described in their prize description.
          </p>

          <h3>Disputes</h3>
          <p>
            If bet participants disagree on the outcome, the App provides a dispute resolution
            flow. However, the App does not act as an arbiter. Users are responsible for
            resolving disputes among themselves in good faith.
          </p>
        </section>

        <section>
          <h2>7. User Content</h2>
          <p>
            You retain ownership of content you create within the App, including bet
            descriptions, trash talk messages, and other user-generated content. By posting
            content, you grant us a non-exclusive license to display that content to other
            users of the App as necessary to provide the service.
          </p>
          <p>
            We reserve the right to remove content that violates these Terms or is otherwise
            objectionable, at our sole discretion.
          </p>
        </section>

        <section>
          <h2>8. SMS Notifications</h2>
          <p>
            If you provide a phone number and opt in to SMS notifications, you consent to
            receiving text messages related to bet activity (new bets, completions, etc.).
            Message frequency varies based on your activity. Standard messaging rates may
            apply. You may opt out at any time by updating your profile settings.
          </p>
        </section>

        <section>
          <h2>9. Disclaimers</h2>
          <ul>
            <li>
              The App is provided "as is" and "as available" without warranties of any kind,
              whether express or implied.
            </li>
            <li>
              We do not guarantee that the App will be uninterrupted, error-free, or secure.
            </li>
            <li>
              We are not responsible for any disputes, disagreements, or outcomes arising
              from bets made through the App.
            </li>
            <li>
              We are not responsible for any losses, damages, or obligations resulting from
              bets or chip transfers between users.
            </li>
          </ul>
        </section>

        <section>
          <h2>10. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, we shall not be liable for any indirect,
            incidental, special, consequential, or punitive damages arising from your use of
            the App, including but not limited to damages for loss of data, goodwill, or
            other intangible losses, regardless of whether we have been advised of the
            possibility of such damages.
          </p>
        </section>

        <section>
          <h2>11. Termination</h2>
          <p>
            We reserve the right to suspend or terminate your account at any time, with or
            without cause, and with or without notice. Upon termination, your right to use
            the App ceases immediately. You may also delete your account at any time by
            contacting us.
          </p>
        </section>

        <section>
          <h2>12. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. Any changes will be reflected on
            this page with an updated effective date. Continued use of the App after changes
            constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2>13. Governing Law</h2>
          <p>
            These Terms are governed by and construed in accordance with applicable law,
            without regard to conflict of law principles. Any disputes arising from these
            Terms or your use of the App shall be resolved through good-faith negotiation.
          </p>
        </section>

        <section>
          <h2>14. Contact</h2>
          <p>
            If you have any questions about these Terms, please contact us through the
            application.
          </p>
        </section>
      </div>
    </div>
  );
}
