import { useMemo, useState } from "react";
import { ChatCircleDots } from "@phosphor-icons/react";
import { ApplicationForm } from "./components/ApplicationForm";
import { BriefingPage } from "./components/BriefingPage";
import { CommandDock } from "./components/CommandDock";
import { CriteriaDialog } from "./components/CriteriaDialog";
import { CvEditor } from "./components/CvEditor";
import { JobWorkspaceHeader } from "./components/JobWorkspaceHeader";
import { LiveJobDetails } from "./components/LiveJobDetails";
import { OpportunityArchive } from "./components/OpportunityArchive";
import { PackageWorkspace } from "./components/PackageWorkspace";
import { ProfilePage } from "./components/ProfilePage";
import { ProfileSetup } from "./components/ProfileSetup";
import { ScheduleDialog } from "./components/ScheduleDialog";
import {
  allImportedJobs,
  consolidatedSnapshot,
} from "./data/imported-snapshots";
import { useApplicationTracker } from "./hooks/useApplicationTracker";
import { useCareerWorkspace } from "./hooks/useCareerWorkspace";
import { useDiscoverySchedule } from "./hooks/useDiscoverySchedule";
import { useJourneyScroll } from "./hooks/useJourneyScroll";
import { useLiveDiscovery } from "./hooks/useLiveDiscovery";
import { effectiveSweepTimes } from "./lib/search-rhythm";
import {
  agentOpportunityContext,
  opportunityForAgentAction,
} from "./lib/agent-actions";
import { applicationStatuses } from "./lib/application-status";
import "./workspace.css";
import { CareerConversationProvider } from "./context/CareerConversationContext";

export function AppCommandCenter() {
  return (
    <CareerConversationProvider>
      <CareerOSWorkspace />
    </CareerConversationProvider>
  );
}

