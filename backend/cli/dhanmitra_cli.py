"""
DhanMitra CLI — NGO/Counselor Terminal UI
Built with Textual. Runs on low-resource machines.
Usage: python cli/dhanmitra_cli.py
"""

import httpx
from textual.app import App, ComposeResult
from textual.containers import ScrollableContainer, Horizontal, Vertical
from textual.widgets import Header, Footer, Input, Static, Label, Select
from textual.binding import Binding
from textual import work
from datetime import datetime

API_BASE = "http://localhost:8000"

OCCUPATIONS = [
    ("Gig Worker", "gig_worker"),
    ("Farmer", "farmer"),
    ("Salaried", "salaried"),
    ("Business Owner", "business_owner"),
    ("Homemaker", "homemaker"),
    ("Student", "student"),
    ("Other", "other"),
]

LANGUAGES = [
    ("English", "english"),
    ("Hindi", "hindi"),
    ("Marathi", "marathi"),
    ("Kannada", "kannada"),
]

class MessageBubble(Static):
    def __init__(self, role: str, content: str, trace: dict = None):
        label = "YOU" if role == "user" else "DHANMITRA"
        time = datetime.now().strftime("%H:%M")
        trace_str = ""
        if trace and trace.get("systems"):
            systems = ", ".join(trace.get("systems", []))
            trace_str = f"\n  [Activated: {systems}]"
        text = f"[{time}] {label}:\n  {content}{trace_str}"
        super().__init__(text)
        self.add_class(role)

class DhanMitraCLI(App):
    """DhanMitra Terminal UI for NGO Counselors and Field Workers."""

    CSS = """
    Screen {
        background: $surface;
    }

    #sidebar {
        width: 28;
        background: $panel;
        border-right: solid $primary;
        padding: 1;
    }

    #main {
        width: 1fr;
    }

    #messages {
        height: 1fr;
        padding: 1 2;
    }

    MessageBubble {
        margin-bottom: 1;
        padding: 0 1;
    }

    MessageBubble.user {
        color: $accent;
        text-align: right;
    }

    MessageBubble.assistant {
        color: $text;
        border-left: solid $primary;
        padding-left: 1;
    }

    #input-row {
        height: 3;
        border-top: solid $primary;
        background: $panel;
    }

    #msg-input {
        width: 1fr;
    }

    #status-bar {
        height: 1;
        background: $primary;
        color: $text;
        padding: 0 1;
    }

    Label {
        color: $text-muted;
        margin-bottom: 1;
    }

    Select {
        margin-bottom: 1;
    }
    """

    BINDINGS = [
        Binding("ctrl+q", "quit", "Quit"),
        Binding("ctrl+c", "clear_chat", "Clear Chat"),
        Binding("f1", "set_mode('sahayak')", "Sahayak"),
        Binding("f2", "set_mode('guardian')", "Guardian"),
        Binding("f3", "set_mode('companion')", "Companion"),
    ]

    def __init__(self):
        super().__init__()
        self.session_id = f"cli-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        self.chat_mode = "sahayak"
        self.profile = {
            "language": "english",
            "occupation": "other",
            "money_comfort": "beginner",
            "goal": "emergency_fund",
        }

    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        with Horizontal():
            with Vertical(id="sidebar"):
                yield Label("── PROFILE ──")
                yield Label("Language:")
                yield Select(
                    [(lang[0], lang[1]) for lang in LANGUAGES],
                    value="english",
                    id="lang-select"
                )
                yield Label("Occupation:")
                yield Select(
                    [(occ[0], occ[1]) for occ in OCCUPATIONS],
                    value="other",
                    id="occ-select"
                )
                yield Label("── MODE ──")
                yield Label("F1: Sahayak")
                yield Label("F2: Guardian")
                yield Label("F3: Companion")
                yield Label("── HELP ──")
                yield Label("Ctrl+C: Clear")
                yield Label("Ctrl+Q: Quit")

            with Vertical(id="main"):
                yield Static(
                    f"DhanMitra CLI | Mode: {self.current_mode.upper()} | Session: {self.session_id}",
                    id="status-bar"
                )
                yield ScrollableContainer(id="messages")
                with Horizontal(id="input-row"):
                    yield Input(
                        placeholder="Type query and press Enter... (Ctrl+Q to quit)",
                        id="msg-input"
                    )
        yield Footer()

    def on_mount(self):
        self.query_one("#msg-input").focus()
        self._add_message(
            "assistant",
            "DhanMitra CLI ready. Type a question below. "
            "Switch modes with F1/F2/F3. Update profile in the sidebar.",
            None
        )

    def on_select_changed(self, event: Select.Changed):
        if event.select.id == "lang-select":
            self.profile["language"] = str(event.value)
        elif event.select.id == "occ-select":
            self.profile["occupation"] = str(event.value)
        self._update_status()

    def on_input_submitted(self, event: Input.Submitted):
        message = event.value.strip()
        if not message:
            return
        event.input.value = ""
        self._add_message("user", message, None)
        self._send_message(message)

    @work(exclusive=False, thread=True)
    def _send_message(self, message: str):
        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{API_BASE}/api/chat",
                    json={
                        "message": message,
                        "mode": self.current_mode,
                        "session_id": self.session_id,
                        "user_id": "cli-counselor",
                        "profile": self.profile,
                    }
                )
                data = response.json()
                self.call_from_thread(
                    self._add_message,
                    "assistant",
                    data.get("reply", "No reply"),
                    data.get("agent_trace"),
                )
        except Exception as e:
            self.call_from_thread(
                self._add_message,
                "assistant",
                f"[ERROR] Could not reach DhanMitra API: {e}",
                None,
            )

    def _add_message(self, role: str, content: str, trace: dict):
        messages = self.query_one("#messages")
        bubble = MessageBubble(role, content, trace)
        messages.mount(bubble)
        messages.scroll_end(animate=False)

    def _update_status(self):
        status = self.query_one("#status-bar", Static)
        status.update(
            f"DhanMitra CLI | Mode: {self.current_mode.upper()} | "
            f"Lang: {self.profile['language']} | "
            f"Occ: {self.profile['occupation']} | "
            f"Session: {self.session_id}"
        )

    def action_clear_chat(self):
        messages = self.query_one("#messages")
        messages.remove_children()
        self._add_message("assistant", "Chat cleared. Ready for next query.", None)

    def action_set_mode(self, mode: str):
        self.current_mode = mode
        self._update_status()
        self._add_message("assistant", f"Switched to {mode.upper()} mode.", None)

if __name__ == "__main__":
    app = DhanMitraCLI()
    app.run()