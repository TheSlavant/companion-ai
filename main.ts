import { App, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';
import OpenAI from "openai";

// Define the structure of your plugin settings
interface CompanionPluginSettings {
    apiKey: string; // OpenAI API key
}

// Default settings values
const DEFAULT_SETTINGS: CompanionPluginSettings = {
    apiKey: '', // Empty by default, user must fill this in
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

        // Add a ribbon icon on the left sidebar for generating insights
        // "light-bulb" is the icon, "Generate Insights" is the hover text
        this.addRibbonIcon('dice', 'Generate insights', async (evt: MouseEvent) => {
            // Get the currently active file in Obsidian
            const activeFile = this.app.workspace.getActiveFile();
            // If there's no active file, show a notice and exit
            if (!activeFile) {
                new Notice('Select a file to generate insights.');
                return;
            }

			// Read the name and content of the active file
			const fileName = activeFile.basename;
			const fileContent = await this.app.vault.read(activeFile);
            // Proceed to generate insights for any file content
            const observations = await this.generateInsights(fileContent);

			// Create a filename for the observations file based on the current date and selected file
			// Adjust the date to reflect the user's local date
			const today = new Date();
			const localDate = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
			const observationFileName = `${localDate} observations from '${fileName}'.md`;

            // Check if the file already exists, update it; if not, create a new one
            const existingFile = this.app.vault.getAbstractFileByPath(observationFileName);
            if (existingFile && existingFile instanceof TFile) {
                await this.app.vault.modify(existingFile, observations);
            } else {
                await this.app.vault.create(observationFileName, observations);
            }
            new Notice(`Observations saved into ${observationFileName}`);
        });

        // Add a settings tab so the user can configure the plugin
        this.addSettingTab(new CompanionPluginSettingTab(this.app, this));
    }

    // Function to generate insights using OpenAI based on the content of the current file
    async generateInsights(content: string): Promise<string> {
        try {
            // Use the OpenAI API to generate insights
            const completion = await this.openai.chat.completions.create({
                model: "gpt-4-0125-preview",
                messages: [
                    { "role": "system", "content": "Generate factual observations about the user and his life from this text. The user's name is Yaroslav. Only return the observations, nothing else. For example: 'Yaroslav wrote that for the next 5 years, he will build technology for makers.', 'Yaroslav reflected that in a few hundred years language models from 2024 will sound like Geoffrey Chaucer.'" },
                    { "role": "user", "content": content }
                ],
            });
            // Return the generated insights
            return completion.choices[0].message.content || 'No insights generated.';
        } catch (error) {
            // Log and return an error message if the API call fails
            console.error('Error generating insights:', error);
            return 'Error generating insights.';
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
            .setName('OpenAI API Key')
            .setDesc('Enter your OpenAI API Key.')
            .addText(text => text
                .setPlaceholder('API Key')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    // Update the API key in the plugin settings when the user changes it
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));
    }
}