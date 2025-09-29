import OpenAI from 'openai'
import readline from 'node:readline'

const client = new OpenAI({
    apiKey: 'REDACTED'
})

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
let prev = null

async function ask(q) {
    const stream = await client.responses.create({
        model: 'gpt-5-nano',
        input: q,
        instructions: 'always answer with one short sentence',  // <-- ADD YOUR PERSONALITY HERE
        stream: true,
        tools: [
            { type: "web_search" },
            {
                type: "mcp",
                server_label: "supabase",
                server_url: "http://localhost:3001/sse",
                require_approval: "never"
            }
        ],
        reasoning: { effort: 'low' },
        text: { verbosity: 'low' },
        ...(prev && { previous_response_id: prev })
    })

    for await (const ev of stream) {
        if (ev.type === 'response.output_text.delta') process.stdout.write(ev.delta)
        if (ev.type === 'response.completed') {
            prev = ev.response?.id
            console.log()
        }
    }
}

const loop = () => rl.question('> ', async q => {
    if (q.trim()) await ask(q.trim())
    loop()
})

console.log('gpt-5-nano (minimal)\n')
loop()