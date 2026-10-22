import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const originalFetch = globalThis.fetch;
let networkRequests = 0;
globalThis.fetch = async () => {
  networkRequests++;
  throw new Error('Network is forbidden in the Mastra smoke test');
};
try {
  const { Agent } = require('@mastra/core/agent');
  const { createTool } = require('@mastra/core/tools');
  const { z } = require('zod');

  function fixture(mode) {
    let modelCalls = 0;
    const toolInputs = [];
    const usage = { inputTokens: 3, outputTokens: 2 };
    const callId = `fixture-${mode}-call`;
    function response() {
      assert.ok(++modelCalls <= 2, 'Unexpected additional model call');
      if (modelCalls === 1)
        return {
          content: [
            {
              type: 'tool-call',
              toolCallId: callId,
              toolName: 'fixture_echo',
              input: '{"value":"fixture"}',
            },
          ],
          finishReason: 'tool-calls',
          usage,
          warnings: [],
        };
      return {
        content: [{ type: 'text', text: 'fixture complete' }],
        finishReason: 'stop',
        usage,
        warnings: [],
      };
    }
    const model = {
      specificationVersion: 'v2',
      provider: 'local-fixture',
      modelId: 'local-fixture',
      supportedUrls: {},
      async doGenerate() {
        return response();
      },
      async doStream() {
        const result = response();
        const parts = [{ type: 'stream-start', warnings: [] }];
        for (const item of result.content) {
          if (item.type === 'tool-call')
            parts.push(
              { type: 'tool-input-start', id: callId, toolName: item.toolName },
              { type: 'tool-input-delta', id: callId, delta: item.input },
              { type: 'tool-input-end', id: callId },
              item,
            );
          else
            parts.push(
              { type: 'text-start', id: 'fixture-text' },
              { type: 'text-delta', id: 'fixture-text', delta: item.text },
              { type: 'text-end', id: 'fixture-text' },
            );
        }
        parts.push({ type: 'finish', finishReason: result.finishReason, usage });
        return {
          stream: new ReadableStream({
            start(controller) {
              for (const part of parts) controller.enqueue(part);
              controller.close();
            },
          }),
        };
      },
    };
    const agent = new Agent({
      id: `fixture-${mode}`,
      name: 'Local fixture',
      instructions: 'Use fixture_echo, then answer.',
      model,
      tools: {
        fixture_echo: createTool({
          id: 'fixture_echo',
          description: 'Echo a fixture value',
          inputSchema: z.object({ value: z.string() }),
          execute: async ({ value }) => {
            toolInputs.push(value);
            return { value };
          },
        }),
      },
    });
    return { agent, toolInputs, modelCalls: () => modelCalls };
  }
  async function verify() {
    const generated = fixture('generate');
    const result = await generated.agent.generate('Run the fixture.', {
      maxSteps: 3,
      modelSettings: { temperature: 0 },
    });
    assert.equal(result.text, 'fixture complete');
    assert.deepEqual(generated.toolInputs, ['fixture']);
    assert.equal(generated.modelCalls(), 2);

    const streamed = fixture('stream');
    const output = await streamed.agent.stream('Run the fixture.', {
      maxSteps: 3,
      modelSettings: { temperature: 0 },
    });
    let text = '';
    const events = new Set();
    for await (const chunk of output.fullStream) {
      assert.ok(!['error', 'tool-error'].includes(chunk.type), `Unexpected ${chunk.type}`);
      events.add(chunk.type);
      if (chunk.type === 'text-delta') text += chunk.payload.text;
      if (chunk.type === 'tool-call') assert.equal(chunk.payload.toolName, 'fixture_echo');
    }
    assert.equal(text, 'fixture complete');
    assert.deepEqual(streamed.toolInputs, ['fixture']);
    assert.equal(streamed.modelCalls(), 2);
    for (const type of ['tool-call', 'tool-result', 'step-finish'])
      assert.ok(events.has(type), `Missing ${type}`);
    assert.equal(networkRequests, 0);
  }
  let timer;
  try {
    await Promise.race([
      verify(),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Smoke timed out')), 15_000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
  console.log('Mastra generate/stream/tool smoke passed');
} finally {
  globalThis.fetch = originalFetch;
}
