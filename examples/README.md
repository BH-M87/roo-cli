# Roo CLI Library Usage Example

This directory contains examples of how to use Roo CLI as a library in your Node.js applications.

## Library Usage Example

The `library-usage.ts` file demonstrates how to import and use Roo CLI functions in your own TypeScript/JavaScript projects.

### Setup

1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit the `.env` file and add your API keys:
   ```
   ANTHROPIC_API_KEY=your-anthropic-api-key-here
   ```
   
   Or for OpenAI:
   ```
   API_PROVIDER=openai
   OPENAI_API_KEY=your-openai-api-key-here
   ```

### Running the Example

Run the example with a prompt:

```bash
ts-node examples/library-usage.ts "Write a function to calculate the Fibonacci sequence"
```

Or use environment variables for the prompt:

```bash
PROMPT="Write a function to calculate the Fibonacci sequence" ts-node examples/library-usage.ts
```

### Configuration Options

The example supports various configuration options through environment variables:

| Environment Variable | Description | Default |
|---------------------|-------------|---------|
| `API_PROVIDER` | API provider to use (anthropic, openai) | anthropic |
| `ANTHROPIC_API_KEY` | Anthropic API key | (required for Anthropic) |
| `OPENAI_API_KEY` | OpenAI API key | (required for OpenAI) |
| `OPENAI_BASE_URL` | OpenAI API base URL | https://api.openai.com/v1 |
| `MODEL_ID` | Model ID to use | (provider-specific default) |
| `MODE` | Task mode (code, ask, etc.) | code |
| `LOG_LEVEL` | Log level (debug, info, success, warn, error, always) | info |
| `CONTINUOUS` | Enable continuous execution mode | false |
| `MAX_STEPS` | Maximum number of steps for continuous mode | 100 |
| `AUTO` | Enable auto mode (no user confirmation required) | false |
| `RULES` | Additional rules to supplement the system prompt | |
| `CUSTOM_INSTRUCTIONS` | Custom instructions to add to the system prompt | |
| `ROLE_DEFINITION` | Custom role definition to override the default one | |
| `ONLY_RETURN_LAST_RESULT` | Only return the last result (suppress intermediate result) | false |
| `PROMPT` | Default prompt (can be overridden by command line argument) | |

## Integrating Roo CLI in Your Projects

To use Roo CLI in your own projects:

1. Install Roo CLI:
   ```bash
   npm install roo-cli
   ```

2. Import and use the functions:
   ```typescript
   import { handleNewTask, ApiConfig, ApiProvider } from 'roo-cli';
   
   // Define API configuration
   const apiConfig: ApiConfig = {
     apiProvider: ApiProvider.ANTHROPIC,
     anthropicApiKey: process.env.ANTHROPIC_API_KEY,
     anthropicModelId: 'claude-3-5-sonnet-20241022',
     id: 'my-config',
   };
   
   // Execute a task
   async function executeTask() {
     const result = await handleNewTask({
       prompt: 'Write a function to calculate the Fibonacci sequence',
       mode: 'code',
       apiConfig,
       cwd: process.cwd(),
     });
     
     console.log(result.output);
   }
   
   executeTask();
   ```
