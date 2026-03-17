/// Twister — Retro Mac UI Proof of Concept
///
/// A 1-bit monochrome hardware configuration TUI inspired by
/// Macintosh System 1 (1984). No colour other than Black / White.
/// Visual hierarchy is achieved exclusively through Unicode shading
/// characters (░ ▒ ▓) and geometric ASCII art.
use std::{
    io,
    time::{Duration, Instant},
};

use crossterm::{
    event::{self, DisableMouseCapture, EnableMouseCapture, Event, KeyCode, KeyEventKind},
    execute,
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Alignment, Constraint, Direction, Layout, Rect},
    style::{Color, Style},
    text::{Line, Span, Text},
    widgets::{Block, BorderType, Borders, Clear, Paragraph},
    Frame, Terminal,
};

// ─── Palette ──────────────────────────────────────────────────────────────────

const INK: Color = Color::Black;
const PAPER: Color = Color::White;

fn normal() -> Style {
    Style::default().fg(INK).bg(PAPER)
}
fn inverted() -> Style {
    Style::default().fg(PAPER).bg(INK)
}
fn dither_style() -> Style {
    // Used on shadow / dithered surfaces — drawn as black-on-black glyph rows
    Style::default().fg(INK).bg(INK)
}

// ─── Data model ───────────────────────────────────────────────────────────────

/// Represents every capability a pointing device can expose to the system.
#[derive(Debug, Clone)]
struct DeviceCapabilities {
    // Universal five-button baseline
    left_click: bool,
    right_click: bool,
    middle_click: bool,
    forward: bool,
    back: bool,
    // Overflow macro buttons (anything beyond the baseline five)
    secondary_macros: Vec<bool>,
    // Metadata
    device_name: String,
    macro_names: Vec<String>,
}

impl DeviceCapabilities {
    fn demo() -> Self {
        Self {
            left_click: true,
            right_click: false,
            middle_click: true,
            forward: false,
            back: true,
            secondary_macros: vec![
                true, false, true, true, false, false, true, false, true, false, false, true,
            ],
            device_name: String::from("Twister MX-900"),
            macro_names: vec![
                "DPI-",
                "DPI+",
                "Sniper",
                "Profile",
                "Macro 1",
                "Macro 2",
                "Macro 3",
                "Macro 4",
                "Scroll L",
                "Scroll R",
                "Tilt L",
                "Tilt R",
            ]
            .into_iter()
            .map(String::from)
            .collect(),
        }
    }

    /// Cycle a button state for demo purposes
    fn toggle_left(&mut self) {
        self.left_click = !self.left_click;
    }
    fn toggle_right(&mut self) {
        self.right_click = !self.right_click;
    }
    fn toggle_middle(&mut self) {
        self.middle_click = !self.middle_click;
    }
    fn toggle_forward(&mut self) {
        self.forward = !self.forward;
    }
    fn toggle_back(&mut self) {
        self.back = !self.back;
    }
    fn toggle_macro(&mut self, idx: usize) {
        if let Some(v) = self.secondary_macros.get_mut(idx) {
            *v = !*v;
        }
    }
}

// ─── App state ────────────────────────────────────────────────────────────────

struct App {
    caps: DeviceCapabilities,
    tick: u64,
    selected_macro: usize,
    quit: bool,
}

impl App {
    fn new() -> Self {
        Self {
            caps: DeviceCapabilities::demo(),
            tick: 0,
            selected_macro: 0,
            quit: false,
        }
    }

    fn on_tick(&mut self) {
        self.tick = self.tick.wrapping_add(1);
    }

    fn handle_key(&mut self, code: KeyCode) {
        match code {
            KeyCode::Char('q') | KeyCode::Esc => self.quit = true,
            KeyCode::Char('1') => self.caps.toggle_left(),
            KeyCode::Char('2') => self.caps.toggle_right(),
            KeyCode::Char('3') => self.caps.toggle_middle(),
            KeyCode::Char('4') => self.caps.toggle_forward(),
            KeyCode::Char('5') => self.caps.toggle_back(),
            KeyCode::Char('h') | KeyCode::Left => {
                if self.selected_macro > 0 {
                    self.selected_macro -= 1;
                }
            }
            KeyCode::Char('l') | KeyCode::Right => {
                let max = self.caps.secondary_macros.len().saturating_sub(1);
                if self.selected_macro < max {
                    self.selected_macro += 1;
                }
            }
            KeyCode::Enter | KeyCode::Char(' ') => {
                let idx = self.selected_macro;
                self.caps.toggle_macro(idx);
            }
            _ => {}
        }
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/// Renders a classic Mac OS–style title bar pattern:
///   ════════════╡ TITLE ╞════════════
/// The parallel lines are simulated with repeated '─' and the title is centred
/// inside a recessed label block.
fn mac_title_bar(title: &str) -> Line<'static> {
    let title_with_padding = format!("╡ {} ╞", title);
    // We can't know width at this point; ratatui will centre it via Alignment
    Line::from(Span::styled(title_with_padding, inverted()))
}

/// Builds a horizontal dithered separator line of a given character-width
/// using alternating shading glyphs to simulate a halftone rule.
fn dither_line(width: u16) -> String {
    let pattern = ['░', '▒', '░', '▒', '░'];
    (0..width as usize)
        .map(|i| pattern[i % pattern.len()])
        .collect()
}

/// Generates the ASCII art mouse widget lines.
/// Zones for the five universal buttons are annotated inline.
/// Active state → region filled with ▓ (1-bit inversion via dense stipple).
fn mouse_art_lines(caps: &DeviceCapabilities) -> Vec<Line<'static>> {
    // Each glyph that represents an active zone uses the inverted style when
    // the corresponding capability is true; otherwise it uses normal style.

