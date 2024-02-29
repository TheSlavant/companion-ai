import { App, Notice, Plugin, PluginSettingTab, Setting, TFile, ItemView, WorkspaceLeaf } from 'obsidian';
import OpenAI from "openai";

// Define the structure of your plugin settings
interface CompanionPluginSettings {
    apiKey: string; // OpenAI API key
    userFirstName: string; // User's first name
}

// Default settings values
const DEFAULT_SETTINGS: CompanionPluginSettings = {
    apiKey: '', // Empty by default, user must fill this in
    userFirstName: 'User' // Empty by default, user must fill this in
}

// Main plugin class
export default class CompanionPlugin extends Plugin {
    settings: CompanionPluginSettings;
    openai: OpenAI;

    // Plugin loading function
    async onload() {
        // Load the user's settings from disk
        await this.loadSettings();

        // Initialize the OpenAI client with the user-provided API key
        this.openai = new OpenAI({ apiKey: this.settings.apiKey, dangerouslyAllowBrowser: true });

        // Add a ribbon icon on the left sidebar for generating observations
        this.addRibbonIcon('dice', 'Companion observe', async (evt: MouseEvent) => {
            // Get the currently active file in Obsidian
            const activeFile = this.app.workspace.getActiveFile();
            // If there's no active file, show a notice and exit
            if (!activeFile) {
                new Notice('Select a file to generate observations.');
                return;
            }

            // Read the content of the active file
            const fileContent = await this.app.vault.read(activeFile);
            // Proceed to generate observations for the file content
            const observations = await this.generateObservations(fileContent);

            // Define the observations file name
            const observationsFileName = "observations.md";

            // Check if the observations file already exists
            let observationsFile = this.app.vault.getAbstractFileByPath(observationsFileName);
            if (observationsFile && observationsFile instanceof TFile) {
                // If the file exists, append new observations
                await this.app.vault.append(observationsFile, observations + "\n"); // Ensure new observations start on a new line
            } else {
                // If the file doesn't exist, create it with the new observations
                await this.app.vault.create(observationsFileName, observations + "\n"); // Start observations on a new line
            }
            new Notice(`Observations saved from ${activeFile.basename}`);
        });

        // Variable to keep track of the debounce timeout
        let debounceTimeout: NodeJS.Timeout | null = null;

        // Listen for changes to the observations.md file and generate embeddings with debouncing
        this.registerEvent(this.app.vault.on('modify', async (file) => {
            if (file.name === 'observations.md' && file instanceof TFile) {
                // Clear the existing timeout, if any, to reset the debounce timer
                if (debounceTimeout !== null) {
                    clearTimeout(debounceTimeout);
                }

                // Set a new timeout to wait for 10 seconds of inactivity before generating embeddings
                debounceTimeout = setTimeout(async () => {
                    const content = await this.app.vault.read(file);
                    const lines = content.split('\n');
                    await this.generateAndStoreEmbeddings(lines);
                    new Notice(`Embeddings updated for observations.md`);
                }, 10000); // 10000 milliseconds = 10 seconds
            }
        }));

        // Add chat interface tab
        this.addRibbonIcon('dice', 'Chat with Companion', () => {
            this.activateChatInterface();
        });

        // Add a settings tab so the user can configure the plugin
        this.addSettingTab(new CompanionPluginSettingTab(this.app, this));
    }

    // Function to generate observations using OpenAI based on the content of the current file
    async generateObservations(content: string): Promise<string> {
        try {
            // Use the OpenAI API to generate observations
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4-0125-preview",
                messages: [
                    { "role": "system", "content": `Generate factual observations about the user from this text. The user's name is ${this.settings.userFirstName}. Only return the observations, nothing else. For example: '{name} mentioned liking green apples.', '{name} reflected that in a few hundred years LLMs from 2024 will sound funny.'`},
                    { "role": "user", "content": content }
                ],
            });
            // Return the generated observations
            return completion.choices[0].message.content || 'No observations generated.';
        } catch (error) {
            // Log and return an error message if the API call fails
            console.error('Error generating observations:', error);
            return 'Error generating observations.';
        }
    }

    async generateAndStoreEmbeddings(lines: string[]) {
        const embeddingsFileName = "observation_embeddings.json";
        let embeddingsData = [];
    
        for (let line of lines) {
            if (line.trim().length === 0) continue; // Skip empty lines
    
            // Generate embedding for each line
            const response = await this.openai.embeddings.create({
                model: "text-embedding-3-large",
                input: line
            });
    
            // Append the text and its embedding to the embeddings array
            embeddingsData.push({
                text: line,
                embedding: response.data[0].embedding
            });
        }
    
        // Store the text and embeddings in observation_embeddings.json
        await this.app.vault.adapter.write(embeddingsFileName, JSON.stringify(embeddingsData, null, 2));
    }

    activateChatInterface() {
        // Check if the chat view already exists and focus if it does
        let leaf = this.app.workspace.getLeavesOfType('chat-interface')[0];
        if (leaf) {
            this.app.workspace.setActiveLeaf(leaf);
            return;
        }
    
        // Create a new leaf (tab) in the workspace if it doesn't exist
        let rightLeaf = this.app.workspace.getRightLeaf(false);
        if (rightLeaf) {
            rightLeaf.setViewState({
                type: 'chat-interface',
            });
        }
    
        // Register the new leaf type and its view
        this.registerView('chat-interface', (leaf) => new ChatInterfaceView(leaf, this));
    }

    // Placeholder for cleanup tasks when the plugin is unloaded
    onunload() {}

    // Load the user's settings from disk
    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    // Save the user's settings to disk
    async saveSettings() {
        await this.saveData(this.settings);
    }
}

