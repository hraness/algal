---
title: "Introducing ALGAL"
order: 1
date: 2026-09-29
description: A language and VM where agent programs wait, resume, and compound into reusable skill.
eyebrow: Launch
cardDescription: "Agent programs that hold for your yes, survive a crash, and compound into reusable skill."
updated: 2026-10-05
---

# Introducing ALGAL

```lisp
(program quote ((order json)) json
  (with-total subtotal
    (* (get order quantity) (get order unit_price))
    (record subtotal subtotal
            shipping (if (>= subtotal 50) 0 5)
            total (+ subtotal (if (>= subtotal 50) 0 5)))))
```

ALGAL is a language and VM where a program is a value: it has a content-derived identity, a declared interface, and limits it cannot widen. Programs wait for your approval, resume after a crash, and leave receipts that replay offline. The ones that work are kept with their evidence and called by digest from larger programs, so each task starts further along than the last.

The built-in demo starts with a local approval task: inspect a proposed publication, approve or deny it, then replay its saved history.

{{LAUNCHFILM}}

{{LAUNCHBEATS}}

## Go deeper

- [Run the demo and read the report page](/docs/native-workbench/)
- [See a program run step by step](/tour/)
- [How a program waits days for an approval](/blog/programs-that-wait/)
- [What a run record holds and what replay checks](/blog/receipts-fossil-record/)
- [Install notes and platforms](/docs/native-release/)
- [How ALGAL compares with Temporal](/compare/temporal/)

The pictures in this post are illustrations drawn from a recorded run of `algal demo`, with long fields trimmed.