    let lc = if caps.left_click { inverted() } else { normal() };
    let rc = if caps.right_click { inverted() } else { normal() };
    let mc = if caps.middle_click { inverted() } else { normal() };
    let fw = if caps.forward { inverted() } else { normal() };
    let bk = if caps.back { inverted() } else { normal() };
    let n = normal();

    // Active zone glyphs — swap between outline and dense fill
    let lc_top = if caps.left_click { "▓▓▓▓▓" } else { "     " };
    let rc_top = if caps.right_click { "▓▓▓▓▓" } else { "     " };
    let mc_mid = if caps.middle_click { "▓▓▓" } else { "   " };
    let fw_glyph = if caps.forward { "▓▓▓▓" } else { "    " };
    let bk_glyph = if caps.back { "▓▓▓▓" } else { "    " };

    vec![
        // Top cable
        Line::from(vec![
            Span::styled("         ┌──┐         ", n),
        ]),
        Line::from(vec![
            Span::styled("         │  │         ", n),
        ]),
        // Top of mouse body — left / right button tops
        Line::from(vec![
            Span::styled("  ╔══════╧══╧══════╗  ", n),
        ]),
        // Left-click / right-click top region
        Line::from(vec![
            Span::styled("  ║ ", n),
            Span::styled(lc_top, lc),
            Span::styled("│", n),
            Span::styled(mc_mid, mc),
            Span::styled("│", n),
            Span::styled(rc_top, rc),
            Span::styled(" ║  ", n),
        ]),
        Line::from(vec![
            Span::styled("  ║ LClick │SCL│RClick ║  ", n),
        ]),
        Line::from(vec![
            Span::styled("  ║       ═╪═══╪═      ║  ", n),
        ]),
        // Side buttons — Forward (top side) / Back (bottom side)
        Line::from(vec![
            Span::styled("◄─", bk),
            Span::styled(bk_glyph, bk),
            Span::styled("║               ║", n),
            Span::styled(fw_glyph, fw),
            Span::styled("─►", fw),
        ]),
        Line::from(vec![
            Span::styled("  ║  Back   │   │  Fwd  ║  ", n),
        ]),
        Line::from(vec![
            Span::styled("  ║               ║  ", n),
        ]),
        // Lower body / grip
        Line::from(vec![
            Span::styled("  ║               ║  ", n),
        ]),
        Line::from(vec![
            Span::styled("  ╚═══════════════╝  ", n),
        ]),
        // Shadow (dithered drop shadow below)
        Line::from(vec![
            Span::styled("   ░░░░░░░░░░░░░░░░░ ", Style::default().fg(INK).bg(PAPER)),
        ]),
        Line::from(vec![
            Span::styled("    ░░░░░░░░░░░░░░░  ", Style::default().fg(INK).bg(PAPER)),
        ]),
    ]
}

/// Legend lines shown beneath the mouse art.
fn legend_lines(caps: &DeviceCapabilities) -> Vec<Line<'static>> {
    fn bullet(active: bool, label: &str) -> Line<'static> {
        let (glyph, style) = if active {
            ("▓", inverted())
        } else {
            ("░", normal())
        };
        Line::from(vec![
            Span::styled(format!(" {} ", glyph), style),
            Span::styled(format!("{:<12}", label), normal()),
        ])
    }

    vec![
        Line::from(Span::styled(
            "─── Active Buttons ────────",
            normal(),
        )),
        bullet(caps.left_click, "Left Click  [1]"),
        bullet(caps.right_click, "Right Click [2]"),
        bullet(caps.middle_click, "Mid Click   [3]"),
        bullet(caps.forward, "Forward     [4]"),
        bullet(caps.back, "Back        [5]"),
    ]
}