// Settings tab in the Obsidian settings window
class CompanionPluginSettingTab extends PluginSettingTab {
    plugin: CompanionPlugin;

    constructor(app: App, plugin: CompanionPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    // Display the settings UI
    display(): void {
        const {containerEl} = this;

        // Clear the container element
        containerEl.empty();

        // Create a new setting for the OpenAI API key
        new Setting(containerEl)
            .setName('OpenAI API Key')
            .setDesc('Enter your OpenAI API key.')
            .addText(text => text
                .setPlaceholder('Enter your API Key')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    // Update the API key in the plugin settings when the user changes it
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));
        
                // Create a new setting for the user's first name
        new Setting(containerEl)
        .setName('User First Name')
        .setDesc('Enter your first name.')
        .addText(text => text
            .setPlaceholder('Enter your first name')
            .setValue(this.plugin.settings.userFirstName)
            .onChange(async (value) => {
                // Update the user's first name in the plugin settings when the user changes it
                this.plugin.settings.userFirstName = value;
                await this.plugin.saveSettings();
            }));
    }
}

// Utility function to calculate cosine similarity between two vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    const dotProduct = vecA.reduce((acc, curr, idx) => acc + curr * vecB[idx], 0);
    const magA = Math.sqrt(vecA.reduce((acc, curr) => acc + curr * curr, 0));
    const magB = Math.sqrt(vecB.reduce((acc, curr) => acc + curr * curr, 0));
    return dotProduct / (magA * magB);
}

interface Observation {
    text: string;
    embedding: number[];
}

class ChatInterfaceView extends ItemView {
    plugin: CompanionPlugin;
    containerEl: HTMLElement;

    constructor(leaf: WorkspaceLeaf, plugin: CompanionPlugin) {
        super(leaf);
        this.plugin = plugin;
        this.containerEl = this.containerEl.createDiv();
        this.display();
    }

    getViewType() {
        return 'chat-interface';
    }

    getDisplayText() {
        return 'Chat with Companion';
    }

    async onOpen() {
        this.display();
    }

    onClose(): Promise<void> {
        return Promise.resolve();
    }

    // Function to find the most relevant observations
    async findRelevantObservations(userMessage: string, k: number = 5): Promise<string[]> {
        // Load observation embeddings
        const embeddingsData = JSON.parse(await this.app.vault.adapter.read('observation_embeddings.json'));

        // Generate embedding for the user's message
        const response = await this.plugin.openai.embeddings.create({
            model: "text-embedding-3-large",
            input: userMessage
        });
        const userMessageEmbedding: number[] = response.data[0].embedding;
        
        // Calculate similarity scores
        const similarityScores = embeddingsData.map((observation: Observation) => ({
            text: observation.text,
            similarity: cosineSimilarity(observation.embedding, userMessageEmbedding)
        }));

        // Sort by similarity score in descending order and take top k
        const topObservationsWithScores = similarityScores
            .sort((a: { similarity: number; text: string }, b: { similarity: number; text: string }) => b.similarity - a.similarity) // Sort by similarity score in descending order
            .slice(0, k) // Get the top k observations

        // Log the scores and observations for review
        console.log("Top Observations with Scores:");
            topObservationsWithScores.forEach((obs: { similarity: number; text: string }) => {
            console.log(`Score: ${obs.similarity}, Observation: ${obs.text}`);
        });
        
        // Save just the text of the top observations as before
        const topObservations = topObservationsWithScores.map((obs: { text: string }) => obs.text);

        return topObservations;
    }

    display() {
        // Clear existing content
        this.containerEl.empty();
        
        // Ensure the interface takes up full height
        this.containerEl.classList.add('full-height');
        
        // Create chat container
        const chatContainer = this.containerEl.createDiv();
        chatContainer.classList.add('chat-container');
        
        // Create input box
        const inputBox = this.containerEl.createEl('input');
        inputBox.classList.add('input-box');
        inputBox.placeholder = 'Type your message...';

        // Create send button
        const sendButton = this.containerEl.createEl('button');
        sendButton.classList.add('send-button');
        sendButton.textContent = 'Send';

        // Handle send action
        sendButton.onclick = async () => {
            const userMessage = inputBox.value.trim();
            if (!userMessage) return;

            // Display user message
            chatContainer.createEl('div', { text: `You: ${userMessage}` });

            try {
                // Retrieve relevant observations based on the user's message
                const relevantObservations = await this.findRelevantObservations(userMessage);
        
                // Concatenate relevant observations to form the context for the LLM response
                const context = relevantObservations.join('\n');
        
                // Use the OpenAI API to get a response for the user message, including the retrieved context
                const completion = await this.plugin.openai.chat.completions.create({
                    model: "gpt-4-0125-preview",
                    messages: [
                        { role: "system", content: `You are a personal Companion to ${this.plugin.settings.userFirstName}. Act as a trusted thought partner. Be direct, concise, and conversational. Consider these observations: \n${context}` },
                        { role: "user", content: userMessage }
                    ],
                });
        
                // Extract the LLM response from the completion object
                const llmResponse = completion.choices[0].message.content || "I'm not sure how to respond to that.";
        
                // Display LLM response in chat
                chatContainer.createEl('div', { text: `Companion: ${llmResponse}` });
            } catch (error) {
                console.error('Error getting response from LLM:', error);
                chatContainer.createEl('div', { text: `Companion: Sorry, there was an error processing your request.` });
            }
        
            // Clear input box after sending the message
            inputBox.value = '';
        };
    }
}