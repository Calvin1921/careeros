export const defaultProfileSetup = {
  cvReady: false,
  linkedIn: "",
  workType: "Full-time or contract",
  applicationControl: "Prepare automatically · ask before submission",
};

// A conversation may start without a CV, LinkedIn account or completed profile.
export function profileSetupReady(setup) {
  return Boolean(setup?.workType && setup?.applicationControl);
}
export function completedInterview(questions, answers) {
  return questions.every(
    (question) => String(answers?.[question.id] || "").trim().length >= 12,
  );
}
