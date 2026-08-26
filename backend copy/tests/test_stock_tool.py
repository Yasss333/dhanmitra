import unittest
from unittest.mock import patch

from agents.agno_agents import AgentSahayak
from agents import agno_tools


class StockToolTests(unittest.TestCase):
    def test_sahayak_agent_exposes_stock_tool(self):
        tool_names = [getattr(tool, "__name__", None) for tool in AgentSahayak.tools]
        self.assertIn("get_stock_price", tool_names)

    def test_get_stock_price_returns_error_for_unknown_ticker(self):
        class FakeTicker:
            def __init__(self, ticker):
                self.ticker = ticker
                self.info = {}

        with patch.object(agno_tools.yf, "Ticker", FakeTicker):
            result = agno_tools.get_stock_price("UNKNOWN")

        self.assertIn("error", result)
        self.assertEqual(result["ticker"], "UNKNOWN")


if __name__ == "__main__":
    unittest.main()
