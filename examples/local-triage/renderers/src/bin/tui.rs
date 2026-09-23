use algal_triage_renderers::{Model, Options, Result};
use crossterm::event::{self, Event, KeyCode, KeyEventKind, KeyModifiers};
use ratatui::{
    Terminal,
    backend::TestBackend,
    layout::{Constraint, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Paragraph, Wrap},
};
use serde_json::json;

#[derive(Clone, Copy, PartialEq)]
enum Mode {
    Navigate,
    Title,
    Category,
    Query,
    Path,
    Fork,
}
fn text_field(model: &mut Model, mode: Mode) -> Option<(&mut String, usize)> {
    match mode {
        Mode::Title => Some((&mut model.session.draft.title, 120)),
        Mode::Category => Some((&mut model.session.draft.category, 24)),
        Mode::Query => Some((&mut model.session.query, 120)),
        Mode::Path => Some((&mut model.path, 1024)),
        Mode::Fork => Some((&mut model.fork_name, 48)),
        _ => None,
    }
}
fn attempt(model: &mut Model, action: impl FnOnce(&mut Model) -> Result<()>) {
    if let Err(e) = action(model) {
        model.message = e;
    }
}
fn render(frame: &mut ratatui::Frame, model: &Model, selected: usize, mode: Mode) {
    let outer = Layout::vertical([
        Constraint::Length(4),
        Constraint::Min(12),
        Constraint::Length(4),
        Constraint::Length(6),
    ])
    .split(frame.area());
    frame.render_widget(
        Paragraph::new(vec![
            Line::from(Span::styled(
                "ALGAL / LOCAL TRIAGE",
                Style::default()
                    .fg(Color::LightGreen)
                    .add_modifier(Modifier::BOLD),
            )),
            Line::from(format!(
                "{} · schema v{} · {} task slots / {} changes remaining",
                model.capture.application,
                model.capture.definition.schema_version,
                model.capture.capacity.tasks,
                model.capture.capacity.states
            )),
            Line::from(format!(
                "Filter: {} | Search: {} | {}",
                model.session.filter, model.session.query, model.capture.view.ordering
            )),
        ]),
        outer[0],
    );
    let columns = Layout::horizontal([Constraint::Percentage(60), Constraint::Percentage(40)])
        .split(outer[1]);
    let rows = model.rows();
    let visible_rows = columns[0].height.saturating_sub(2) as usize;
    let start = selected.saturating_sub(visible_rows.saturating_sub(1));
    let mut lines = Vec::new();
    for (index, row) in rows.iter().enumerate().skip(start).take(visible_rows) {
        let line = format!(
            "{} {} {:6} {}",
            if index == selected { "›" } else { " " },
            if row.task.status == "done" {
                "[x]"
            } else {
                "[ ]"
            },
            row.task.priority,
            row.task.title
        );
        lines.push(Line::styled(
            line,
            if index == selected {
                Style::default()
                    .fg(Color::LightGreen)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            },
        ));
    }
    if lines.is_empty() {
        lines.push(Line::from("No matching tasks. Press n to add one."));
    }
    frame.render_widget(
        Paragraph::new(lines).block(
            Block::default()
                .borders(Borders::ALL)
                .title(" Tasks · ↑/↓ select · space complete/reopen "),
        ),
        columns[0],
    );
    let d = &model.session.draft;
    let marker = |target| if mode == target { "› " } else { "  " };
    let editor = vec![
        Line::from(if d.task_id.is_some() {
            "Editing a retained task"
        } else {
            "New session draft"
        }),
        Line::from(""),
        Line::from(format!("{}Title: {}", marker(Mode::Title), d.title)),
        Line::from(format!("  Priority: {} [p]", d.priority)),
        Line::from(format!(
            "{}Category: {} [c]",
            marker(Mode::Category),
            d.category
        )),
        Line::from(""),
        Line::from(if model.stale {
            "STALE · refresh, inspect, then r to rebase"
        } else if model.dirty {
            "Unsaved · Ctrl-S saves the draft"
        } else {
            "Saved local draft"
        }),
        Line::from("Enter submits while editing title/category"),
        Line::from(""),
        Line::from(format!(
            "Policy: {} / {}",
            model.policy.sort, model.policy.group
        )),
        Line::from(format!(
            "Schema: v{} | reopen: {}",
            model.schema_version, model.policy.allow_reopen
        )),
        Line::from("S sort · G group · V schema · R reopen"),
        Line::from("v evaluate preview · a adopt"),
        Line::from(
            model
                .preview
                .as_ref()
                .map(|p| {
                    format!(
                        "Candidate: {}",
                        if p.evaluation.accepted {
                            "accepted; explicit adoption required"
                        } else {
                            "rejected"
                        }
                    )
                })
                .unwrap_or_default(),
        ),
    ];
    frame.render_widget(
        Paragraph::new(editor).wrap(Wrap { trim: false }).block(
            Block::default()
                .borders(Borders::ALL)
                .title(" Draft & workflow "),
        ),
        columns[1],
    );
    frame.render_widget(
        Paragraph::new(vec![
            Line::from(format!(
                "{}JSON path: {} [d]",
                marker(Mode::Path),
                model.path
            )),
            Line::from(format!(
                "{}Fork identity: {} [B]",
                marker(Mode::Fork),
                model.fork_name
            )),
            Line::from("x export · o verify/import · b fork · i import/evaluate model proposal"),
        ])
        .block(Block::default().borders(Borders::TOP)),
        outer[2],
    );
    frame.render_widget(
        Paragraph::new(vec![
            Line::styled(
                &model.message,
                Style::default().fg(if model.stale {
                    Color::Yellow
                } else {
                    Color::Gray
                }),
            ),
            Line::from(""),
            Line::from(
                "n new · e edit · t title · p priority · c category · f filter · / search · w why",
            ),
            Line::from(
                "Ctrl-S save draft · Ctrl-R refresh · r rebase · L discard unsaved/load saved",
            ),
            Line::from("Esc navigation · q save and quit · Ctrl-Q quit preserving saved draft"),
        ])
        .wrap(Wrap { trim: false }),
        outer[3],
    );
}
fn cycle(value: &mut String, choices: &[&str]) {
    let index = choices.iter().position(|v| *v == value).unwrap_or(0);
    *value = choices[(index + 1) % choices.len()].into();
}
fn main() -> std::result::Result<(), Box<dyn std::error::Error>> {
    let options = Options::parse()?;
    let snapshot = options.snapshot;
    let mut model = Model::open(options)?;
    if snapshot {
        let mut terminal = Terminal::new(TestBackend::new(110, 34))?;
        terminal.draw(|f| render(f, &model, 0, Mode::Navigate))?;
        for y in 0..34 {
            let row: String = (0..110)
                .map(|x| terminal.backend().buffer()[(x, y)].symbol())
                .collect();
            println!("{}", row.trim_end());
        }
        return Ok(());
    }
    let mut terminal = ratatui::init();
    let mut selected = 0;
    let mut mode = Mode::Navigate;
    let result = (|| -> std::result::Result<(), Box<dyn std::error::Error>> {
        loop {
            selected = selected.min(model.rows().len().saturating_sub(1));
            terminal.draw(|f| render(f, &model, selected, mode))?;
            if let Event::Key(key) = event::read()? {
                if key.kind != KeyEventKind::Press {
                    continue;
                }
                if key.modifiers.contains(KeyModifiers::CONTROL) {
                    match key.code {
                        KeyCode::Char('q') => break,
                        KeyCode::Char('s') => attempt(&mut model, |m| m.save(false)),
                        KeyCode::Char('r') => attempt(&mut model, Model::refresh),
                        _ => {}
                    }
                    continue;
                }
                if key.code == KeyCode::Esc {
                    mode = Mode::Navigate;
                    continue;
                }
                if mode != Mode::Navigate {
                    if key.code == KeyCode::Enter {
                        match mode {
                            Mode::Query => attempt(&mut model, Model::refresh),
                            Mode::Title | Mode::Category => attempt(&mut model, Model::submit),
                            _ => {}
                        }
                        mode = Mode::Navigate;
                        continue;
                    }
                    if let Some((field, max)) = text_field(&mut model, mode) {
                        match key.code {
                            KeyCode::Char(c)
                                if field.encode_utf16().count() + c.len_utf16() <= max
                                    && !c.is_control() =>
                            {
                                field.push(c);
                                model.dirty = true;
                            }
                            KeyCode::Backspace => {
                                field.pop();
                                model.dirty = true;
                            }
                            _ => {}
                        }
                    }
                    continue;
                }
                match key.code {
                    KeyCode::Char('q') => match model.save(false) {
                        Ok(()) => break,
                        Err(e) => model.message = e,
                    },
                    KeyCode::Down | KeyCode::Char('j') => {
                        selected = (selected + 1).min(model.rows().len().saturating_sub(1))
                    }
                    KeyCode::Up | KeyCode::Char('k') => selected = selected.saturating_sub(1),
                    KeyCode::Char('n') => {
                        model.new_draft();
                        mode = Mode::Title;
                    }
                    KeyCode::Char('t') => mode = Mode::Title,
                    KeyCode::Char('e') => {
                        if let Some(row) = model.rows().get(selected) {
                            model.edit(&row.task);
                            mode = Mode::Title;
                        }
                    }
                    KeyCode::Char('p') => {
                        cycle(
                            &mut model.session.draft.priority,
                            &["high", "normal", "low"],
                        );
                        model.dirty = true;
                    }
                    KeyCode::Char('c') => {
                        if model.capture.definition.schema_version == 2 {
                            mode = Mode::Category;
                        } else {
                            model.message =
                                "Preview and adopt schema v2 to edit categories.".into();
                        }
                    }
                    KeyCode::Char('/') => mode = Mode::Query,
                    KeyCode::Char('d') => mode = Mode::Path,
                    KeyCode::Char('B') => mode = Mode::Fork,
                    KeyCode::Char('f') => {
                        let mut filter = model.session.filter.clone();
                        cycle(&mut filter, &["all", "open", "done"]);
                        attempt(&mut model, |m| m.filter(&filter));
                    }
                    KeyCode::Char(' ') => {
                        if let Some(row) = model.rows().get(selected) {
                            let action = if row.task.status == "open" {
                                "complete"
                            } else {
                                "reopen"
                            };
                            if row.actions.iter().any(|a| a.kind == action && a.enabled) {
                                let id = row.task.id.clone();
                                attempt(&mut model, |m| {
                                    m.action(json!({"kind":action,"taskId":id}))?;
                                    m.refresh()
                                });
                            } else {
                                model.message = "Action disabled by captured workflow.".into();
                            }
                        }
                    }
                    KeyCode::Char('w') => {
                        if let Some(row) = model.rows().get(selected) {
                            model.message = model
                                .capture
                                .why
                                .iter()
                                .find(|w| w.task_id == row.task.id)
                                .map(|w| w.reason.clone())
                                .unwrap_or_else(|| model.capture.view.ordering.clone());
                        }
                    }
                    KeyCode::Char('r') => attempt(&mut model, |m| m.save(true)),
                    KeyCode::Char('L') => attempt(&mut model, Model::reload_draft),
                    KeyCode::Char('S') => {
                        cycle(&mut model.policy.sort, &["priority", "title", "created"])
                    }
                    KeyCode::Char('G') => cycle(
                        &mut model.policy.group,
                        &["none", "status", "priority", "category"],
                    ),
                    KeyCode::Char('V') => {
                        model.schema_version = if model.schema_version == 1 { 2 } else { 1 }
                    }
                    KeyCode::Char('R') => model.policy.allow_reopen = !model.policy.allow_reopen,
                    KeyCode::Char('v') => attempt(&mut model, Model::evaluate),
                    KeyCode::Char('a') => attempt(&mut model, Model::adopt),
                    KeyCode::Char('x') => attempt(&mut model, Model::export),
                    KeyCode::Char('o') => attempt(&mut model, Model::import),
                    KeyCode::Char('b') => attempt(&mut model, Model::fork),
                    KeyCode::Char('i') => attempt(&mut model, Model::import_proposal),
                    _ => {}
                }
            }
        }
        Ok(())
    })();
    ratatui::restore();
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn terminal_uses_captured_projection_and_retains_stale_draft() {
        let mut capture = algal_triage_renderers::parse_capture(
            algal_triage_renderers::bounded_json(include_bytes!("../../fixture.json")).unwrap(),
        )
        .unwrap();
        // The host may retain completed facts while filtering their presentation.
        capture.view.groups.retain(|group| group.id == "open");
        let mut session = capture.session.clone();
        session.filter = "open".into();
        session.draft.title = "Unsubmitted draft".into();
        let model = Model {
            options: Options {
                host: "unused-host".into(),
                directory: "unused-state".into(),
                application: capture.application.clone(),
                snapshot: true,
            },
            policy: capture.definition.config.clone(),
            schema_version: capture.definition.schema_version,
            capture,
            session,
            session_ref: None,
            stale: true,
            dirty: true,
            message: "Inspect changes before rebasing".into(),
            preview: None,
            path: String::new(),
            fork_name: "experiment".into(),
        };
        let mut terminal = Terminal::new(TestBackend::new(110, 34)).unwrap();
        terminal
            .draw(|frame| render(frame, &model, 0, Mode::Title))
            .unwrap();
        let rendered = (0..34)
            .map(|y| {
                (0..110)
                    .map(|x| terminal.backend().buffer()[(x, y)].symbol())
                    .collect::<String>()
            })
            .collect::<Vec<_>>()
            .join("\n");
        assert!(rendered.contains("Review recorded proposal"));
        assert!(!rendered.contains("Keep the original evidence"));
        assert!(rendered.contains("Unsubmitted draft"));
        assert!(rendered.contains("STALE"));
        assert!(rendered.contains("30 task slots"));
    }
}