// ─── Macro grid ───────────────────────────────────────────────────────────────

/// Each macro cell is rendered as a bordered Block.
/// Active  → filled with ▓ and inverted colours.
/// Inactive → filled with spaces, normal colours.
/// Selected → indicated with a double-border.
fn render_macro_grid(
    f: &mut Frame,
    area: Rect,
    caps: &DeviceCapabilities,
    selected: usize,
) {
    if caps.secondary_macros.is_empty() {
        return;
    }

    // Determine how many columns fit.  Each cell needs at least 12 cols wide.
    let cell_w: u16 = 14;
    let cell_h: u16 = 4;
    let cols = ((area.width) / cell_w).max(1) as usize;
    let count = caps.secondary_macros.len();
    let rows = (count + cols - 1) / cols;

    // Build row constraints
    let row_constraints: Vec<Constraint> = (0..rows).map(|_| Constraint::Length(cell_h)).collect();
    let row_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints(row_constraints)
        .split(area);

    for row in 0..rows {
        let start = row * cols;
        let end = (start + cols).min(count);
        let items_in_row = end - start;

        // Build column constraints — pad remainder with Min(0)
        let mut col_constraints: Vec<Constraint> = (0..items_in_row)
            .map(|_| Constraint::Length(cell_w))
            .collect();
        col_constraints.push(Constraint::Min(0)); // fill remainder

        let col_chunks = Layout::default()
            .direction(Direction::Horizontal)
            .constraints(col_constraints)
            .split(row_chunks[row]);

        for col in 0..items_in_row {
            let macro_idx = start + col;
            let active = caps.secondary_macros[macro_idx];
            let is_selected = macro_idx == selected;

            let (cell_style, inner_style, fill_char) = if active {
                (inverted(), inverted(), "▓")
            } else {
                (normal(), normal(), " ")
            };

            let border_type = if is_selected {
                BorderType::Double
            } else {
                BorderType::Plain
            };

            let label = caps
                .macro_names
                .get(macro_idx)
                .map(|s| s.as_str())
                .unwrap_or("???");

            // Fill inner area with stipple or space
            let inner_fill: String = fill_char.repeat(cell_w.saturating_sub(2) as usize);
            let inner_lines = vec![
                Line::from(Span::styled(inner_fill.clone(), inner_style)),
                Line::from(vec![
                    Span::styled(
                        format!("{:^width$}", label, width = cell_w.saturating_sub(2) as usize),
                        if is_selected { inverted() } else { inner_style },
                    ),
                ]),
            ];

            let block = Block::default()
                .borders(Borders::ALL)
                .border_type(border_type)
                .border_style(cell_style)
                .style(cell_style);

            let para = Paragraph::new(Text::from(inner_lines))
                .block(block)
                .alignment(Alignment::Center);

            f.render_widget(para, col_chunks[col]);
        }
    }
}

// ─── Status bar ───────────────────────────────────────────────────────────────

fn render_status_bar(f: &mut Frame, area: Rect, app: &App) {
    let active_count = app
        .caps
        .secondary_macros
        .iter()
        .filter(|&&v| v)
        .count();

    let text = format!(
        " {} │ Macros: {}/{} active │ [1-5] toggle base │ [←→] select │ [⏎] toggle │ [q] quit ",
        app.caps.device_name,
        active_count,
        app.caps.secondary_macros.len(),
    );

    let bar = Paragraph::new(text)
        .style(inverted())
        .alignment(Alignment::Left);

    f.render_widget(bar, area);
}

// ─── Desktop / chrome ─────────────────────────────────────────────────────────

/// Renders the classic Mac desktop pattern — a fine ░ dither fill.
fn render_desktop(f: &mut Frame, area: Rect) {
    let row: String = "░".repeat(area.width as usize);
    let lines: Vec<Line> = (0..area.height)
        .map(|_| Line::from(Span::styled(row.clone(), dither_style())))
        .collect();
    let bg = Paragraph::new(Text::from(lines));
    f.render_widget(bg, area);
}

/// Draws a drop-shadow under a window rectangle using ▒ on the desktop.
fn render_shadow(f: &mut Frame, win: Rect) {
    // Shadow offset: 1 col right, 1 row down
    if win.y + win.height >= f.area().height {
        return;
    }
    let shadow_area = Rect {
        x: win.x + 2,
        y: win.y + 1,
        width: win.width.min(f.area().width.saturating_sub(win.x + 2)),
        height: win.height.min(f.area().height.saturating_sub(win.y + 1)),
    };
    let row: String = "▒".repeat(shadow_area.width as usize);
    let lines: Vec<Line> = (0..shadow_area.height)
        .map(|_| Line::from(Span::styled(row.clone(), Style::default().fg(INK).bg(INK))))
        .collect();
    let shadow = Paragraph::new(Text::from(lines));
    f.render_widget(shadow, shadow_area);
}

