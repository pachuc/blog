---
tags:
  - security
  - identity
  - technology
  - work
  - programming
title: "Thinking About Identity"
date: 2020-11-16T20:36:19-05:00
draft: false
---

Today is my last day at Fireeye, and tomorrow is my first day at ID.me. So, on the cusp of this big transition, I find myself thinking about the intersection between identity and security. 

# The Problem

Fundamentally, identity is about security. It is about verifying that the user is who they claim to be, and that they have the right access and privileges,  to be given the data or service as requested. The other aspect of identity is usability. Identity verification, is primarily a user driven activity, and thus, it is in the interest of businesses and services to make verifying identity, as painless as possible. It is here that the two aspects of identity verification are at odds. On the one hand, there is incentive to make the process as painless as possible. Yet, on the other hand, it needs to be secure, and fundamentally ease of access is less secure. 

The fact that usability and security are fundamentally at odds with each other is easily illustrated if we consider the extreme cases. For maximum usability, it makes sense to just trust the user. No need for authentication at all! Just believe the user at face value, and provide whatever they request. From a user perspective this is painless and easy. No need to provide credentials, remember obscure questions, or prove anything. However, obviously this is horribly insecure, as anyone can claim to be anyone. On the other end of the spectrum, we have our current day situation, an increasingly escalating arms race towards "security". Plagued by insane password character and rotation requirements, as well as 2nd, 3rd, and 4th factor authentication,  users can barely manage their credentials at all. Ironically, these draconian policies can end up hurting security, and in other cases provide a false sense of security to users. A few examples of this:
- 2FA is considered secure practice, but depending on the implementation, may be prone to exploitation. Text message / Cell network based two-factor authentication can be broken by hackers that have ability to spoof sims, or control the carrier network.
- Complex passwords & password rotation requirements are considered best practice. However, complex requirements and extreme rotation schedules can force users into bad practices to cope. Users may use the same password everywhere, since its much easier to remember just one complex password rather than ten. Users may also end up doing small 1 character changes to get around password rotation. 
- Finally, best practice is to use a different complex password for each log in, to minimize risk from one service becoming compromised. However, this is effectively impossible to do well without a centralized password manager, which once again, creates a single point of failure anyway.
So, in a way, while these requirements of security & usability are fundamentally opposed, they are also reliant on each other. To provide a good user experience, the service must be secure, and to be secure, the service must provide an easy system for the user to follow and abide by.

# Solutions

This section is titled, solutions, but that's sort of a lie,  as the space is still quite open and unsolved. So, this section won't be providing the one true solution to the problem or something like that. Instead, we'll just go through the direction the field is moving in, and what trends are emerging.

Identity as a Service:

The biggest trend in the space is the move towards identity as a service. In the days of internet past, every website rolled their own user authentication system.  Soon people were moving towards tried and true technologies, agreed upon standards, and plug and play solutions. However, over the past few years we've seen a clear move by many organizations, both internally as well as externally, towards identity as a service. The reason for this should be quite obvious I think. It's because identity is a complex nuanced problem to solve. Keeping up, maintaining, and innovating in the space is a full time job. Most organizations have their own business to run, so it makes no sense for them to roll and maintain their own identity systems.

Biometric Identification:

As biometric scanning and identification technologies have improved, it has also become an increasingly interesting option for user authentication. Biometric data hits a sweet spot, where the data is complex (and thus hard to guess), but still easy for the user (since its just scanning their body). It seems like the obvious solution, but there are still a number of things that must be considered to make this more secure and fool-proof.

First off, one must understand that from a computer perspective, biometric data is still just data, and so, if leaked or captured, can still be spoofed. Thus, two things are important:
1. It is not safe enough as to not have a second factor.
2. It should not be stored (as it cannot be changed like a password can).
Thus, realizing these two things, one design pattern becomes apparent to me. Since cellphones are the primary vehicle for most users to perform bio-metric authentication, there is no need for a two-factor text message, or ping, etc. Instead, the credential provided to the server must have a combination of data about the user's biometrics as well as the device (trusted) that it was read on. The server should store an un-reversible hash based on these two data points, that it can use to authenticate the user.  It should not store the actual raw data about the device or the biometric, as then the server becomes a single point of failure. Similarly, the device should not store any info about whether the provided biometric is correct or not. Instead it should take the reading, hash it with its own identification, and provide the output to the server. This way the device also avoids being a single point of failure. Now, this proposed solution comes with its own set of problems. For example, the device becomes a pivotal piece of the authentication process, and thus adding a new device (whether because the old one was lost, or the user upgraded) becomes a complicated and exploitable process. 

# Conclusion

While biometric based identity authentication is tricky to get right, and requires significant engineering, I still believe many organizations will move towards it. With identity being offered as a service, especially by the biggest tech companies in the world, the problem only needs to be solved well once before it becomes widespread. We already see the trend cemented in the latest cellphones that open using fingerprint ID, and I believe we will continue to see the space evolve in this direction. The concept provides great security, and also great usability, so it is hard to see it not taking off, as this intersection is where the primary problem in identity management lies today.



