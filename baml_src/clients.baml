client<llm> Claude {
  provider anthropic
  options {
    model "claude-sonnet-4-6"
    api_key env.ANTHROPIC_API_KEY
  }
}
