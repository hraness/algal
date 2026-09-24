use algal_surface_renderers::{FIXTURE, MAX_BYTES, parse_view, tui_adapter::render};
use crossterm::event::{self, Event, KeyCode, KeyEventKind};
use ratatui::{Terminal, backend::TestBackend, layout::Margin};
use std::io::Read;

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let mut args = std::env::args().skip(1);
    let snapshot = match args.next().as_deref() {
        None => false,
        Some("--snapshot") => true,
        _ => return Err("usage: surface-tui [--snapshot] [view.json]".into()),
    };
    let input = if let Some(path) = args.next() {
        let mut text = String::new();
        std::fs::File::open(path)?
            .take((MAX_BYTES + 1) as u64)
            .read_to_string(&mut text)?;
        text
    } else {
        FIXTURE.to_owned()
    };
    if args.next().is_some() {
        return Err("unexpected argument".into());
    }
    let tree = parse_view(&input)?;
    if snapshot {
        let mut terminal = Terminal::new(TestBackend::new(88, 30))?;
        terminal.draw(|frame| render(frame, frame.area().inner(Margin::new(2, 1)), &tree))?;
        for y in 0..30 {
            let row: String = (0..88)
                .map(|x| terminal.backend().buffer()[(x, y)].symbol())
                .collect();
            println!("{}", row.trim_end());
        }
        return Ok(());
    }
    let mut terminal = ratatui::init();
    let result = (|| -> Result<(), Box<dyn std::error::Error>> {
        loop {
            terminal.draw(|frame| render(frame, frame.area().inner(Margin::new(2, 1)), &tree))?;
            if let Event::Key(key) = event::read()?
                && key.kind == KeyEventKind::Press
                && matches!(key.code, KeyCode::Char('q') | KeyCode::Esc)
            {
                break;
            }
        }
        Ok(())
    })();
    ratatui::restore();
    result
}