// ─── Main render ──────────────────────────────────────────────────────────────

fn render(f: &mut Frame, app: &App) {
    let full = f.area();

    // 1. Desktop background
    render_desktop(f, full);

    // 2. Reserve bottom row for status bar
    let [main_area, status_area] = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(0), Constraint::Length(1)])
        .areas(full);

    // 3. Split main area: left = mouse window, right = macro grid window
    //    The two windows are sized like overlapping Mac dialog boxes.
    let [left_area, right_area] = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(42), Constraint::Min(20)])
        .areas(main_area);

    // Inset windows slightly to simulate floating on the desktop
    let mouse_win = Rect {
        x: left_area.x + 1,
        y: left_area.y + 1,
        width: left_area.width.saturating_sub(2),
        height: left_area.height.saturating_sub(2),
    };
    let macro_win = Rect {
        x: right_area.x + 1,
        y: right_area.y + 1,
        width: right_area.width.saturating_sub(2),
        height: right_area.height.saturating_sub(2),
    };

    // 4. Drop shadows (drawn before window so window sits on top)
    render_shadow(f, mouse_win);
    render_shadow(f, macro_win);

    // ── Mouse Window ──────────────────────────────────────────────────────────

    // Clear the window area from desktop texture
    f.render_widget(Clear, mouse_win);

    let mouse_block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Thick)
        .border_style(normal())
        .style(normal())
        .title(mac_title_bar("DEVICE VIEW"))
        .title_alignment(Alignment::Center);

    f.render_widget(mouse_block.clone(), mouse_win);

    let mouse_inner = mouse_block.inner(mouse_win);

    // Split inner: top = ASCII mouse art, bottom = legend
    let [art_area, legend_area] = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(13), Constraint::Length(7)])
        .areas(mouse_inner);

    // Mouse ASCII art
    let art_lines = mouse_art_lines(&app.caps);
    let art_para = Paragraph::new(Text::from(art_lines))
        .style(normal())
        .alignment(Alignment::Center);
    f.render_widget(art_para, art_area);

    // Dithered rule between art and legend
    let rule_str = dither_line(art_area.width);
    let rule = Paragraph::new(Span::styled(rule_str, normal()));
    f.render_widget(
        rule,
        Rect {
            x: mouse_inner.x,
            y: legend_area.y.saturating_sub(1),
            width: mouse_inner.width,
            height: 1,
        },
    );

    // Legend
    let legend_lines = legend_lines(&app.caps);
    let legend_para = Paragraph::new(Text::from(legend_lines)).style(normal());
    f.render_widget(legend_para, legend_area);

    // ── Macro Grid Window ─────────────────────────────────────────────────────

    f.render_widget(Clear, macro_win);

    let macro_block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Thick)
        .border_style(normal())
        .style(normal())
        .title(mac_title_bar("OVERFLOW MACRO MATRIX"))
        .title_alignment(Alignment::Center);

    f.render_widget(macro_block.clone(), macro_win);

    let macro_inner = macro_block.inner(macro_win);

    // Sub-split: header row + grid body
    let [header_area, grid_area] = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Length(3), Constraint::Min(0)])
        .areas(macro_inner);

    // Header with device info and dither rule
    let header_text = vec![
        Line::from(vec![
            Span::styled(" Extended Capability Register ", inverted()),
        ]),
        Line::from(Span::styled(dither_line(header_area.width), normal())),
    ];
    let header = Paragraph::new(Text::from(header_text))
        .style(normal())
        .alignment(Alignment::Center);
    f.render_widget(header, header_area);

    // Macro grid
    render_macro_grid(f, grid_area, &app.caps, app.selected_macro);

    // 5. Status bar
    render_status_bar(f, status_area, app);
}

// ─── Entry point ──────────────────────────────────────────────────────────────

fn main() -> io::Result<()> {
    // Terminal setup
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen, EnableMouseCapture)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut app = App::new();
    let tick_rate = Duration::from_millis(100);
    let mut last_tick = Instant::now();

    loop {
        terminal.draw(|f| render(f, &app))?;

        let timeout = tick_rate.saturating_sub(last_tick.elapsed());
        if event::poll(timeout)? {
            if let Event::Key(key) = event::read()? {
                if key.kind == KeyEventKind::Press {
                    app.handle_key(key.code);
                }
            }
        }

        if last_tick.elapsed() >= tick_rate {
            app.on_tick();
            last_tick = Instant::now();
        }

        if app.quit {
            break;
        }
    }

    // Restore terminal
    disable_raw_mode()?;
    execute!(
        terminal.backend_mut(),
        LeaveAlternateScreen,
        DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    Ok(())
}