function CareerOSWorkspace() {
  const workspace = useCareerWorkspace();
  const briefing = useLiveDiscovery("review");
  const schedule = useDiscoverySchedule(
    briefing.overview?.settings?.sources || [],
  );
  const journey = useJourneyScroll();
  const tracker = useApplicationTracker();
  const [view, setView] = useState("briefing");
  const [origin, setOrigin] = useState("opportunities");
  const [liveJob, setLiveJob] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const active = ["live-review", "package", "apply"].includes(view)
    ? origin
    : view === "profile-setup"
      ? "profile"
      : view;
  const applicationJob = workspace.selectedJob || liveJob;
  const assistantContext = {
    page: active,
    job: ["live-review", "package", "apply"].includes(view)
      ? applicationJob
      : null,
  };
  const importedJobs = useMemo(() => allImportedJobs(), []);
  const assistantJobs = useMemo(
    () =>
      applicationJob &&
      !importedJobs.some((job) => job.id === applicationJob.id)
        ? [...importedJobs, applicationJob]
        : importedJobs,
    [applicationJob, importedJobs],
  );
  const assistantOpportunities = useMemo(
    () => agentOpportunityContext(assistantJobs, tracker.recordFor),
    [assistantJobs, tracker.recordFor],
  );

  function navigate(next) {
    setView(next);
    window.requestAnimationFrame(() => window.scrollTo(0, 0));
  }
  function openJob(job, from) {
    setOrigin(from);
    journey.open(() => {
      setLiveJob(job);
      setView("live-review");
    });
  }
  function returnToOrigin() {
    journey.returnTo(() => setView(origin));
  }
  function prepareApplication(job = liveJob) {
    setLiveJob(job);
    workspace.prepareFor(job);
    journey.advance(() => setView("package"));
  }
  function recordApplied() {
    workspace.updateCurrent({ stage: "Applied" });
    tracker.updateStatus(applicationJob, "Applied");
  }
  async function saveSchedule(times) {
    await schedule.saveSchedule(times);
    setScheduleOpen(false);
  }
  function handleAgentAction(action) {
    const job = opportunityForAgentAction(action, assistantJobs);
    if (!job) return false;
    if (action.type === "flag_prior_application") {
      tracker.flagPriorApplication(job, action.note);
      return true;
    }
    if (
      action.type === "update_application_status" &&
      applicationStatuses.includes(action.status)
    ) {
      tracker.updateStatus(job, action.status);
      return true;
    }
    return false;
  }

  return (
    <div
      className={
        chatOpen ? "command-shell command-shell--chat-open" : "command-shell"
      }
    >
      <header className="app-header">
        <button className="brand" onClick={() => navigate("briefing")}>
          CareerOS
        </button>
        <nav aria-label="Main navigation">
          {[
            ["briefing", "Briefing"],
            ["opportunities", "Opportunities"],
            ["profile", "Profile"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-current={active === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="profile-area">
          <button
            className="profile-button"
            onClick={() => navigate("profile")}
          >
            <span className="profile-button__name">
              Demo Candidate · Fictional demo
            </span>
            <span className="avatar">DC</span>
          </button>
        </div>
        <button
          className="header-assistant-toggle"
          aria-label={chatOpen ? "Hide CareerOS chat" : "Open CareerOS chat"}
          aria-expanded={chatOpen}
          onClick={() => setChatOpen((open) => !open)}
        >
          <ChatCircleDots size={18} />
          <span>{chatOpen ? "Hide chat" : "Ask CareerOS"}</span>
        </button>
      </header>
      <main id="main-content">
        {view === "briefing" && (
          <BriefingPage
            briefing={briefing}
            snapshot={consolidatedSnapshot}
            tracker={tracker}
            onOpenJob={(job) => openJob(job, "briefing")}
            onOpenOpportunities={() => navigate("opportunities")}
            onSchedule={() => setScheduleOpen(true)}
          />
        )}
        {view === "opportunities" && (
          <OpportunityArchive
            tracker={tracker}
            onPrepare={prepareApplication}
          />
        )}
        {view === "profile" && (
          <ProfilePage
            criteria={workspace.criteria}
            onEdit={() => workspace.setCriteriaOpen(true)}
            onStartSetup={() => navigate("profile-setup")}
          />
        )}
        {view === "profile-setup" && (
          <ProfileSetup
            onClose={() => navigate("profile")}
            onComplete={() => navigate("profile")}
          />
        )}
        {view === "live-review" && liveJob && (
          <LiveJobDetails
            job={liveJob}
            application={tracker.recordFor(liveJob)}
            onStatusChange={(status) => tracker.updateStatus(liveJob, status)}
            onResolveDuplicate={(resolution) =>
              tracker.resolvePriorApplication(liveJob, resolution)
            }
            onPrepare={prepareApplication}
            backLabel={origin === "briefing" ? "Briefing" : "Opportunities"}
            onBack={returnToOrigin}
          />
        )}
        {["package", "apply"].includes(view) && applicationJob && (
          <JobWorkspaceHeader
            job={applicationJob}
            view={view === "package" ? "prepare" : "apply"}
            origin={origin}
            onBack={() =>
              navigate(view === "package" ? "live-review" : "package")
            }
          />
        )}
        {view === "package" && applicationJob && (
          <PackageWorkspace
            checked={workspace.current?.checked || []}
            onCheck={(checked) => workspace.updateCurrent({ checked })}
            job={applicationJob}
            cv={workspace.cv}
            onEdit={() => workspace.setEditing(true)}
            onContinue={() => journey.advance(() => navigate("apply"))}
            onHelp={() => setChatOpen(true)}
          />
        )}
        {view === "apply" && applicationJob && (
          <ApplicationForm
            job={applicationJob}
            answer={workspace.current?.answer || ""}
            setAnswer={(answer) => workspace.updateCurrent({ answer })}
            onBack={() => navigate("package")}
            onHelp={() => setChatOpen(true)}
            submitted={workspace.current?.stage === "Applied"}
            onSubmit={recordApplied}
          />
        )}
      </main>
      {view !== "profile-setup" && (
        <CommandDock
          open={chatOpen}
          onClose={() => setChatOpen(false)}
          context={assistantContext}
          opportunities={assistantOpportunities}
          onAgentAction={handleAgentAction}
          onScan={briefing.scan}
          onSchedule={() => setScheduleOpen(true)}
          onNavigate={navigate}
        />
      )}
      {scheduleOpen && (
        <ScheduleDialog
          initialTimes={effectiveSweepTimes(
            briefing.overview?.settings?.schedule_times,
          )}
          saving={schedule.saving}
          error={schedule.scheduleError}
          onSave={saveSchedule}
          onClose={() => setScheduleOpen(false)}
        />
      )}
      {workspace.criteriaOpen && (
        <CriteriaDialog
          criteria={workspace.criteria}
          onSave={workspace.setCriteria}
          onClose={() => workspace.setCriteriaOpen(false)}
        />
      )}
      {workspace.editing && (
        <div className="editor-backdrop">
          <CvEditor
            cv={workspace.cv}
            onChange={(cv) => workspace.updateCurrent({ cv })}
            onClose={() => workspace.setEditing(false)}
          />
        </div>
      )}
    </div>
  );
}
