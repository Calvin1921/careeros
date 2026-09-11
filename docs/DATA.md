# Data handling

The included candidate, employers, roles and CVs are fictional. Contact addresses use reserved example domains. No real applications, compensation history, interview materials or account-specific agent configuration are included.

| Data                      | Location                     | Behavior                                                         |
| ------------------------- | ---------------------------- | ---------------------------------------------------------------- |
| API key and agent ID      | Local `.env`, server process | Ignored by Git; never bundled into the client                    |
| Call audio and transcript | ElevenLabs                   | Processed by the provider; template requests seven-day retention |
| Conversation and evidence | Browser localStorage         | Retained on that browser until cleared                           |
| Confirmed profile         | PostgreSQL | Written only after explicit confirmation                         |
| Opportunity state         | Browser localStorage         | Fictional demo state                                             |

To reset the demo, stop any active call and clear this site's browser storage through developer tools, then reload. This removes local history, pending proposals and browser application state. It does not delete provider-side recordings; manage those through the provider account.

The token server binds to the local machine. It is not an authenticated public API. Do not publish a configured development server. Use fictional information when reviewing this prototype.

CareerOS source is provided under the [PolyForm Noncommercial License 1.0.0](../LICENSE.md). It is source-available, not open source. Third-party packages retain their respective licenses, available in their installed distributions. Generic commit metadata is used to keep personal email addresses out of this review repository.

## Monorepo persistence

Confirmed conversation facts and their quotes now reside in PostgreSQL. Pending proposals and raw conversation history remain in browser storage. Clearing browser storage does not erase database records. The local API supports an explicitly confirmed empty fact list to clear conversation facts; other profile records require their respective workflow. Docker volumes persist across container restarts. Provider retention and deletion are separate.
