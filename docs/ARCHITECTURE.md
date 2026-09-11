# Architecture and review guide

Start with the product video, then follow the profile flow through these files:

| Area                 | Entry point                                 | Responsibility                                      |
| -------------------- | ------------------------------------------- | --------------------------------------------------- |
| Application          | `src/AppCommandCenter.jsx`                  | Navigation and workspace composition                |
| Profile conversation | `src/components/ProfileConversation.jsx`    | Conversation, pending proposals and review          |
| Voice transport      | `src/hooks/useElevenLabsCall.js`            | SDK session lifecycle and client-tool dispatch      |
| Token boundary       | `server/voice-api.js`                       | Server-side credentials and provider error handling |
| Proposal validation  | `src/lib/profile-proposals.js`              | Allowed fields and literal candidate evidence       |
| Confirmation         | `src/hooks/useProfileInterview.js`          | Pending state, edits and explicit persistence       |
| Fixtures             | `src/data/`, `server/recorded-discovery.js` | Synthetic candidate and opportunity data            |

The review path does not save a fact merely because the model proposed it. Editing clears that item's confirmation; the user must select it again. Pending and confirmed values are stored separately. A confirmed correction records that its wording came from the candidate.

Tests cover evidence rejection, explicit-confirmation boundaries, repeated conversation turns and the token endpoint's failure and disclosure behavior. Provider calls are mocked in automated tests, so CI does not need secrets or consume model usage. The demo provides separate evidence of a real provider call.

A new call opens a new provider session; the interface preserves transcript history locally but does not yet supply cross-call memory to the agent. The recorded-discovery adapter is not a live search service. These boundaries are intentional and visible in the README.
