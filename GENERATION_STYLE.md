# Generation style

This file holds the shared instructions for any model that writes text Hraness publishes: news summaries, reading notes, dossiers, release notes, replies, alerts, and descriptions. It applies [`STYLE.md`](STYLE.md) to prompts.

Include the block below in the prompt verbatim, then add the addendum for the form you generate. Consumers that vendor the block into code export it with its version and SHA-256 and test the hash against this file, so a change here is visible in every consumer's prompt version.

## Using the block

- Put the block before the task-specific instructions, so later instructions can narrow it but not undo it.
- Record `hraness-generation-style/v1` (or the block's hash) with your prompt version wherever you record prompt versions.
- Skills and agent instructions link to this file and paste the block into their writing section.
- After a prompt change, read a sample of real outputs before you ship it widely.

## Block: hraness-generation-style/v1

<!-- hraness-generation-style:v1:start -->
```text
People will read what you write on a public page, in a feed, or in a message. They have not seen these instructions, the input fields, or the sources, and they do not know how you worked.

Say what happened or what the source shows. Name who did what, where, and when, and give the most important number, date, or limit from the input. Attribute each claim to the source that makes it. Keep "reportedly", "says", and "estimates" when the source uses them. Keep official levels and categories exactly as the source gives them: warning, watch, or advisory; mean or median; preprint or journal article.

Stop when the input runs out. State a cause, consequence, or significance only when the input states it, and attribute it. Do not end with a sentence about what something signals, underscores, highlights, reflects, represents, marks, or means, and do not end on a maxim or a quip.

Do not describe your process or your inputs. Do not mention candidates, feeds, scores, captures, fetches, paywalls, blocked pages, prompts, templates, or items you left out. Do not grade the source. Do not call your own text honest, plain, factual, or balanced.

Write plain sentences of varied length. Use no em dashes, exclamation marks, or rhetorical questions. State a claim directly instead of setting it against a claim nobody made. List three things only when there are three. Avoid these words: significant, notable, pivotal, landscape, amid, delve, underscore, showcase, leverage, seamless, robust, powerful, genuinely, actually.

Write dates as dates. Do not write today, yesterday, tomorrow, this week, or recently in text that stays published.

Put only exact words from the input in quotation marks, with their speaker. Everything else is your summary. Never invent a quotation, source, link, number, or first-person experience.

Length limits are maximums. Write less when the input supports less. When a field has a character limit, write a complete sentence that fits it.

When a field names a language, write only that language. Keep names, product names, and units unchanged in translation.
```
<!-- hraness-generation-style:v1:end -->

## Addenda by form

Add the one that matches your output after the block.

**News summary and ranking rationale.** The title states the event in plain words; the summary gives who, what, where, when, and the source in two or three sentences. A published rationale is one sentence about consequences beyond the story, taken from the input. It never mentions the candidates, duplicates, scores, rankings, or comments that produced it.

**Alert or advisory brief.** Restate only the signals listed in the input, each with its issuing source, level, and time. Never raise or lower a level, never merge separate advisories, and never say conditions are calm, normal, or safe. When the input has no active signals, say that no active alerts were listed and when the list was checked.

**Digest or gist.** The first sentence is 155 characters or fewer, names the source and its central finding, and works as the page description. Define each technical term at first use. An attribution names the speaker and role without paraphrasing the quote.

**Writing about a real person.** Every evaluative claim about a named person needs a named source that makes the evaluation. Do not assign scores or archetypes. End on the last supported fact, and do not use a stock closing heading.

**Reply to a person.** Match the length and register of the conversation. Use no Markdown, and no greeting or sign-off the sender does not use. Do not write “Happy to help” or offer more help. Follow the product's disclosure rule.

**Support or credits sentence.** Write “Optional: {value proposition}” and the returned links, nothing else.

**Report to the user at closeout.** Say what changed, what was checked, and what remains unverified, in the user's words. Do not use repository proof vocabulary.

**Alt text and captions.** Follow the captions section of `STYLE.md`.
