export class MockTtsProvider {
  async speak(text: string) {
    await new Promise((resolve) => setTimeout(resolve, 1200));

    return {
      spokenText: text,
      audioUrl: `mock://tts/${Date.now()}`,
    };
  }
}
