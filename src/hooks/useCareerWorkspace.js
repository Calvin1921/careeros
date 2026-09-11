import { useState } from "react";
import { prepareCv } from "../lib/prepare-cv";
import { candidate } from "../data/candidate";

export function useCareerWorkspace() {
  const [view, setView] = useState("roles");
  const [origin, setOrigin] = useState("roles");
  const [selectedJob, setSelectedJob] = useState(null);
  const [applications, setApplications] = useState({});
  const [criteria, setCriteria] = useState({
    location: "Hong Kong or worldwide remote",
    salaryFloor: "",
    priority: "Best fit",
  });
  const [criteriaOpen, setCriteriaOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [assistant, setAssistant] = useState(false);

  const current = selectedJob ? applications[selectedJob.id] : null;
  const cv = current?.cv || candidate;
  const updateCurrent = (patch) =>
    setApplications((previous) => ({
      ...previous,
      [selectedJob.id]: { ...previous[selectedJob.id], ...patch },
    }));
  function openJob(job, from = "roles") {
    setOrigin(from);
    setSelectedJob(job);
    setView("review");
  }
  function prepare() {
    if (!current)
      updateCurrent({
        job: selectedJob,
        cv: prepareCv(selectedJob),
        answer: "",
        stage: "Preparing",
      });
    setView("prepare");
  }
  function prepareFor(job) {
    const applicationJob = {
      ...job,
      materials:
        Array.isArray(job.materials) && job.materials.length
          ? job.materials
          : [
              "Tailored CV",
              "Employer application form",
              "Final eligibility and salary check",
            ],
      question:
        job.question ||
        "Why are you interested in this role, and which experience best shows that you can succeed in it?",
      questionSource:
        job.questionSource ||
        "Prepared answer prompt · confirm the employer’s exact wording",
      answer:
        job.answer ||
        "This fictional example connects product engineering with reliable workflow design. I would discuss the review console, explain my own contribution, and state clearly which parts were experiments rather than production deployments.",
    };
    setSelectedJob(applicationJob);
    setApplications((previous) =>
      previous[job.id]
        ? previous
        : {
            ...previous,
            [job.id]: {
              job: applicationJob,
              cv: prepareCv(applicationJob),
              answer: applicationJob.answer,
              stage: "Preparing",
              checked: [],
            },
          },
    );
    setView("prepare");
  }
  function navigate(next) {
    setView(next);
    setAssistant(false);
    setEditing(false);
  }
  return {
    view,
    origin,
    navigate,
    selectedJob,
    openJob,
    applications,
    current,
    cv,
    criteria,
    setCriteria,
    criteriaOpen,
    setCriteriaOpen,
    editing,
    setEditing,
    assistant,
    setAssistant,
    updateCurrent,
    prepare,
    prepareFor,
  };
}
