# NovaOps architecture overview

## My approach to building this:
- This project was built using SWE 1.7 Lightning on Devin Cloud.
- I started by focusing on a single tool - the feature flag dashboard - and asking Devin to help me plan out an approach. I instructed it to help me plan and to not to start immediately building. We went back and forth a few times, and I laid out some ground assumptions of how this client operates and what the demo should therefore include. It was at this point that I instructed Devin not to include in its implementation an auth flow or references to external feature flag systems such as LaunchDarkly. I thought it was important to get a solid plan together at this early stage, so that we had an artefact from which I'd be able to instruct Devin to reimplement the feature from scratch if necessary.
- Once happy with the plan, I instructed Devin to begin building. I then went back and forth a few more times on the design that it had come up with, until I was satisfied. It initially put together a design that felt very 2010/2011, which I felt would not be suitable for a Series C fintech. Devin then returned with a much-improved design that I felt like more closely resembled how something built in Retool might look. Once this was done, I made a few more requests to Devin for UI/UX improvements. Once that was nailed down, I knew that building out further tools would be rather simple since we had a framework on which to build.
- I intentionally did not bother to be overly-instructive to Devin in terms of implementation details, such as how state was propagated across components or how individual components were built. Rather, given that this was a prototype rather than an app intended for production usage, I felt it was sufficient to allow Devin to handle the implementation details.
- I feel that this approach was absolutely suitable for the purpose of building a prototype. That said, I did notice a few cases in which I needed to steer the model on the implementation details, such as instructing it to use a single shared search bar component across the three tools (I'd noticed that Devin only implemented a 'clear search bar contents' button on only one of the search bars and not all three, which made it clear to me that we had built out multiple copies of the same search bar).

## Assumptions and scope:

### Client context

- The client is an FCA-regulated fintech. On that basis, I made it clear to Devin that certain features like a four-eye review system on the feature flags tool and audit logs on all tools would be imperative to implement.
- The client currently uses Retool. For that reason, I wanted to have Devin built out the tools using a design that I felt resembled Retool.

### Tech stack

- When Devin asked, I said that React would be a good tool choice (I am personally more familiar with React than the other web frameworks, it's by far the most popular choice for building single-page apps, and also I thought it'd be the most likely framework that a client in this context would likely reach for if building their own in-house implementation of these tools).
- Vite as a build tool. This is much faster than create-react-app. Given we'd be iterating on this tool frequently, I felt like it made sense to use something that offered fast hot module reloading.
- TypeScript. Ensures the agent has a clearer understanding of what data types are being passed around in the app.

### Deliberately excluded

- Authentication and authorisation
- A backend and database
- Integrations with external feature-flag platforms (Devin mentioned LaunchDarkly as an example)

This is a frontend prototype, and it was unnecessary to have Devin work on building out this kind of infrastructure. Instead, I just asked Devin to focus on the front-end, and to just mock out the back-end data. Devin ended up using localStorage for data and config persistence, which I thought was a good choice for this -- page refreshes / relaunches of Devin's computer use environment would not cause the state to be lost (this would have been annoying when putting together state to demonstrate what the app was capable of).

### Included
- a multi-user switcher: I wanted to highlight how the app supported multiple internal users, assignment-based action gating (i.e. if a KYC/refund case had been assigned to another staff member, it would not be possible for the current user to take action on that case), and how different users would interact with features differently depending on the actions of other users.
- audit logs throughout: as stated above, this is to do with the client being FCA-regulated.
- tests (this isn't at all necessary for the purpose of building a prototype out for a client. I asked Devin to add tests on a whim - firstly because I felt that it might improve the code quality and reduce the chance of bugs accidentally being introduced if Devin had to run tests to assert that functionality was not broken as a result of code changes; secondly because I was curious how fast SWE 1.7 would be able to build them (sure enough, it was indeed fast)).

### Key trade-offs
- App is front-end only: As explained earlier, the app has no backend, database, or external-service integrations. This meant that it was quick to build this app, and it made for a self-contained demo. However, the downside of this is that data is not truly persistent (it's just stored in localStorage) and there's no server-side validation (which is where validation against business logic should actually live).
- localStorage for persistence: similar to the above point. Great for the purpose of the demo, but in a production app this of course would not be an appropriate place to store production data or audit records.
- Mock user switching instead of authentication: The app has a user switcher dropdown which demonstrates how assignments, approvals, and audit events differ by chosen user. It is not authentication or role-based access control. This made sense for the demo, but in a production implementation we'd need authentication + authorisation, RBAC, and likely SSO too.


## High-level structure

```text
React root
└─ ThemeProvider ────────────────────────────────► localStorage: theme
   └─ UserProvider ──────────────────────────────► localStorage: current user
      └─ ToastProvider ──────────────────────────► in-memory toast state
         └─ App shell
            ├─ Feature-flags screen ─ useFlagStore() ─► localStorage: flags and requests
            ├─ KYC queue ──────────── useKycStore() ──► localStorage: KYC cases
            └─ Refunds dashboard ───── useRefundStore() ► localStorage: refunds
```
