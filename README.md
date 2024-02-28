# Companion: an AI that learns from your Obsidian notes.

Personal AI is finally here! The Companion plugin gives you access to an AI companion that learns about you from your notes. You choose which Obsidian notes Companion can observe, and it picks up on your thoughts, values, and goals.

## Features

- **Companion Observe**: Generates observations from your current note's content, giving your Companion new perspectives and insights.
- **Companion Chat**: Ask Companion for life advice, when you need help with a decision, or any time you need an insightful friend.

## Getting Started

### Installation

To install the Companion plugin, follow the standard procedure for adding plugins to Obsidian:

1. Open Obsidian and go to `Settings` > `Community Plugins`.
2. Click on `Browse` and search for "Companion AI".
3. Click `Install` and then `Enable` the plugin.

### Configuration

Upon installation, configure the plugin to ensure it functions correctly:

1. Navigate to `Settings` > `Plugin Options` > `Companion AI`.
2. Enter your **OpenAI API Key**. This is crucial for the plugin to interact with OpenAI's services.
3. Enter your **First Name** to personalize the interactions and observations generated by the plugin. This is optional, but we recommend it because it's more fun when Companion knows your name. Otherwise, it will call you "User", which we think is kind of sad.

## Usage

### Generating Observations

- Open the note you want to show to your Companion. Click on the ribbon icon labeled "Companion observe" to generate observations for the note.
- The observations will be saved in a dedicated `observations.md` file. You can view and edit them whenever you want.

### Interactive Chat

- Click on the ribbon icon labeled "Chat with Companion". If your right side bar is not open, click the "toggle right side bar" button at the top right. Click on the icon in the top right that says "Chat with Companion". You're good to go!
- In the chat interface, you can type messages or questions related to your notes, and the Companion will respond with insights or clarifications.
- To end the chat, right-click on the icon in the top right that says "Chat with Companion" and select "Close".

### Managing Observations and Embeddings

- The plugin automatically manages observation embeddings. You can view and edit the `observation_embeddings.json` file if needed, although it is primarily used by the plugin internally.

## The Nitty-Gritty

- **Debounce Mechanism**: The plugin intelligently updates embeddings after a 10-second period of inactivity, so that your observations are always up-to-date without unnecessary processing.
- **Cosine Similarity**: The plugin uses cosine similarity to find the most relevant observations related to your queries.

## Troubleshooting and Support

If you encounter any issues or have questions about Companion, I would love to know and help. [Send me an email](mailto:yaroslav@theslavant.com).

## Contributing

We welcome contributions to Companion! We will be happy if you report bugs, suggest features, and contribute to the code. We will post details on what we need help with soon.

## License

The Companion plugin is released under Apache 2.0, ensuring it's free to use and distribute.