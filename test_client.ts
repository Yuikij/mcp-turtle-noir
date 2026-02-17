import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function main() {
    const transport = new StdioClientTransport({
        command: "node",
        args: ["./dist/index.js"],
    });

    const client = new Client(
        {
            name: "test-client",
            version: "1.0.0",
        },
        {
            capabilities: {},
        },
    );

    console.log("Connecting to MCP server...");
    await client.connect(transport);
    console.log("Connected!");

    try {
        console.log("\n--- Listing Tools ---");
        const tools = await client.listTools();
        console.log(JSON.stringify(tools, null, 2));

        console.log("\n--- Calling Tool: start_session ---");
        const startResult = await client.callTool({
            name: "start_session",
            arguments: {},
        });
        console.log(JSON.stringify(startResult, null, 2));

        const firstText = startResult.content?.[0];
        if (!firstText || firstText.type !== "text") {
            throw new Error("No text response from start_session");
        }

        const parsedStart = JSON.parse(firstText.text) as { session_id?: string };
        if (!parsedStart.session_id) {
            throw new Error("start_session did not return session_id");
        }

        console.log("\n--- Calling Tool: ask_question ---");
        const askResult = await client.callTool({
            name: "ask_question",
            arguments: {
                session_id: parsedStart.session_id,
                question: "Was the death caused by another person?",
            },
        });
        console.log(JSON.stringify(askResult, null, 2));

        console.log("\n--- Calling Tool: give_up_and_reveal ---");
        const giveUpResult = await client.callTool({
            name: "give_up_and_reveal",
            arguments: {
                session_id: parsedStart.session_id,
            },
        });
        console.log(JSON.stringify(giveUpResult, null, 2));
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        await client.close();
    }
}

main();
