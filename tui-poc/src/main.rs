use std::io;
use std::time::Duration;

use crossterm::event::{self, Event, KeyCode, KeyEventKind};
use crossterm::execute;
use crossterm::terminal::{
    EnterAlternateScreen, LeaveAlternateScreen, disable_raw_mode, enable_raw_mode,
};
use ratatui::backend::CrosstermBackend;
use ratatui::layout::{Constraint, Layout, Rect};
use ratatui::style::{Color, Style, Stylize};
use ratatui::text::{Line, Span};
use ratatui::widgets::{Block, BorderType, Borders, Paragraph, Widget, Wrap};
use ratatui::Terminal;

// ─── Portable data structures (backend-agnostic, reusable in egui) ───────────

/// A rectangular region in the ASCII art grid (row/col coordinates).
/// Designed to be portable — maps directly to egui::Rect for click detection.
/// The `label` field is intentionally kept for future egui integration.
#[derive(Clone, Debug)]
#[allow(dead_code)]
struct Zone {
    label: &'static str,
    row_start: u16,
    row_end: u16,
    col_start: u16,
    col_end: u16,
}

#[derive(Clone, Debug)]
struct MacroCapability {
    name: String,
    active: bool,
}

#[derive(Clone, Debug)]
struct DeviceCapabilities {
    left_click: bool,
    right_click: bool,
    middle_click: bool,
    forward: bool,
    back: bool,
    secondary_macros: Vec<MacroCapability>,
}

/// The mouse art + zone map, independent of any rendering backend.
struct MouseArt {
    lines: Vec<&'static str>,
    zones: Vec<Zone>,
}

struct App {
    capabilities: DeviceCapabilities,
    mouse_art: MouseArt,
    selected_index: usize,
    quit: bool,
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MONO: Style = Style::new();
const DITHER_CHAR: char = '░';
const SHADOW_CHAR: char = '▓';
const STIPPLE_CHAR: char = '▓';

// Title bar stripe pattern (Mac System 1 horizontal lines)
const TITLE_STRIPE: &str = "═══════════════════════════════════════════════════════";

// ─── Mouse ASCII art ─────────────────────────────────────────────────────────

fn build_mouse_art() -> MouseArt {
    // Top-down view of a generic 5-button mouse.
    // Zones are defined by their row/col bounds within this art.
    let lines = vec![
        "     ╔═══════════════════════════╗     ", // 0
        "     ║┌────────┬────┬────────┐   ║     ", // 1
        "     ║│        │    │        │   ║     ", // 2
        "     ║│  LEFT  │ M  │ RIGHT  │   ║     ", // 3
        "     ║│  CLICK │ I  │ CLICK  │   ║     ", // 4
        "     ║│        │ D  │        │   ║     ", // 5
        "     ║├────────┴────┴────────┤   ║     ", // 6
        "     ║│    ╔══╗              │   ║     ", // 7
        "     ║│    ║▒▒║  Scroll      │   ║     ", // 8
        "     ║│    ╚══╝  Wheel       │   ║     ", // 9
        "     ║│                      │   ║     ", // 10
        "     ║│  ┌──────┐ ┌──────┐  │   ║     ", // 11
        "     ║│  │ FWD  │ │ BACK │  │   ║     ", // 12
        "     ║│  │  ►   │ │  ◄   │  │   ║     ", // 13
        "     ║│  └──────┘ └──────┘  │   ║     ", // 14
        "     ║│                      │   ║     ", // 15
        "     ║│      ┌────────┐     │   ║     ", // 16
        "     ║│      │  DPI   │     │   ║     ", // 17
        "     ║│      │  ●●●   │     │   ║     ", // 18
        "     ║│      └────────┘     │   ║     ", // 19
        "     ║│                      │   ║     ", // 20
        "     ║└──────────────────────┘   ║     ", // 21
        "     ╚═══════════════════════════╝     ", // 22
    ];

    let zones = vec![
        Zone { label: "Left Click",   row_start: 2, row_end: 5,  col_start: 7, col_end: 15 },
        Zone { label: "Middle Click", row_start: 2, row_end: 5,  col_start: 16, col_end: 19 },
        Zone { label: "Right Click",  row_start: 2, row_end: 5,  col_start: 20, col_end: 28 },
        Zone { label: "Forward",      row_start: 12, row_end: 13, col_start: 9, col_end: 15 },
        Zone { label: "Back",         row_start: 12, row_end: 13, col_start: 17, col_end: 23 },
    ];

    MouseArt { lines, zones }
}

// ─── App construction ────────────────────────────────────────────────────────

impl App {
    fn new() -> Self {
        let capabilities = DeviceCapabilities {
            left_click: true,
            right_click: true,
            middle_click: false,
            forward: false,
            back: false,
            secondary_macros: vec![
                MacroCapability { name: "DPI Up".into(),        active: true },
                MacroCapability { name: "DPI Down".into(),      active: false },
                MacroCapability { name: "Profile +".into(),     active: false },
                MacroCapability { name: "Profile -".into(),     active: false },
                MacroCapability { name: "Sniper".into(),        active: true },
                MacroCapability { name: "Scroll L".into(),      active: false },
                MacroCapability { name: "Scroll R".into(),      active: false },
                MacroCapability { name: "Media ▶".into(),       active: false },
                MacroCapability { name: "Media ■".into(),       active: false },
                MacroCapability { name: "Mute".into(),          active: true },
            ],
        };

        Self {
            capabilities,
            mouse_art: build_mouse_art(),
            selected_index: 0,
            quit: false,
        }
    }

