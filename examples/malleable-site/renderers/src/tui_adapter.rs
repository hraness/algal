use crate::{Layout as SurfaceLayout, Role, SurfaceNode};
use ratatui::{
    Frame,
    layout::Rect,
    style::{Color, Modifier, Style},
    widgets::{Paragraph, Wrap},
};

/// A terminal renders the same semantics with terminal layout and text styles.
/// A link stays a labelled destination; this adapter never launches a browser.
pub fn render(frame: &mut Frame, area: Rect, node: &SurfaceNode) {
    match node {
        SurfaceNode::Stack {
            layout, children, ..
        } => {
            let split = *layout == SurfaceLayout::Split && area.width >= 64;
            let mut index = 0;
            let mut y = area.y;
            while index < children.len() && y < area.bottom() {
                let child = &children[index];
                let pair = split
                    && matches!(
                        child,
                        SurfaceNode::Text {
                            role: Role::Body,
                            ..
                        }
                    )
                    && matches!(children.get(index + 1), Some(SurfaceNode::Link { .. }));
                let width = if pair { area.width / 2 } else { area.width };
                let next = children.get(index + 1);
                let h = if pair {
                    height(child, width).max(height(next.unwrap(), width))
                } else {
                    height(child, width)
                };
                let h = h.min(area.bottom() - y);
                render(frame, Rect::new(area.x, y, width, h), child);
                if pair {
                    render(
                        frame,
                        Rect::new(area.x + width + 1, y, area.width - width - 1, h),
                        next.unwrap(),
                    );
                }
                y = y.saturating_add(h).saturating_add(1);
                index += if pair { 2 } else { 1 };
            }
        }
        SurfaceNode::Text { role, text, .. } => {
            let style = match role {
                Role::Heading => Style::default()
                    .fg(Color::White)
                    .add_modifier(Modifier::BOLD),
                Role::Eyebrow => Style::default().fg(Color::LightGreen),
                Role::Body => Style::default().fg(Color::Gray),
                Role::Status => Style::default().fg(Color::DarkGray),
            };
            frame.render_widget(
                Paragraph::new(text.as_str())
                    .style(style)
                    .wrap(Wrap { trim: false }),
                area,
            );
        }
        SurfaceNode::Link { label, href, .. } => frame.render_widget(
            Paragraph::new(format!("{label} → {href}"))
                .style(
                    Style::default()
                        .fg(Color::LightGreen)
                        .add_modifier(Modifier::UNDERLINED),
                )
                .wrap(Wrap { trim: false }),
            area,
        ),
    }
}

fn height(node: &SurfaceNode, width: u16) -> u16 {
    match node {
        SurfaceNode::Stack {
            layout, children, ..
        } => {
            let width = if *layout == SurfaceLayout::Split && width >= 64 {
                width / 2
            } else {
                width
            };
            children
                .iter()
                .map(|c| height(c, width).saturating_add(1))
                .sum()
        }
        SurfaceNode::Text { text, .. } => Paragraph::new(text.as_str())
            .wrap(Wrap { trim: false })
            .line_count(width) as u16,
        SurfaceNode::Link { label, href, .. } => Paragraph::new(format!("{label} → {href}"))
            .wrap(Wrap { trim: false })
            .line_count(width) as u16,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{FIXTURE, parse_view};
    use ratatui::{Terminal, backend::TestBackend};

    pub fn snapshot(width: u16, height: u16) -> String {
        let mut terminal = Terminal::new(TestBackend::new(width, height)).unwrap();
        let tree = parse_view(FIXTURE).unwrap();
        terminal
            .draw(|frame| render(frame, frame.area(), &tree))
            .unwrap();
        let buffer = terminal.backend().buffer();
        (0..height)
            .map(|y| {
                (0..width)
                    .map(|x| buffer[(x, y)].symbol())
                    .collect::<String>()
            })
            .collect::<Vec<_>>()
            .join("\n")
    }

    #[test]
    fn renders_fixture_in_wide_and_narrow_terminal_buffers() {
        for width in [36, 100] {
            let output = snapshot(width, 40);
            assert!(output.contains("Software that can grow with you."));
            assert!(output.contains("Explore ALGAL"));
            assert!(output.contains("/docs/"));
            assert!(!output.contains("\u{1b}"));
        }
    }
}
