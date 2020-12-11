---
tags:
  - election
  - news
title: "Election Fraud"
date: 2020-12-10T20:35:33-05:00
draft: true
---

Election fraud is a hot topic right now. We have a president who refuses to even acknowledge the legitimacy of the election. Youtube just [banned](https://blog.youtube/news-and-events/supporting-the-2020-us-election) videos alleging that there was widespread election fraud. However--beyond this year--even during the previous election, it was alleged that there was hacking of the election. Unfortunately, distrust of the electoral process is not a partisan issue, but rather a strange common ground amongst those that rarely see eye-to-eye. 

Fundamentally, the issue boils down to a singular point: the electoral process is not publicly auditable. We have no way of verifying the election results and counts for ourselves. We don't even have a way of verifying that our own vote was recorded accurately. If people disagree on the legitimacy of the results, theres no way to prove things either way. As a citizen, your only recourse is to trust the people in charge. Now some may be okay with this, and may even think that I'm a kook for not trusting those in power; however, in my opinion, a verifiable solution that does not require trusting those in charge is vastly superior. Plus, trusting those in charge (and in human nature in general) hasn't worked out so well in the past.

# Proposed Solution

I propose that we create a publicly verifiable ledger of the votes. This proposal seeks to make the data accessible, study-able, and verifiable, while maintaining as much voter privacy as possible. The system I propose would work like this:

1. The voter data will be published publicly.
2. The data will be broken down by states & regions.
3. The data will be a list of user hash values and the votes that were recorded for each user hash. 
4. At the time of voting each voter will be given a generated user key. 
5. Using a publicly published one-way hashing algorithm, the user will be able to translate their user key into the corresponding user hash.

Under this proposed solution, the voting data remains relatively anonymous, yet much more auditable. Independent organizations can verify the total vote counts for each region and state, and back up the findings reported by government officials. Individual users can also use their user key to ensure that their vote was recorded properly on the public ledger. No one can easily figure out who any one person voted for, because they will need the individual's user key. Since the data is publicly published and accessible, it is then open to study and analysis, which may reveal new interesting things. 

# Conclusion

The only argument I have seen against my proposed solution, is that making it provable who you voted for effectively removes the anonymity of the process. It can create peer pressure to reveal who you voted for, and it may even lead to the buying and selling of votes. Ultimately, I think this is about trade-offs. To me the peer pressure argument seems like a rare edge case, one that I am more than willing to sacrifice for an actually trustable system. The only caveat is that there should be laws in place deterring business from coercing people into revealing who they voted for. As for the buying and selling of votes, I think the ship has already sailed on "keeping money out of politics".

We are on a scale from "anonymous & un-trustable" to "public & trustable". At this point the trust in the system has been completely eroded. We need to move in the direction of public data in order to restore the integrity of the system. Given the current climate of fake news, tribalism, and distrust, we need to make the truth more accessible. I believe that my proposed solution is a good compromise for now, balancing privacy with far greater transparency. 