    fn total_items(&self) -> usize {
        5 + self.capabilities.secondary_macros.len()
    }

    fn button_active(&self, index: usize) -> bool {
        match index {
            0 => self.capabilities.left_click,
            1 => self.capabilities.middle_click,
            2 => self.capabilities.right_click,
            3 => self.capabilities.forward,
            4 => self.capabilities.back,
            i => self.capabilities.secondary_macros.get(i - 5).is_some_and(|m| m.active),
        }
    }

    fn toggle(&mut self, index: usize) {
        match index {
            0 => self.capabilities.left_click = !self.capabilities.left_click,
            1 => self.capabilities.middle_click = !self.capabilities.middle_click,
            2 => self.capabilities.right_click = !self.capabilities.right_click,
            3 => self.capabilities.forward = !self.capabilities.forward,
            4 => self.capabilities.back = !self.capabilities.back,
            i => {
                if let Some(m) = self.capabilities.secondary_macros.get_mut(i - 5) {
                    m.active = !m.active;
                }
            }
        }
    }

    fn item_label(&self, index: usize) -> &str {
        match index {
            0 => "Left Click",
            1 => "Middle Click",
            2 => "Right Click",
            3 => "Forward",
            4 => "Back",
            i => self.capabilities.secondary_macros.get(i - 5).map_or("???", |m| &m.name),
        }
    }
}

// ─── Rendering ───────────────────────────────────────────────────────────────

fn mono() -> Style {
    MONO.fg(Color::Black).bg(Color::White)
}

fn mono_inv() -> Style {
    MONO.fg(Color::White).bg(Color::Black)
}

/// Fill an area with a repeated character.
fn fill_area(buf: &mut ratatui::buffer::Buffer, area: Rect, ch: char, style: Style) {
    for y in area.y..area.y.saturating_add(area.height) {
        for x in area.x..area.x.saturating_add(area.width) {
            if let Some(cell) = buf.cell_mut((x, y)) {
                cell.set_char(ch).set_style(style);
            }
        }
    }
}

/// Draw a drop shadow offset by (1,1) from the given rect.
fn draw_shadow(buf: &mut ratatui::buffer::Buffer, area: Rect) {
    let shadow = Rect {
        x: area.x.saturating_add(2),
        y: area.y.saturating_add(1),
        width: area.width,
        height: area.height,
    };
    fill_area(buf, shadow, SHADOW_CHAR, mono());
}

/// Render a Macintosh System 1-style window with title bar stripes and drop shadow.
fn render_mac_window(
    frame: &mut ratatui::Frame,
    area: Rect,
    title: &str,
) -> Rect {
    let buf = frame.buffer_mut();

    // Drop shadow first (behind everything)
    draw_shadow(buf, area);

    // Window block with double border
    let block = Block::default()
        .borders(Borders::ALL)
        .border_type(BorderType::Double)
        .border_style(mono())
        .style(mono());

    let inner = block.inner(area);
    block.render(area, buf);

    // Title bar: first row of inner area
    if inner.height > 1 {
        let title_area = Rect {
            x: inner.x,
            y: inner.y,
            width: inner.width,
            height: 1,
        };
        // Fill title bar with inverted style (black bg, white text)
        fill_area(buf, title_area, ' ', mono_inv());

        // Stripe pattern on left
        let stripe = &TITLE_STRIPE[..((inner.width as usize / 4).min(TITLE_STRIPE.len()))];
        let title_text = format!("{stripe} {title} {stripe}");
        let truncated = &title_text[..title_text.len().min(inner.width as usize)];

        // Center the title
        let pad = (inner.width as usize).saturating_sub(truncated.len()) / 2;
        for (i, ch) in truncated.chars().enumerate() {
            let x = inner.x + pad as u16 + i as u16;
            if x < inner.x + inner.width {
                if let Some(cell) = buf.cell_mut((x, title_area.y)) {
                    cell.set_char(ch).set_style(mono_inv());
                }
            }
        }

        // Separator line under title bar
        if inner.height > 2 {
            let sep_y = inner.y + 1;
            for x in inner.x..inner.x + inner.width {
                if let Some(cell) = buf.cell_mut((x, sep_y)) {
                    cell.set_char('─').set_style(mono());
                }
            }
        }

        // Content area is below title bar + separator
        Rect {
            x: inner.x,
            y: inner.y + 2,
            width: inner.width,
            height: inner.height.saturating_sub(2),
        }
    } else {
        inner
    }
}

/// Render the mouse ASCII art with zone-based highlighting.
fn render_mouse_window(frame: &mut ratatui::Frame, area: Rect, app: &App) {
    let content = render_mac_window(frame, area, "Mouse Visualizer");
    if content.height == 0 || content.width == 0 {
        return;
    }

    let buf = frame.buffer_mut();
    let art = &app.mouse_art;

    // Build a set of (row, col) -> zone_index for quick lookup
    let mut zone_map: std::collections::HashMap<(u16, u16), usize> = std::collections::HashMap::new();
    for (zi, zone) in art.zones.iter().enumerate() {
        for r in zone.row_start..=zone.row_end {
            for c in zone.col_start..=zone.col_end {
                zone_map.insert((r, c), zi);
            }
        }
    }

    for (row_idx, line) in art.lines.iter().enumerate() {
        let y = content.y + row_idx as u16;
        if y >= content.y + content.height {
            break;
        }

        for (col_idx, ch) in line.chars().enumerate() {
            let x = content.x + col_idx as u16;
            if x >= content.x + content.width {
                break;
            }

            let style = if let Some(&zi) = zone_map.get(&(row_idx as u16, col_idx as u16)) {
                let active = app.button_active(zi);
                let selected = app.selected_index == zi;
                match (active, selected) {
                    (true, true)   => MONO.fg(Color::Black).bg(Color::White).bold(),
                    (true, false)  => mono_inv(),
                    (false, true)  => MONO.fg(Color::Black).bg(Color::White).bold(),
                    (false, false) => mono(),
                }
            } else {
                mono()
            };

            let render_ch = if let Some(&zi) = zone_map.get(&(row_idx as u16, col_idx as u16)) {
                let active = app.button_active(zi);
                let selected = app.selected_index == zi;
                if active && !ch.is_whitespace() {
                    ch
                } else if active && ch.is_whitespace() {
                    STIPPLE_CHAR
                } else if selected && ch == ' ' {
                    '░'
                } else {
                    ch
                }
            } else {
                ch
            };

            if let Some(cell) = buf.cell_mut((x, y)) {
                cell.set_char(render_ch).set_style(style);
            }
        }
    }

    // Legend below the mouse art
    let legend_y = content.y + art.lines.len() as u16 + 1;
    if legend_y < content.y + content.height {
        let labels = ["L=Left", "M=Mid", "R=Right", "►=Fwd", "◄=Back"];
        let legend = labels.join("  ");
        let legend_x = content.x + 1;
        for (i, ch) in legend.chars().enumerate() {
            let x = legend_x + i as u16;
            if x < content.x + content.width {
                if let Some(cell) = buf.cell_mut((x, legend_y)) {
                    cell.set_char(ch).set_style(
                        MONO.fg(Color::Black).bg(Color::White).italic()
                    );
                }
            }
        }
    }
}

/// Render the overflow matrix grid for secondary macros.
fn render_overflow_window(frame: &mut ratatui::Frame, area: Rect, app: &App) {
    let content = render_mac_window(frame, area, "Overflow Matrix");
    if content.height == 0 || content.width == 0 {
        return;
    }

    let macros = &app.capabilities.secondary_macros;
    if macros.is_empty() {
        let msg = Paragraph::new("No secondary capabilities")
            .style(mono())
            .wrap(Wrap { trim: true });
        frame.render_widget(msg, content);
        return;
    }

    let cell_width: u16 = 14;
    let cell_height: u16 = 3;
    let cols = (content.width / cell_width).max(1) as usize;

    let buf = frame.buffer_mut();

    for (i, mac) in macros.iter().enumerate() {
        let grid_row = i / cols;
        let grid_col = i % cols;

        let cell_x = content.x + (grid_col as u16) * cell_width;
        let cell_y = content.y + (grid_row as u16) * cell_height;

        if cell_y + cell_height > content.y + content.height {
            break;
        }
        if cell_x + cell_width > content.x + content.width {
            continue;
        }

        let cell_area = Rect {
            x: cell_x,
            y: cell_y,
            width: cell_width,
            height: cell_height,
        };

        let item_index = 5 + i; // offset past the 5 universal buttons
        let active = mac.active;
        let selected = app.selected_index == item_index;

        let (cell_style, text_style, border_type) = match (active, selected) {
            (true, true) => (mono_inv(), mono_inv().bold(), BorderType::Thick),
            (true, false) => (mono_inv(), mono_inv(), BorderType::Rounded),
            (false, true) => (mono(), mono().bold(), BorderType::Thick),
            (false, false) => (mono(), mono(), BorderType::Rounded),
        };

        // Fill cell background
        if active {
            fill_area(buf, cell_area, STIPPLE_CHAR, cell_style);
        }

        let block = Block::default()
            .borders(Borders::ALL)
            .border_type(border_type)
            .border_style(cell_style)
            .style(cell_style);

        let inner = block.inner(cell_area);
        block.render(cell_area, buf);

        // Center the macro name in the inner area
        if inner.height > 0 && inner.width > 0 {
            let name = &mac.name;
            let truncated = if name.len() > inner.width as usize {
                &name[..inner.width as usize]
            } else {
                name
            };
            let pad = (inner.width as usize).saturating_sub(truncated.len()) / 2;
            let label_y = inner.y + inner.height / 2;

            for (ci, ch) in truncated.chars().enumerate() {
                let x = inner.x + pad as u16 + ci as u16;
                if x < inner.x + inner.width {
                    if let Some(cell) = buf.cell_mut((x, label_y)) {
                        cell.set_char(ch).set_style(text_style);
                    }
                }
            }

            // Active indicator
            if active {
                let indicator = "● ON";
                let ind_y = if inner.height > 1 { inner.y } else { label_y };
                let ind_pad = (inner.width as usize).saturating_sub(indicator.len()) / 2;
                if ind_y != label_y {
                    for (ci, ch) in indicator.chars().enumerate() {
                        let x = inner.x + ind_pad as u16 + ci as u16;
                        if x < inner.x + inner.width {
                            if let Some(cell) = buf.cell_mut((x, ind_y)) {
                                cell.set_char(ch).set_style(text_style);
                            }
                        }
                    }
                }
            }
        }

        // Selection bracket indicator
        if selected {
            let marker = "▶";
            let mx = cell_x.saturating_sub(1);
            let my = cell_y + cell_height / 2;
            if mx >= content.x {
                for (ci, ch) in marker.chars().enumerate() {
                    if let Some(cell) = buf.cell_mut((mx + ci as u16, my)) {
                        cell.set_char(ch).set_style(mono().bold());
                    }
                }
            }
        }
    }
}

/// Render the status bar at the bottom.
fn render_status_bar(frame: &mut ratatui::Frame, area: Rect, app: &App) {
    let buf = frame.buffer_mut();
    // Dithered background
    fill_area(buf, area, DITHER_CHAR, MONO.fg(Color::Black).bg(Color::White));

    let sel_label = app.item_label(app.selected_index);
    let active = if app.button_active(app.selected_index) { "ON" } else { "OFF" };

    let status = Line::from(vec![
        Span::styled(" ←→↑↓", mono().bold()),
        Span::styled(": Navigate  ", mono()),
        Span::styled("Space", mono().bold()),
        Span::styled(": Toggle  ", mono()),
        Span::styled("q", mono().bold()),
        Span::styled(": Quit  │  ", mono()),
        Span::styled(format!("[ {sel_label}: {active} ]"), mono_inv()),
    ]);

    let p = Paragraph::new(status).style(mono());
    frame.render_widget(p, Rect { x: area.x, y: area.y, width: area.width, height: 1 });
}

/// Main UI render function.
fn ui(frame: &mut ratatui::Frame, app: &App) {
    let full = frame.area();
    let buf = frame.buffer_mut();

    // Fill entire background with dithered pattern
    fill_area(buf, full, DITHER_CHAR, MONO.fg(Color::Black).bg(Color::White));

    // Top-level: main area + status bar
    let outer = Layout::vertical([
        Constraint::Min(10),
        Constraint::Length(1),
    ])
    .split(full);

    let main_area = outer[0];
    let status_area = outer[1];

    // Main area: two windows side by side with padding
    let padded = Rect {
        x: main_area.x + 1,
        y: main_area.y + 1,
        width: main_area.width.saturating_sub(2),
        height: main_area.height.saturating_sub(2),
    };

    let panels = Layout::horizontal([
        Constraint::Percentage(50),
        Constraint::Percentage(50),
    ])
    .split(padded);

    // Add inner margins to each panel
    let left_panel = Rect {
        x: panels[0].x,
        y: panels[0].y,
        width: panels[0].width.saturating_sub(1),
        height: panels[0].height.saturating_sub(1),
    };
    let right_panel = Rect {
        x: panels[1].x + 1,
        y: panels[1].y,
        width: panels[1].width.saturating_sub(1),
        height: panels[1].height.saturating_sub(1),
    };

    render_mouse_window(frame, left_panel, app);
    render_overflow_window(frame, right_panel, app);
    render_status_bar(frame, status_area, app);
}

// ─── Main ────────────────────────────────────────────────────────────────────

fn main() -> io::Result<()> {
    // Terminal setup
    enable_raw_mode()?;
    let mut stdout = io::stdout();
    execute!(stdout, EnterAlternateScreen)?;
    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let mut app = App::new();

    // Main event loop
    loop {
        terminal.draw(|frame| ui(frame, &app))?;

        if event::poll(Duration::from_millis(100))? {
            if let Event::Key(key) = event::read()? {
                if key.kind != KeyEventKind::Press {
                    continue;
                }
                match key.code {
                    KeyCode::Char('q') | KeyCode::Esc => app.quit = true,
                    KeyCode::Right | KeyCode::Tab | KeyCode::Down => {
                        let total = app.total_items();
                        app.selected_index = (app.selected_index + 1) % total;
                    }
                    KeyCode::Left | KeyCode::Up => {
                        let total = app.total_items();
                        app.selected_index = if app.selected_index == 0 {
                            total - 1
                        } else {
                            app.selected_index - 1
                        };
                    }
                    KeyCode::Char(' ') | KeyCode::Enter => {
                        let idx = app.selected_index;
                        app.toggle(idx);
                    }
                    _ => {}
                }
            }
        }

        if app.quit {
            break;
        }
    }

    // Cleanup
    disable_raw_mode()?;
    execute!(terminal.backend_mut(), LeaveAlternateScreen)?;
    terminal.show_cursor()?;

    Ok(())
}
