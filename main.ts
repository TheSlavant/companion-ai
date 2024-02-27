import { App, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import OpenAI from "openai";

// Define the structure of your plugin settings
interface CompanionPluginSettings {
    apiKey: string; // OpenAI API key
    userFirstName: string; // User's first name
}

// Default settings values
const DEFAULT_SETTINGS: CompanionPluginSettings = {
    apiKey: '', // Empty by default, user must fill this in
    userFirstName: '' // Empty by default, user must fill this in
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
        this.addRibbonIcon('dice', 'Generate observations', async (evt: MouseEvent) => {
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
                    {"role": "system", "content": `Generate factual observations about the user from this text. The user's name is ${this.settings.userFirstName}. Only return observations formatted as a JSONL file with one observation per line, nothing else. Maintain this schema for the JSON objects: {"observation": "{user's first name} mentioned liking green apples.", "date": "2024-01-04", "source": "thoughts.md", "source_quote": "I like green apples!", "tags": ["food", "preferences"]}.`},
                    { "role": "user", "content": content }
                ],
                response_format: { type: "json_object" },
            });
            // Return the generated observations
            return completion.choices[0].message.content || 'No observations generated.';
        } catch (error) {
            // Log and return an error message if the API call fails
            console.error('Error generating observations:', error);
            return 'Error generating observations.';
        }
    }

    // Placeholder for cleanup tasks when the plugin is unloaded
    onunload() {

    }

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
            .setName('OpenAI API key')
            .setDesc('Enter your OpenAI API key.')
            .addText(text => text
                .setPlaceholder('API Key')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    // Update the API key in the plugin settings when the user changes it
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));
        
                // Create a new setting for the user's first name
        new Setting(containerEl)
        .setName('User\'s first name')
        .setDesc('Enter your first name.')
        .addText(text => text
            .setPlaceholder('First name')
            .setValue(this.plugin.settings.userFirstName)
            .onChange(async (value) => {
                // Update the user's first name in the plugin settings when the user changes it
                this.plugin.settings.userFirstName = value;
                await this.plugin.saveSettings();
            }));
    }
}