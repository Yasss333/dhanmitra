import os
from typing import List
from pydantic import BaseModel, Field
from agno.agent import Agent
from agno.models.openai import OpenAIChat
from agno.tools.yfinance import YFinanceTools
from agno.tools.duckduckgo import DuckDuckGoTools

# 1. Define target structures using Pydantic (Structured Outputs Feature)
class SentimentScore(BaseModel):
    company: str = Field(description="Name of the company evaluated")
    ticker: str = Field(description="Stock ticker symbol")
    sentiment_rating: str = Field(description="Bullish, Bearish, or Neutral")
    summary_justification: str = Field(description="Core headline reason for the rating")

# 2. Base Configuration: System Prompt & Agent 1 (Web Sentiment Specialist)
web_agent = Agent(
    name="Market Sentiment Analyst",
    role="Analyze real-time market sentiment, macroeconomic headlines, and public perception.",
    model=OpenAIChat(id="gpt-4o"),
    tools=[DuckDuckGoTools()],
    # System Prompt defines strict behavioral guardrails
    system_prompt=(
        "You are an elite financial journalist and sentiment analyst. "
        "Your job is to search the live web for recent news, earnings leaks, and regulatory hurdles "
        "surrounding the requested ticker. Disregard rumors from unverified social media blogs. "
        "Always cite your sources with URLs."
    ),
    markdown=True,
    show_tool_calls=True, # Logs tool footprints to terminal for visibility
)

# 3. Agent 2 (The Quantitative Financial Specialist)
finance_agent = Agent(
    name="Quantitative Finance Analyst",
    role="Extract raw fundamental numbers, financial metrics, and stock variations.",
    model=OpenAIChat(id="gpt-4o"),
    # Toolkit integration: Bundled domain-specific functions
    tools=[YFinanceTools(stock_price=True, analyst_recommendations=True, company_info=True)],
    system_prompt=(
        "You are an expert mathematical quantitative analyst. "
        "Extract raw financial telemetry: Current Price, Moving Averages, and institutional consensus. "
        "Do not offer qualitative speculation; provide raw metrics."
    ),
    markdown=True,
    show_tool_calls=True,
)

# 4. Multi-Agent Team Orchestration (Combining individual capabilities)
fintech_team = Agent(
    name="Executive Investment Board",
    team=[web_agent, finance_agent], # Combines specialized agents
    model=OpenAIChat(id="gpt-4o"),
    system_prompt=(
        "You are the Director of Risk and Investment. Orchestrate your team: "
        "First, command the Quantitative Finance Analyst to pull core metrics. "
        "Second, command the Market Sentiment Analyst to pull relevant news sentiment. "
        "Synthesize both inputs into a final cohesive investment posture memo."
    ),
    response_model=SentimentScore, # Forces output to match the Pydantic schema
)

# 5. Execution
if __name__ == "__main__":
    # Ensure your OPENAI_API_KEY environment variable is configured
    response = fintech_team.run("Should we buy or hold Apple (AAPL) stocks given this week's activity?")
    print(response.content)