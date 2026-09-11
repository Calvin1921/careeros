import {
  ArrowRight,
  CheckCircle,
  FileText,
  MapPin,
  PhoneCall,
  ShieldCheck,
} from "@phosphor-icons/react";
import { candidate } from "../data/candidate";
import { profileBrief } from "../data/profile-brief";
import { CvReadiness } from "./CvReadiness";
import { ProfileSummaryCard } from "./ProfileSummaryCard";

export function ProfilePage({ criteria, onEdit, onStartSetup }) {
  return (
    <section className="profile-page">
      <header>
        <p className="briefing-kicker">
          <span /> Your career profile
        </p>
        <h1>Start with a conversation.</h1>
        <p>
          Talk about your experience and what you want next. Review the proposed
          details before saving them. No CV required.
        </p>
      </header>
      <section className="profile-checkin">
        <div className="profile-checkin__icon">
          <PhoneCall size={23} />
        </div>
        <div>
          <p className="briefing-label">One career conversation</p>
          <h2>Tell CareerOS what matters to you.</h2>
          <p>
            Have a spoken conversation, then review the details in your own
            words.
          </p>
        </div>
        <button onClick={onStartSetup}>
          Open conversation <ArrowRight size={17} />
        </button>
      </section>
      <ProfileSummaryCard />
      <div className="profile-grid">
        <section className="profile-primary">
          <div className="profile-cv">
            <FileText size={25} />
            <div>
              <span>Fictional demo CV</span>
              <h2>
                {candidate.name} · {candidate.title}
              </h2>
              <p>Sample document for exploring the opportunity workflow</p>
            </div>
            <CheckCircle size={20} weight="fill" />
          </div>
          <section>
            <p className="briefing-label">Professional evidence</p>
            <h2>Demo candidate background</h2>
            <p>{candidate.summary}</p>
            <div className="profile-skills">
              {candidate.allSkills.split(" · ").map((skill) => (
                <span key={skill}>{skill}</span>
              ))}
            </div>
          </section>
          <CvReadiness cv={candidate} />
        </section>
        <aside>
          <section>
            <p className="briefing-label">Search brief</p>
            <h2>Demo search preferences</h2>
            <dl>
              <div>
                <dt>
                  <MapPin size={16} /> Location
                </dt>
                <dd>{criteria.location}</dd>
              </div>
              <div>
                <dt>Work type</dt>
                <dd>{profileBrief.workType}</dd>
              </div>
              <div>
                <dt>Compensation</dt>
                <dd>
                  {criteria.salaryFloor
                    ? `HKD ${Number(criteria.salaryFloor).toLocaleString()} / month`
                    : profileBrief.compensation}
                </dd>
              </div>
              <div>
                <dt>Application control</dt>
                <dd>{profileBrief.applicationControl}</dd>
              </div>
            </dl>
            <button className="briefing-secondary" onClick={onEdit}>
              Update search brief <ArrowRight size={17} />
            </button>
          </section>
          <section className="privacy-note">
            <ShieldCheck size={20} />
            <div>
              <strong>You approve submission</strong>
              <p>
                CareerOS can prepare applications automatically. It never sends
                one without your action.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
